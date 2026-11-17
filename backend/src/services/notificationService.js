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
 * Send SMS directly to a mobile number
 */
export async function sendSMS(toPhone, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log(`[SMS - Simulation] 📱 To: ${toPhone}\nMessage: ${message}`);
    return true;
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams();
    params.append('To', toPhone.startsWith('+') ? toPhone : `+91${toPhone}`);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      params,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log(`[SMS] ✅ Message sent to ${toPhone}`);
    return true;
  } catch (error) {
    console.error(`[SMS] ❌ Failed to send SMS to ${toPhone}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Send WhatsApp message directly to a mobile number
 */
export async function sendWhatsApp(toPhone, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log(`[WhatsApp - Simulation] 💬 To: ${toPhone}\nMessage:\n${message}`);
    return true;
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const formattedTo = toPhone.startsWith('+') ? toPhone : `+91${toPhone}`;
    const params = new URLSearchParams();
    params.append('To', `whatsapp:${formattedTo}`);
    params.append('From', TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') ? TWILIO_WHATSAPP_NUMBER : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
    params.append('Body', message);

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      params,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log(`[WhatsApp] ✅ Message sent to ${toPhone}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] ❌ Failed to send WhatsApp to ${toPhone}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Universal Mobile Alert Dispatcher
 * Sends to Mobile Number via WhatsApp, SMS, or Both!
 */
export async function sendMobileAlert(alert, bookingData) {
  if (!alert.phoneNumber) return false;

  const bookingUrl = bookingData.url || alert.bmsUrl || `https://in.bookmyshow.com/buytickets/${alert.eventCode}`;
  
  const isNewShow = bookingData.isNewShowAlert;
  const headline = isNewShow ? '[DROPCLOCK] NEW SHOWTIME ADDED' : '[DROPCLOCK] BOOKINGS ARE LIVE';
  const showList = bookingData.showtimes?.length > 0 
    ? (isNewShow ? `New Shows: ${bookingData.showtimes.join(', ')}\n` : `Shows: ${bookingData.showtimes.slice(0, 4).join(', ')}\n`)
    : '';

  const textMessage = 
`${headline}

Movie: ${alert.movieName}
Theatre: ${alert.theatreName}
City: ${alert.city.toUpperCase()}${alert.targetDate ? `\nDate: ${alert.targetDate}` : ''}
${showList}
Direct Booking Link:
${bookingUrl}`;

  let success = false;
  const method = alert.notificationMethod || 'whatsapp';

  if (method === 'whatsapp' || method === 'all') {
    const res = await sendWhatsApp(alert.phoneNumber, textMessage);
    if (res) success = true;
  }

  if (method === 'sms' || method === 'all') {
    const res = await sendSMS(alert.phoneNumber, textMessage);
    if (res) success = true;
  }

  return success;
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

