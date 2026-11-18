/**
 * Notification Service
 * 
 * Sends instant alerts when bookings go live.
 * Channels:
 *   1. Telegram Bot (primary - most reliable, instant, free)
 *   2. Web Push (secondary - for web app users)
 * 
 * The notification includes:
 *   - Movie name
 *   - Theatre name  
 *   - Direct BMS booking link (one tap → seat selection)
 */

import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

let bot = null;

// Twilio Config for SMS & WhatsApp
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; // e.g. +1234567890
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox default

/**
 * Fetch available Content Templates on the Twilio account (for Trial / WhatsApp compliance)
 */
export async function fetchTwilioContentTemplates() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return [];

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await axios.get('https://content.twilio.com/v1/Content?PageSize=20', {
      headers: { Authorization: `Basic ${auth}` },
    });
    return res.data?.contents || [];
  } catch (error) {
    console.warn('[Twilio Content API] Could not fetch templates:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Helper to build ContentVariables matching a Twilio Content Template's defined variable keys
 */
function buildTemplateVariables(template, context = {}) {
  const vars = {};
  const keys = Object.keys(template?.variables || {});
  const values = [
    context.date || '17 DEC 2026',
    context.theatre || 'AAA Cinemas (AAAC)',
    context.movie || 'Movie Ticket Alert',
    context.link || 'https://in.bookmyshow.com',
  ];
  keys.forEach((k, idx) => {
    vars[k] = values[idx] || context.theatre || 'Dropclock';
  });
  return JSON.stringify(vars);
}

/**
 * Send SMS directly to a mobile number
 */
export async function sendSMS(toPhone, message, context = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS - Simulation] To: ${toPhone}\nMessage: ${message}`);
    return { success: true, simulated: true };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const cleanTo = toPhone.trim().replace(/\D/g, '');
  const formattedTo = toPhone.startsWith('+') ? toPhone : (cleanTo.length === 10 ? `+91${cleanTo}` : `+${cleanTo}`);

  try {
    const params = new URLSearchParams();
    params.append('To', formattedTo);
    params.append('From', fromNumber);
    params.append('Body', message);

    const res = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      params,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log(`[SMS] Message sent to ${toPhone}, sid:`, res.data?.sid);
    return { success: true, sid: res.data?.sid };
  } catch (error) {
    const errData = error.response?.data || error.message;
    // Trial account fallback: use Twilio ContentSid template if custom SMS body is restricted
    if (errData?.code === 572006 || errData?.code === 21654) {
      const templates = await fetchTwilioContentTemplates();
      const tpl = templates.find(t => /event|remind|appoint|alert|notif/i.test(t.friendly_name || '')) || templates[0];
      if (tpl?.sid) {
        try {
          const retryParams = new URLSearchParams();
          retryParams.append('To', formattedTo);
          retryParams.append('From', fromNumber);
          retryParams.append('ContentSid', tpl.sid);
          if (Object.keys(tpl.variables || {}).length > 0) {
            retryParams.append('ContentVariables', buildTemplateVariables(tpl, context));
          }
          const retryRes = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            retryParams,
            {
              headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
          console.log(`[SMS] Sent via trial template ${tpl.friendly_name} (${tpl.sid}), sid:`, retryRes.data?.sid);
          return { success: true, sid: retryRes.data?.sid, templateUsed: tpl.friendly_name };
        } catch (retryErr) {
          return { success: false, error: retryErr.response?.data || retryErr.message, originalError: errData };
        }
      }
    }
    console.error(`[SMS] Failed to send SMS to ${toPhone}:`, errData);
    return { success: false, error: errData };
  }
}

/**
 * Send WhatsApp message directly to a mobile number
 */
export async function sendWhatsApp(toPhone, message, context = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+17372508034';
  const configuredContentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

  if (!accountSid || !authToken) {
    console.log(`[WhatsApp - Simulation] To: ${toPhone}\nMessage:\n${message}`);
    return { success: true, simulated: true };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const cleanTo = toPhone.trim().replace(/\D/g, '');
  const formattedTo = toPhone.startsWith('+') ? toPhone : (cleanTo.length === 10 ? `+91${cleanTo}` : `+${cleanTo}`);
  const from = whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${whatsappNumber}`;

  try {
    const params = new URLSearchParams();
    params.append('To', `whatsapp:${formattedTo}`);
    params.append('From', from);
    if (configuredContentSid) {
      params.append('ContentSid', configuredContentSid);
      params.append('ContentVariables', JSON.stringify({ '1': context.date || '17 DEC 2026', '2': context.theatre || 'AAA Cinemas' }));
    } else {
      params.append('Body', message);
    }

    const res = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      params,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log(`[WhatsApp] Message sent to ${toPhone}, sid:`, res.data?.sid);
    return { success: true, sid: res.data?.sid };
  } catch (error) {
    const errData = error.response?.data || error.message;
    // Trial account fallback: automatically discover & use Twilio ContentSid template
    if (errData?.code === 21654) {
      const templates = await fetchTwilioContentTemplates();
      const tpl = templates.find(t => /event|remind|appoint|alert|notif/i.test(t.friendly_name || '')) || templates[0];
      if (tpl?.sid) {
        try {
          const retryParams = new URLSearchParams();
          retryParams.append('To', `whatsapp:${formattedTo}`);
          retryParams.append('From', from);
          retryParams.append('ContentSid', tpl.sid);
          if (Object.keys(tpl.variables || {}).length > 0) {
            retryParams.append('ContentVariables', buildTemplateVariables(tpl, context));
          }
          const retryRes = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            retryParams,
            {
              headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
          console.log(`[WhatsApp] Sent via trial template ${tpl.friendly_name} (${tpl.sid}), sid:`, retryRes.data?.sid);
          return { success: true, sid: retryRes.data?.sid, templateUsed: tpl.friendly_name };
        } catch (retryErr) {
          return { success: false, error: retryErr.response?.data || retryErr.message, originalError: errData, availableTemplates: templates.map(t => ({ sid: t.sid, name: t.friendly_name, vars: t.variables })) };
        }
      }
      return { success: false, error: errData, availableTemplatesCount: templates.length };
    }
    console.error(`[WhatsApp] Failed to send WhatsApp to ${toPhone}:`, errData);
    return { success: false, error: errData };
  }
}

/**
 * Universal Mobile Alert Dispatcher
 * Sends to Mobile Number via WhatsApp, SMS, or Both!
 */
export async function sendMobileAlert(alert, bookingData) {
  if (!alert.phoneNumber) return false;

  const bookingUrl = bookingData.url || alert.bmsUrl || `https://in.bookmyshow.com/cinemas`;
  
  const isNewShow = bookingData.isNewShowAlert;
  const headline = isNewShow ? '[DROPCLOCK] ALERT: NEW SHOWS OPENED' : '[DROPCLOCK] ALERT: BOOKINGS ARE LIVE';
  const showList = bookingData.showtimes?.length > 0 
    ? (isNewShow ? `New Shows: ${bookingData.showtimes.join(', ')}\n` : `Showtimes: ${bookingData.showtimes.slice(0, 5).join(', ')}\n`)
    : '';

  const textMessage = 
`${headline}

New showtimes have just dropped on BookMyShow!

Movie: ${alert.movieName || 'All Shows'}
Theatre: ${alert.theatreName}
City: ${alert.city.toUpperCase()}${alert.targetDate ? `\nDate: ${alert.targetDate}` : ''}
${showList}
Book your seats before they sell out:
${bookingUrl}`;

  let success = false;
  const method = alert.notificationMethod || 'whatsapp';
  const context = {
    movie: alert.movieName || 'All Shows',
    theatre: alert.theatreName,
    date: alert.targetDate || 'Selected Date',
    link: bookingUrl,
  };

  if (method === 'whatsapp' || method === 'all') {
    const res = await sendWhatsApp(alert.phoneNumber, textMessage, context);
    if (res?.success) success = true;
  }

  if (method === 'sms' || method === 'all') {
    const res = await sendSMS(alert.phoneNumber, textMessage, context);
    if (res?.success) success = true;
  }

  return success;
}

/**
 * Send Immediate Alarm Armed Confirmation to Mobile
 */
export async function sendAlarmArmedNotification(alert) {
  if (!alert.phoneNumber) return { success: false, error: 'No phone number provided' };

  const textMessage = 
`[DROPCLOCK] RADAR ACTIVE

Your 24/7 ticket alarm has been armed.

Movie: ${alert.movieName || 'All Shows (Auto-Detect)'}
Theatre: ${alert.theatreName}
City: ${alert.city.toUpperCase()}
Target Date: ${alert.targetDate || 'Selected Date'}
Status: Scanning BookMyShow every 30 seconds

Dropclock is monitoring this venue continuously. The second new showtimes or midnight screens open, you will receive an immediate mobile dispatch with the direct booking deep-link.

Manage Radars:
https://wholedropreminder.vercel.app/dashboard`;

  const results = {};
  const method = alert.notificationMethod || 'whatsapp';
  const context = {
    movie: alert.movieName || 'All Shows',
    theatre: alert.theatreName,
    date: alert.targetDate || 'Selected Date',
    link: 'https://wholedropreminder.vercel.app/dashboard',
  };

  if (method === 'whatsapp' || method === 'all') {
    results.whatsapp = await sendWhatsApp(alert.phoneNumber, textMessage, context);
  }

  if (method === 'sms' || method === 'all') {
    results.sms = await sendSMS(alert.phoneNumber, textMessage, context);
  }

  const anySuccess = (results.whatsapp?.success || results.sms?.success);
  return { success: !!anySuccess, results };
}

/**
 * Initialize Telegram bot
 */
export function initTelegramBot(token) {
  if (!token) {
    console.warn('[Notification] No Telegram bot token provided. Telegram alerts disabled.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  
  console.log('[Notification] Telegram bot initialized ✓');
  return bot;
}

/**
 * Get the Telegram bot instance
 */
export function getBot() {
  return bot;
}

/**
 * Send booking alert via Telegram
 * 
 * @param {string} chatId - Telegram chat ID
 * @param {Object} alert - Alert document
 * @param {Object} bookingData - Data from BMS check
 */
export async function sendTelegramAlert(chatId, alert, bookingData) {
  if (!bot) {
    console.error('[Notification] Telegram bot not initialized');
    return false;
  }

  const bookingUrl = bookingData.url || `https://in.bookmyshow.com/buytickets/${alert.eventCode}`;

  const message = `
🚨🎬 *BOOKINGS ARE LIVE!* 🎬🚨

🎥 *${escapeMarkdown(alert.movieName)}*
🏢 *${escapeMarkdown(alert.theatreName)}*
📍 ${escapeMarkdown(alert.city.charAt(0).toUpperCase() + alert.city.slice(1))}

${bookingData.showtimes?.length > 0 ? `🕐 Showtimes found: ${bookingData.showtimes.slice(0, 5).join(', ')}` : ''}

⚡ *Book NOW before seats fill up!*

🔗 [Open BookMyShow](${bookingUrl})
  `.trim();

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎫 BOOK NOW →',
              url: bookingUrl,
            },
          ],
        ],
      },
    });

    console.log(`[Notification] ✅ Alert sent to Telegram chat ${chatId} for ${alert.movieName}`);
    return true;
  } catch (error) {
    console.error(`[Notification] ❌ Failed to send Telegram alert:`, error.message);
    return false;
  }
}

/**
 * Send a general message via Telegram
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
  if (!bot) return false;

  try {
    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...options,
    });
    return true;
  } catch (error) {
    console.error(`[Notification] Send message error:`, error.message);
    return false;
  }
}

/**
 * Send a status update (not a booking alert, just info)
 */
export async function sendStatusUpdate(chatId, alert) {
  const message = `
👁️ *Alert Status Update*

🎥 ${escapeMarkdown(alert.movieName)}
🏢 ${escapeMarkdown(alert.theatreName)}
📊 Phase: ${alert.pollPhase.toUpperCase()}
🔍 Checks so far: ${alert.checkCount}
⏰ Last checked: ${alert.lastCheckedAt ? new Date(alert.lastCheckedAt).toLocaleString('en-IN') : 'Not yet'}

_Still watching... I\\'ll buzz you the second bookings open!_ 🔔
  `.trim();

  return sendTelegramMessage(chatId, message);
}

/**
 * Escape special characters for Telegram Markdown
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

export default {
  initTelegramBot,
  getBot,
  sendTelegramAlert,
  sendTelegramMessage,
  sendStatusUpdate,
};

