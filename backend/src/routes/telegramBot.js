/**
 * Telegram Bot Commands
 * 
 * This handles all user interaction through Telegram:
 * 
 * /start              → Welcome message
 * /watch <movie> <theatre> <city>  → Set up a new alert
 * /alerts             → List your active alerts  
 * /cancel <id>        → Cancel an alert
 * /status             → Check status of all your alerts
 * /help               → Show all commands
 */

import Alert from '../models/Alert.js';
import { getBot, sendTelegramMessage } from '../services/notificationService.js';
import { addToPolling, removeFromPolling } from '../services/pollingService.js';
import { searchMovies } from '../services/bmsService.js';

/**
 * Register all bot commands
 */
export function registerBotCommands() {
  const bot = getBot();
  if (!bot) return;

  // /start - Welcome
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🎬 *Movie Ticket Alarm Clock* 🔔

Never miss a blockbuster booking again\\!

I watch BookMyShow 24/7 so you don't have to\\. The second bookings open for your movie at your theatre, I'll buzz you with a direct booking link\\.

*How to use:*
1\\. Send me: \`/watch\`
2\\. I'll walk you through picking your movie \\& theatre
3\\. Sit back \\& wait for the alert\\!

Type /help to see all commands\\.
    `.trim();

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'MarkdownV2' });
  });

  // /help - Show commands
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🎬 *Available Commands:*

/watch \\- Set up a new booking alert
/alerts \\- View your active alerts
/status \\- Check status of your alerts  
/cancel \\- Cancel an alert
/help \\- Show this message

*Quick Setup:*
Just send me the movie name and I'll guide you through it\\!
    `.trim();

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'MarkdownV2' });
  });

  // /watch - Start alert setup (interactive flow)
  bot.onText(/\/watch(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const movieQuery = match[1];

    if (!movieQuery) {
      await bot.sendMessage(chatId, 
        '🎬 What movie do you want to watch for?\n\nSend: `/watch Avengers Doomsday`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Ask for details step by step
    await bot.sendMessage(chatId, 
      `🔍 Looking for "*${movieQuery}*"...\n\nNow tell me:\n` +
      `1️⃣ Which *city*? (e.g., hyderabad, mumbai, delhi)\n` +
      `2️⃣ Which *theatre*? (e.g., PVR Nexus, INOX GVK One)\n\n` +
      `Send it like this:\n\`/setalert ${movieQuery} | hyderabad | PVR Nexus\``,
      { parse_mode: 'Markdown' }
    );
  });

  // /setalert - Create the alert with full details
  // Format: /setalert Movie Name | city | Theatre Name | EVENT_CODE (optional)
  bot.onText(/\/setalert\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const parts = match[1].split('|').map(s => s.trim());

    if (parts.length < 3) {
      await bot.sendMessage(chatId,
        '❌ Please provide all details:\n`/setalert Movie Name | city | Theatre Name`\n\n' +
        'Example:\n`/setalert Avengers Doomsday | hyderabad | PVR Nexus`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [movieName, city, theatreName, eventCode] = parts;

    try {
      // Create the alert
      const alert = new Alert({
        movieName,
        eventCode: eventCode || 'UNKNOWN', // User can provide or we'll search
        theatreName,
        city: city.toLowerCase(),
        telegramChatId: chatId.toString(),
        status: 'watching',
        pollPhase: 'cold',
      });

      // If no event code provided, try to search for it
      if (!eventCode || eventCode === 'UNKNOWN') {
        await bot.sendMessage(chatId,
          `⚠️ *Tip:* For best results, provide the BMS event code\\.\n` +
          `Find it in the movie's BMS URL: \`in\\.bookmyshow\\.com/movies/city/slug/ET00XXXXXX\`\n\n` +
          `Update with: \`/setcode ${alert._id} ET00XXXXXX\``,
          { parse_mode: 'MarkdownV2' }
        );
      }

      await alert.save();
      
      // Start polling for this alert
      addToPolling(alert);

      await bot.sendMessage(chatId,
        `✅ *Alert Created\\!* 🔔\n\n` +
        `🎥 *Movie:* ${escapeMarkdownV2(movieName)}\n` +
        `🏢 *Theatre:* ${escapeMarkdownV2(theatreName)}\n` +
        `📍 *City:* ${escapeMarkdownV2(city)}\n` +
        `📊 *Phase:* COLD \\(checking every 30 min\\)\n` +
        `🆔 *Alert ID:* \`${alert._id}\`\n\n` +
        `I'm now watching BookMyShow 24/7 for you\\! 👁️\n` +
        `I'll message you *instantly* when bookings open\\.`,
        { parse_mode: 'MarkdownV2' }
      );

    } catch (error) {
      console.error('[Bot] Error creating alert:', error);
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.');
    }
  });

  // /setcode - Set/update event code for an alert
  bot.onText(/\/setcode\s+(\S+)\s+(ET\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const alertId = match[1];
    const eventCode = match[2];

    try {
      const alert = await Alert.findOne({ 
        _id: alertId, 
        telegramChatId: chatId.toString() 
      });

      if (!alert) {
        await bot.sendMessage(chatId, '❌ Alert not found.');
        return;
      }

      alert.eventCode = eventCode;
      await alert.save();

      await bot.sendMessage(chatId,
        `✅ Event code updated to \`${eventCode}\` for *${escapeMarkdownV2(alert.movieName)}*`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      await bot.sendMessage(chatId, '❌ Invalid alert ID.');
    }
  });

  // /alerts - List active alerts
  bot.onText(/\/alerts/, async (msg) => {
    const chatId = msg.chat.id;

    const alerts = await Alert.find({ 
      telegramChatId: chatId.toString(),
      status: { $in: ['watching', 'triggered'] },
    }).sort({ createdAt: -1 });

    if (alerts.length === 0) {
      await bot.sendMessage(chatId, 
        '📭 No active alerts. Set one up with /watch');
      return;
    }

    let message = '🔔 *Your Active Alerts:*\n\n';
    
    for (const alert of alerts) {
      const statusEmoji = alert.status === 'triggered' ? '✅' : '👁️';
      const phase = alert.pollPhase.toUpperCase();
      
      message += `${statusEmoji} *${escapeMarkdownV2(alert.movieName)}*\n`;
      message += `   🏢 ${escapeMarkdownV2(alert.theatreName)}\n`;
      message += `   📍 ${escapeMarkdownV2(alert.city)} \\| Phase: ${phase}\n`;
      message += `   🔍 Checks: ${alert.checkCount}\n`;
      message += `   🆔 \`${alert._id}\`\n\n`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
  });

  // /status - Detailed status check
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;

    const watching = await Alert.countDocuments({ 
      telegramChatId: chatId.toString(), status: 'watching' 
    });
    const triggered = await Alert.countDocuments({ 
      telegramChatId: chatId.toString(), status: 'triggered' 
    });

    const message = `
📊 *Your Alert Dashboard*

👁️ Watching: ${watching}
✅ Triggered: ${triggered}

_All alerts are running\\. I'll notify you instantly when bookings open\\!_
    `.trim();

    await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
  });

  // /cancel - Cancel an alert
  bot.onText(/\/cancel\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const alertId = match[1];

    try {
      const alert = await Alert.findOne({ 
        _id: alertId, 
        telegramChatId: chatId.toString() 
      });

      if (!alert) {
        await bot.sendMessage(chatId, '❌ Alert not found.');
        return;
      }

      alert.status = 'expired';
      await alert.save();
      removeFromPolling(alertId);

      await bot.sendMessage(chatId,
        `🗑️ Alert cancelled for *${escapeMarkdownV2(alert.movieName)}* at ${escapeMarkdownV2(alert.theatreName)}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      await bot.sendMessage(chatId, '❌ Invalid alert ID. Use /alerts to see your alert IDs.');
    }
  });

  // /escalate - Manually escalate to hot phase
  bot.onText(/\/escalate\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const alertId = match[1];

    try {
      const alert = await Alert.findOne({ 
        _id: alertId, 
        telegramChatId: chatId.toString(),
        status: 'watching',
      });

      if (!alert) {
        await bot.sendMessage(chatId, '❌ Alert not found or not active.');
        return;
      }

      alert.pollPhase = 'hot';
      await alert.save();

      await bot.sendMessage(chatId,
        `🔥 *Escalated to HOT phase\\!*\n\nNow checking every 30 seconds for *${escapeMarkdownV2(alert.movieName)}*`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      await bot.sendMessage(chatId, '❌ Error escalating. Check the alert ID.');
    }
  });

  console.log('[Bot] All commands registered ✓');
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdownV2(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

export default { registerBotCommands };

