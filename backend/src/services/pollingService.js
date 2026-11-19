/**
 * Polling Engine - The 24/7 Watcher
 * 
 * STRATEGY (3-Phase Smart Polling):
 * 
 * COLD  → Poll every 30 minutes
 *         (Movie announced, no booking date known)
 * 
 * WARM  → Poll every 3 minutes  
 *         (Other cities/theatres have opened, yours likely soon)
 * 
 * HOT   → Poll every 30 seconds
 *         (Bookings detected nearby, yours is imminent)
 * 
 * PHASE ESCALATION:
 * - If ANY alert for the same eventCode triggers → all other alerts for 
 *   that movie escalate to HOT (bookings are rolling out city by city)
 * - Manual escalation via Telegram command
 * 
 * This keeps BMS requests reasonable:
 * - 100 cold alerts = ~200 requests/hour (fine)
 * - 10 hot alerts = ~1200 requests/hour (still manageable)
 */

import Alert from '../models/Alert.js';
import { checkBookingStatus, getCinemaShows } from './bmsService.js';
import { sendTelegramAlert, sendMobileAlert } from './notificationService.js';
import { resolveTheatre } from './theatreResolver.js';

// Clean fixed 30-minute scan interval (1 check every 30 minutes; 10m if manually escalated to HOT)
const POLL_INTERVALS = {
  cold: 30 * 60 * 1000,   // 30 minutes
  warm: 30 * 60 * 1000,   // 30 minutes
  hot: 10 * 60 * 1000,    // 10 minutes (manual boost)
};

export function computeSmartPhase() {
  return 'warm'; // Standard 30-minute scan cycle
}

// Track active polling timers
const activeTimers = new Map();

function needsUrlRepair(url) {
  if (!url) return true;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true;
  // Catch old guessed venue codes (AAAC/AMBC/PVND/SUDX), generic explore fallback, or malformed 6-digit dates
  return /\/(AAAC|AMBC|PVND|SUDX)\/|\/explore\/cinemas-|\/\d{6}$/i.test(url);
}

/**
 * Start polling for all active alerts
 */
export async function startPolling() {
  console.log('[Poller] Starting polling engine (1 check every 30 minutes)...');

  // Auto-repair any existing alerts (watching or triggered) that have outdated/broken BMS links
  const allAlerts = await Alert.find({ status: { $ne: 'expired' } });
  for (const alert of allAlerts) {
    if (needsUrlRepair(alert.bmsUrl)) {
      const healed = await resolveTheatre(alert.theatreName || alert.bmsUrl, alert.city);
      if (healed?.bmsUrl) {
        console.log(`[Poller] Repaired BMS link for "${alert.theatreName}" -> ${healed.theatreName} (${healed.bmsUrl})`);
        alert.theatreName = healed.theatreName;
        alert.bmsUrl = healed.bmsUrl;
        if (alert.bookingUrl && needsUrlRepair(alert.bookingUrl)) {
          alert.bookingUrl = healed.bmsUrl;
        }
        await alert.save();
      }
    }
  }

  const activeAlerts = await Alert.find({ status: 'watching' });
  console.log(`[Poller] Found ${activeAlerts.length} active alerts to watch`);

  for (const alert of activeAlerts) {
    if (alert.pollPhase !== 'warm') {
      alert.pollPhase = 'warm';
      await alert.save();
    }
    scheduleNextPoll(alert);
  }
}

/**
 * Schedule the next poll for an alert based on its phase
 */
function scheduleNextPoll(alert) {
  const alertId = alert._id.toString();
  
  // Clear any existing timer
  if (activeTimers.has(alertId)) {
    clearTimeout(activeTimers.get(alertId));
  }

  const interval = POLL_INTERVALS[alert.pollPhase] || POLL_INTERVALS.warm;
  
  const timer = setTimeout(() => pollAlert(alertId), interval);
  activeTimers.set(alertId, timer);

  console.log(`[Poller] Scheduled ${alert.movieName} @ ${alert.theatreName} -> next check in ${Math.round(interval / 60000)}m (${alert.pollPhase})`);
}

/**
 * Execute a single poll check for an alert
 */
async function pollAlert(alertId) {
  try {
    const alert = await Alert.findById(alertId);
    
    if (!alert || alert.status !== 'watching') {
      activeTimers.delete(alertId);
      return;
    }

    // Self-heal legacy alerts with invalid/non-HTTP bmsUrl (e.g. "aaa cinemas")
    if (alert.bmsUrl && !alert.bmsUrl.startsWith('http://') && !alert.bmsUrl.startsWith('https://')) {
      const lookupQuery = (alert.theatreName && alert.theatreName !== 'Selected Multiplex')
        ? alert.theatreName
        : alert.bmsUrl;
      const healed = await resolveTheatre(lookupQuery, alert.city, alert.targetDate || '20261217');
      if (healed?.bmsUrl) {
        console.log(`[Poller] Auto-healed legacy alert "${lookupQuery}" -> ${healed.theatreName} (${healed.bmsUrl})`);
        alert.theatreName = healed.theatreName;
        alert.bmsUrl = healed.bmsUrl;
        alert.city = healed.city || alert.city;
        await alert.save();
      }
    }

    console.log(`[Poller] Checking: ${alert.movieName} @ ${alert.theatreName} (${alert.pollPhase})`);

    // Scenario A: Watch for NEW shows added to an already active date/multiplex
    if (alert.watchType === 'new_shows' && alert.bmsUrl) {
      const cinemaResult = await getCinemaShows({
        url: alert.bmsUrl,
        movieName: alert.movieName,
        theatreName: alert.theatreName,
        city: alert.city,
        targetDate: alert.targetDate,
      });

      alert.lastCheckedAt = new Date();
      alert.checkCount += 1;

      if (cinemaResult.blocked) {
        await alert.save();
        // Back off politely to 5 minutes when upstream returns 403
        const backoffTimer = setTimeout(() => pollAlert(alertId), 5 * 60 * 1000);
        activeTimers.set(alertId, backoffTimer);
        return;
      }

      if (cinemaResult.shows.length > 0) {
        // Compare with known shows
        const currentShows = cinemaResult.shows;
        const previousShows = alert.knownShows || [];

        // If knownShows was never initialized (first scan), record these as the baseline
        // so we don't trigger a false alarm for shows that ALREADY existed!
        if (previousShows.length === 0) {
          alert.knownShows = currentShows;
          alert.lastCheckedAt = new Date();
          alert.checkCount += 1;
          await alert.save();
          console.log(`[Poller] Initialized baseline with ${currentShows.length} existing shows for ${alert.theatreName} on ${alert.targetDate || 'target date'}`);
          scheduleNextPoll(alert);
          return;
        }

        // Compare against the established baseline to find truly NEW shows
        const brandNewShows = currentShows.filter(s => !previousShows.includes(s));

        if (brandNewShows.length > 0) {
          console.log(`[Poller] 🚨 TRULY NEW SHOWS ADDED at ${alert.theatreName}:`, brandNewShows);

          alert.status = 'triggered';
          alert.triggeredAt = new Date();
          alert.newShowsDetected = brandNewShows;
          alert.knownShows = [...new Set([...previousShows, ...currentShows])];
          alert.bookingUrl = alert.bmsUrl;
          await alert.save();

          const bookingData = {
            url: alert.bmsUrl,
            showtimes: brandNewShows,
            isNewShowAlert: true,
          };

          if (alert.phoneNumber || alert.email) {
            await sendMobileAlert(alert, bookingData);
          }
          if (alert.telegramChatId) {
            await sendTelegramAlert(alert.telegramChatId, alert, bookingData);
          }

          // Stop timer once triggered, or keep watching if user wants recurring
          activeTimers.delete(alertId);
          return;
        } else {
          // No new shows added yet
          alert.lastCheckedAt = new Date();
          alert.checkCount += 1;
          await alert.save();
          scheduleNextPoll(alert);
          return;
        }
      } else {
        alert.lastCheckedAt = new Date();
        alert.checkCount += 1;
        await alert.save();
        scheduleNextPoll(alert);
        return;
      }
    }

    // Scenario B: Standard initial booking open detection
    const result = await checkBookingStatus({
      eventCode: alert.eventCode,
      citySlug: alert.city,
      venueCode: alert.venueCode,
    });

    // Update check count and timestamp
    alert.lastCheckedAt = new Date();
    alert.checkCount += 1;

    if (result.isOpen) {
      // 🚨 BOOKINGS ARE LIVE!
      console.log(`[Poller] 🚨 BOOKINGS OPEN: ${alert.movieName} @ ${alert.theatreName}!`);

      alert.status = 'triggered';
      alert.triggeredAt = new Date();
      alert.bookingUrl = result.url;
      await alert.save();

      // Send notification
      if (alert.telegramChatId) {
        await sendTelegramAlert(alert.telegramChatId, alert, result);
      }

      if (alert.phoneNumber || alert.email) {
        await sendMobileAlert(alert, result);
      }

      // Escalate other alerts for the same movie to HOT phase
      await escalateRelatedAlerts(alert.eventCode, alertId);

      // Remove timer
      activeTimers.delete(alertId);
    } else {
      // Still waiting...
      await alert.save();
      
      // Schedule next poll
      scheduleNextPoll(alert);
    }

  } catch (error) {
    console.error(`[Poller] Error polling ${alertId}:`, error.message);
    
    // Retry after a delay even on error
    const retryTimer = setTimeout(() => pollAlert(alertId), 60000); // 1 min retry
    activeTimers.set(alertId, retryTimer);
  }
}

/**
 * When bookings open at one theatre, escalate all other alerts 
 * for the same movie to HOT phase (they're likely opening soon too)
 */
async function escalateRelatedAlerts(eventCode, triggeredAlertId) {
  const relatedAlerts = await Alert.find({
    eventCode,
    status: 'watching',
    _id: { $ne: triggeredAlertId },
  });

  console.log(`[Poller] Escalating ${relatedAlerts.length} related alerts to HOT for ${eventCode}`);

  for (const alert of relatedAlerts) {
    if (alert.pollPhase !== 'hot') {
      alert.pollPhase = 'hot';
      await alert.save();
      scheduleNextPoll(alert); // Reschedule with shorter interval
    }
  }
}

/**
 * Add a new alert to the polling system
 */
export function addToPolling(alert) {
  scheduleNextPoll(alert);
}

/**
 * Remove an alert from polling
 */
export function removeFromPolling(alertId) {
  if (activeTimers.has(alertId)) {
    clearTimeout(activeTimers.get(alertId));
    activeTimers.delete(alertId);
    console.log(`[Poller] Removed ${alertId} from polling`);
  }
}

/**
 * Manually escalate an alert's phase
 */
export async function escalateAlert(alertId, phase = 'hot') {
  const alert = await Alert.findById(alertId);
  if (alert && alert.status === 'watching') {
    alert.pollPhase = phase;
    await alert.save();
    scheduleNextPoll(alert);
    return true;
  }
  return false;
}

/**
 * Manually trigger an immediate poll check for an alert
 */
export async function pollSingleAlert(alertId) {
  return await pollAlert(alertId);
}

/**
 * Get polling stats
 */
export function getPollingStats() {
  return {
    activeTimers: activeTimers.size,
    intervals: POLL_INTERVALS,
  };
}

export default {
  startPolling,
  addToPolling,
  removeFromPolling,
  escalateAlert,
  pollSingleAlert,
  getPollingStats,
};

