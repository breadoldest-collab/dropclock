/**
 * 🎬 Movie Ticket Alarm Clock - Server
 * 
 * "Never miss a blockbuster booking again."
 * 
 * This server:
 * 1. Runs the Express API (for web frontend)
 * 2. Runs the Telegram bot (for user commands)
 * 3. Runs the polling engine (24/7 BMS watcher)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { initTelegramBot } from './services/notificationService.js';
import { startPolling } from './services/pollingService.js';
import { registerBotCommands } from './routes/telegramBot.js';
import alertRoutes from './routes/alerts.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────
app.use('/api/alerts', alertRoutes);

// Root status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Dropclock API',
    description: '24/7 BookMyShow Ticket Drop Alarm & Poller',
    health: '/api/health',
    endpoints: {
      alerts: '/api/alerts',
      stats: '/api/alerts/stats/overview',
    },
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Movie Ticket Alarm Clock 🎬',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Startup ────────────────────────────────────────────
async function start() {
  console.log('');
  console.log('🎬 ════════════════════════════════════════');
  console.log('   Movie Ticket Alarm Clock');
  console.log('   "Never miss a blockbuster booking"');
  console.log('════════════════════════════════════════════');
  console.log('');

  // 1. Connect to database
  await connectDB();

  // 2. Initialize Telegram bot
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    initTelegramBot(telegramToken);
    registerBotCommands();
    console.log('[Server] Telegram bot is live ✓');
  } else {
    console.warn('[Server] ⚠️  No TELEGRAM_BOT_TOKEN set. Bot disabled.');
    console.warn('[Server]    Create a bot via @BotFather on Telegram');
    console.warn('[Server]    Then set TELEGRAM_BOT_TOKEN in .env');
  }

  // 3. Start polling engine
  await startPolling();
  console.log('[Server] Polling engine started ✓');

  // 4. Start Express API
  app.listen(PORT, () => {
    console.log(`[Server] API running on http://localhost:${PORT} ✓`);
    console.log('');
    console.log('🎯 All systems go! Watching for bookings...');
    console.log('');
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

