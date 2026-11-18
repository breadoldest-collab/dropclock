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
    return { success: true, sid: res.data?.sid, body: res.data?.body };
  } catch (error) {
    const errData = error.response?.data || error.message;
    // Trial account fallback: use Twilio Trial Event Notification ContentSid
    if (errData?.code === 21654) {
      const fallbackSid = configuredContentSid || 'HX8dc9eea84231541b091557c47cc2a342';
      try {
        const retryParams = new URLSearchParams();
        retryParams.append('To', `whatsapp:${formattedTo}`);
        retryParams.append('From', from);
        retryParams.append('ContentSid', fallbackSid);
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
        console.log(`[WhatsApp] Sent via Twilio Trial template (${fallbackSid}), sid:`, retryRes.data?.sid);
        return { success: true, sid: retryRes.data?.sid, templateSid: fallbackSid, body: retryRes.data?.body };
      } catch (retryErr) {
        return { success: false, error: retryErr.response?.data || retryErr.message, originalError: errData };
      }
    }
    console.error(`[WhatsApp] Failed to send WhatsApp to ${toPhone}:`, errData);
    return { success: false, error: errData };
  }
}

/**
 * Build Neo-Brutalist Acid HTML Email (Zero Emojis)
 */
function buildEmailHtml({ badge, title, subtitle, rows, ctaLabel, ctaUrl, footerNote }) {
  const rowsHtml = rows
    .filter(r => r.value)
    .map(
      r => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #27272A;color:#D2E823;font-family:monospace;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${r.label}</td>
          <td style="padding:10px 0;border-bottom:1px solid #27272A;color:#FDFBF7;font-family:monospace;font-size:13px;font-weight:700;text-align:right;">${r.value}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background-color:#FDFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#09090B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#FDFBF7;border:3px solid #09090B;border-radius:16px;box-shadow:6px 6px 0px #09090B;">
    <tr>
      <td style="padding:28px 28px 20px 28px;">
        <div style="display:inline-block;background-color:#D2E823;border:2px solid #09090B;border-radius:999px;padding:4px 12px;font-family:monospace;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#09090B;">
          ${badge}
        </div>
        <h1 style="margin:16px 0 8px 0;font-size:26px;font-weight:900;letter-spacing:-0.03em;text-transform:uppercase;color:#09090B;">
          ${title}
        </h1>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#27272A;">
          ${subtitle}
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090B;border:2px solid #09090B;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
          ${rowsHtml}
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${ctaUrl}" target="_blank" style="display:inline-block;background-color:#D2E823;color:#09090B;border:2px solid #09090B;border-radius:10px;padding:14px 28px;font-size:14px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0 0;font-family:monospace;font-size:11px;line-height:1.5;color:#52525B;text-align:center;">
          ${footerNote}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send Transactional Email via Brevo (formerly Sendinblue) API
 * Free tier: 300 emails/day to ANY email address worldwide.
 */
export async function sendBrevoEmail(toEmail, subject, htmlContent, textContent) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Dropclock Radar';

  if (!apiKey || !senderEmail) {
    console.log(`[Brevo Email - Simulation] To: ${toEmail}\nSubject: ${subject}\n${textContent}`);
    return { success: true, simulated: true };
  }

  try {
    const res = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail.trim() }],
        subject,
        htmlContent,
        textContent,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10000,
      }
    );
    console.log(`[Brevo Email] Sent to ${toEmail}, messageId:`, res.data?.messageId);
    return { success: true, messageId: res.data?.messageId };
  } catch (error) {
    const errData = error.response?.data || error.message;
    console.error(`[Brevo Email] Failed to send to ${toEmail}:`, errData);
    return { success: false, error: errData };
  }
}

/**
 * Universal Alert Dispatcher
 * Sends via Brevo Email, WhatsApp, SMS, or All
 */
export async function sendMobileAlert(alert, bookingData) {
  if (!alert.phoneNumber && !alert.email) return false;

  const bookingUrl = bookingData.url || alert.bmsUrl || `https://in.bookmyshow.com/cinemas`;
  const isNewShow = bookingData.isNewShowAlert;
  const headline = isNewShow ? '[DROPCLOCK] ALERT: NEW SHOWS OPENED' : '[DROPCLOCK] ALERT: BOOKINGS ARE LIVE';
  const showtimesStr = bookingData.showtimes?.length > 0
    ? (isNewShow ? bookingData.showtimes.join(', ') : bookingData.showtimes.slice(0, 5).join(', '))
    : '';
  const showList = showtimesStr
    ? (isNewShow ? `New Shows: ${showtimesStr}\n` : `Showtimes: ${showtimesStr}\n`)
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
  const method = alert.notificationMethod || (alert.email ? 'email' : 'whatsapp');
  const context = {
    movie: alert.movieName || 'All Shows',
    theatre: alert.theatreName,
    date: alert.targetDate || 'Selected Date',
    link: bookingUrl,
  };

  if (alert.email && (method === 'email' || method === 'all')) {
    const html = buildEmailHtml({
      badge: isNewShow ? 'NEW SHOWS DROPPED' : 'BOOKINGS LIVE NOW',
      title: `${alert.movieName || 'NEW SHOWS'} - BOOK NOW`,
      subtitle: 'BookMyShow just opened new showtimes at your watched theatre. Tap below to lock your seats immediately.',
      rows: [
        { label: 'Movie', value: alert.movieName || 'All Shows' },
        { label: 'Theatre', value: alert.theatreName },
        { label: 'City', value: alert.city.toUpperCase() },
        { label: 'Date', value: alert.targetDate || 'Selected Date' },
        { label: 'Showtimes', value: showtimesStr || 'Live Now' },
      ],
      ctaLabel: 'Book on BookMyShow',
      ctaUrl: bookingUrl,
      footerNote: 'Dispatched instantly by Dropclock 24/7 Showtime Radar.',
    });
    const subject = `${headline} - ${alert.movieName || 'Showtimes'} at ${alert.theatreName}`;
    const res = await sendBrevoEmail(alert.email, subject, html, textMessage);
    if (res?.success) success = true;
  }

  if (alert.phoneNumber && (method === 'whatsapp' || method === 'all')) {
    const res = await sendWhatsApp(alert.phoneNumber, textMessage, context);
    if (res?.success) success = true;
  }

  if (alert.phoneNumber && (method === 'sms' || method === 'all')) {
    const res = await sendSMS(alert.phoneNumber, textMessage, context);
    if (res?.success) success = true;
  }

  return success;
}

/**
 * Send Immediate Alarm Armed Confirmation via Brevo Email / WhatsApp / SMS
 */
export async function sendAlarmArmedNotification(alert) {
  if (!alert.phoneNumber && !alert.email) {
    return { success: false, error: 'No email or phone number provided' };
  }

  const textMessage = 
`[DROPCLOCK] RADAR ACTIVE

Your 24/7 ticket alarm has been armed.

Movie: ${alert.movieName || 'All Shows (Auto-Detect)'}
Theatre: ${alert.theatreName}
City: ${alert.city.toUpperCase()}
Target Date: ${alert.targetDate || 'Selected Date'}
Status: Scanning showtimes every 30 minutes

Dropclock is monitoring this venue continuously. The second new showtimes or midnight screens open, you will receive an immediate alert with the direct booking deep-link.

Manage Radars:
https://wholedropreminder.vercel.app/dashboard`;

  const results = {};
  const method = alert.notificationMethod || (alert.email ? 'email' : 'whatsapp');
  const context = {
    movie: alert.movieName || 'All Shows',
    theatre: alert.theatreName,
    date: alert.targetDate || 'Selected Date',
    link: 'https://wholedropreminder.vercel.app/dashboard',
  };

  if (alert.email && (method === 'email' || method === 'all')) {
    const html = buildEmailHtml({
      badge: 'RADAR ACTIVE - 24/7 WATCHING',
      title: 'ALARM ARMED',
      subtitle: 'Dropclock is now scanning showtimes every 30 minutes. The moment new showtimes or midnight screens open, we will send you a direct booking link.',
      rows: [
        { label: 'Movie', value: alert.movieName || 'All Shows (Auto-Detect)' },
        { label: 'Theatre', value: alert.theatreName },
        { label: 'City', value: alert.city.toUpperCase() },
        { label: 'Target Date', value: alert.targetDate || 'Selected Date' },
        { label: 'Scan Interval', value: 'Every 30 Minutes' },
      ],
      ctaLabel: 'View Active Radars',
      ctaUrl: 'https://wholedropreminder.vercel.app/dashboard',
      footerNote: 'Dropclock - 24/7 BookMyShow Ticket Drop Alarm.',
    });
    const subject = `[DROPCLOCK] RADAR ACTIVE - ${alert.theatreName} (${alert.targetDate || 'Upcoming'})`;
    results.email = await sendBrevoEmail(alert.email, subject, html, textMessage);
  }

  if (alert.phoneNumber && (method === 'whatsapp' || method === 'all')) {
    results.whatsapp = await sendWhatsApp(alert.phoneNumber, textMessage, context);
  }

  if (alert.phoneNumber && (method === 'sms' || method === 'all')) {
    results.sms = await sendSMS(alert.phoneNumber, textMessage, context);
  }

  const anySuccess = (results.email?.success || results.whatsapp?.success || results.sms?.success);
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

