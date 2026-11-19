/**
 * Alert API Routes
 * 
 * REST API for the web frontend to create/manage alerts.
 * The Telegram bot uses the same Alert model directly.
 */

import { Router } from 'express';
import Alert from '../models/Alert.js';
import { addToPolling, removeFromPolling, getPollingStats, computeSmartPhase, pollSingleAlert } from '../services/pollingService.js';
import { getCinemaShows } from '../services/bmsService.js';
import { resolveTheatre, normalizeVenueUrl } from '../services/theatreResolver.js';
import { sendAlarmArmedNotification, fetchTwilioContentTemplates } from '../services/notificationService.js';

const router = Router();

/**
 * Helper to parse a BMS buytickets URL
 * e.g. https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217
 */
function parseBmsUrl(url) {
  if (!url) return {};
  try {
    const match = url.match(/\/cinemas\/([^/]+)\/([^/]+)\/buytickets\/([^/]+)\/(\d{8})/);
    if (match) {
      return {
        city: match[1].toLowerCase(),
        cinemaSlug: match[2],
        theatreName: match[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        venueCode: match[3],
        targetDate: match[4],
      };
    }
  } catch {}
  return {};
}

/**
 * Format theatre name to clean title case when not already resolved
 */
function formatTheatreName(raw) {
  if (!raw) return 'Multiplex Cinema';
  return raw.trim().replace(/\b[a-z]/g, l => l.toUpperCase());
}

/**
 * Resolves a verified BookMyShow venue URL fallback
 */
function resolveBmsUrl(theatreName, city = 'hyderabad') {
  const clean = (theatreName || '').toLowerCase();
  if (clean.includes('avd')) return 'https://in.bookmyshow.com/cinemas/mahbubnagar/avd-cinemas-mahbubnagar/buytickets/AVDM/';
  if (clean.includes('aaa')) return 'https://in.bookmyshow.com/cinemas/hyderabad/aaa-cinemas-ameerpet/buytickets/ACAS/';
  if (clean.includes('allu')) return 'https://in.bookmyshow.com/cinemas/hyderabad/allu-cinemas-kokapet/buytickets/ALCO/';
  if (clean.includes('prasad')) return 'https://in.bookmyshow.com/cinemas/hyderabad/prasads-multiplex-hyderabad/buytickets/PRHN/';
  if (clean.includes('amb')) return 'https://in.bookmyshow.com/cinemas/hyderabad/amb-cinemas-gachibowli/buytickets/AMBG/';
  if (clean.includes('pvr') && (clean.includes('nexus') || clean.includes('pvnd') || clean.includes('pvnk'))) return 'https://in.bookmyshow.com/cinemas/hyderabad/pvr-nexus-mall-kukatpally-hyderabad/buytickets/PVNK/';
  if (clean.includes('inorbit')) return 'https://in.bookmyshow.com/cinemas/hyderabad/pvr-inorbit-cyberabad/buytickets/PVIC/';
  if (clean.includes('gvk')) return 'https://in.bookmyshow.com/cinemas/hyderabad/inox-gvk-one-mall-banjara-hills-hyderabad/buytickets/IGVK/';
  if (clean.includes('satyam')) return 'https://in.bookmyshow.com/cinemas/hyderabad/asian-satyam-mall-ameerpet-hyderabad/buytickets/ASMA/';
  if (clean.includes('sudarshan')) return 'https://in.bookmyshow.com/cinemas/hyderabad/sudarshan-35mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/buytickets/BMSH/2485';
  if (clean.includes('devi')) return 'https://in.bookmyshow.com/cinemas/hyderabad/devi-70mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/buytickets/BMSH/2483';
  if (clean.includes('sandhya')) return 'https://in.bookmyshow.com/cinemas/hyderabad/sandhya-70mm-rtc-x-roads-hyderabad/buytickets/SAND/';
  if (clean.includes('bramaramba') || clean.includes('bhramaramba')) return 'https://in.bookmyshow.com/cinemas/hyderabad/bhramaramba-70mm-kukatpally-hyderabad/buytickets/BHRA/';
  return `https://in.bookmyshow.com/explore/cinemas-${(city || 'hyderabad').toLowerCase()}`;
}

/**
 * POST /api/alerts - Create a new alert
 */
router.post('/', async (req, res) => {
  try {
    const { 
      bmsUrl,
      movieName, 
      eventCode, 
      theatreName, 
      venueCode, 
      city, 
      targetDate,
      watchType,
      email,
      phoneNumber,
      notificationMethod,
      telegramChatId,
    } = req.body;

    let cleanBmsUrl = (bmsUrl || '').trim();
    let cleanTheatre = (theatreName || '').trim();

    // If user entered cinema name in URL box OR frontend sent generic explore fallback
    if (cleanBmsUrl && (!cleanBmsUrl.startsWith('http') || cleanBmsUrl.includes('/explore/cinemas-'))) {
      if (!cleanBmsUrl.startsWith('http') && (!cleanTheatre || cleanTheatre === 'Selected Multiplex')) {
        cleanTheatre = cleanBmsUrl;
      }
      cleanBmsUrl = '';
    }

    // Auto-extract details if user provided a direct BMS URL
    let parsed = {};
    if (cleanBmsUrl) {
      parsed = parseBmsUrl(cleanBmsUrl);
    }

    const finalMovieName = (movieName && movieName.trim()) ? movieName.trim() : 'Any Show';
    let finalCity = (city || parsed.city || 'hyderabad').toLowerCase();
    const finalTargetDate = targetDate || parsed.targetDate;
    let finalTheatreName = cleanTheatre || parsed.theatreName;
    let finalBmsUrl = cleanBmsUrl;
    let finalVenueCode = venueCode || parsed.venueCode;

    // Always run Verified DB + SerpApi Live BMS Lookup + Gemini AI when no direct venue URL was pasted
    if (!finalBmsUrl && finalTheatreName) {
      const resolved = await resolveTheatre(finalTheatreName, finalCity);
      if (resolved) {
        finalTheatreName = resolved.theatreName;
        finalBmsUrl = resolved.bmsUrl;
        finalCity = resolved.city || finalCity;
        finalVenueCode = resolved.venueCode || finalVenueCode;
      }
    }

    finalTheatreName = finalTheatreName || formatTheatreName(cleanTheatre);
    finalBmsUrl = finalBmsUrl || resolveBmsUrl(finalTheatreName, finalCity);
    const finalWatchType = watchType || 'new_shows';

    // If watching for new shows, fetch the current shows baseline right now
    let initialShows = [];
    if (finalBmsUrl) {
      try {
        const preview = await getCinemaShows({
          url: finalBmsUrl,
          movieName: finalMovieName,
          theatreName: finalTheatreName,
          city: finalCity,
          targetDate: finalTargetDate,
        });
        initialShows = preview.shows || [];
        console.log(`[API] Captured baseline of ${initialShows.length} shows for new alert`);
      } catch (e) {
        console.warn('[API] Could not fetch immediate baseline, will fetch during first poll');
      }
    }

    const alert = new Alert({
      bmsUrl: finalBmsUrl,
      movieName: finalMovieName,
      eventCode: eventCode || 'UNKNOWN',
      theatreName: finalTheatreName,
      venueCode: finalVenueCode,
      city: finalCity,
      targetDate: finalTargetDate,
      watchType: finalWatchType,
      knownShows: initialShows,
      email: email ? email.trim().toLowerCase() : null,
      phoneNumber: phoneNumber || null,
      notificationMethod: notificationMethod || (email ? 'email' : 'whatsapp'),
      telegramChatId: telegramChatId || null,
      status: 'watching',
      pollPhase: computeSmartPhase(finalTargetDate),
    });

    await alert.save();
    addToPolling(alert);

    // Send immediate confirmation via Brevo Email / WhatsApp / SMS
    sendAlarmArmedNotification(alert).catch(err => {
      console.warn('[Notification] Failed to send instant confirmation:', err.message);
    });

    res.status(201).json({ 
      message: 'Alert created! Watching for new shows...',
      alert,
    });
  } catch (error) {
    console.error('[API] Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * POST /api/alerts/test-dispatch - Send a test notification immediately
 */
router.post('/test-dispatch', async (req, res) => {
  try {
    const { email, phoneNumber, method } = req.body;
    const testAlert = {
      movieName: 'Avengers Doomsday',
      theatreName: 'AAA Cinemas (AAAC)',
      city: 'hyderabad',
      targetDate: '17 DEC 2026',
      email: email || process.env.BREVO_SENDER_EMAIL || null,
      phoneNumber: phoneNumber || null,
      notificationMethod: method || (email ? 'email' : 'all'),
    };
    const result = await sendAlarmArmedNotification(testAlert);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts/twilio-templates - Inspect Twilio Content Templates on account
 */
router.get('/twilio-templates', async (req, res) => {
  try {
    const templates = await fetchTwilioContentTemplates();
    res.json({ count: templates.length, templates: templates.map(t => ({ sid: t.sid, friendly_name: t.friendly_name, variables: t.variables, types: t.types })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts - Get all alerts (excludes cancelled/expired by default)
 */
router.get('/', async (req, res) => {
  try {
    const { chatId, status } = req.query;
    const filter = status ? { status } : { status: { $ne: 'expired' } };

    if (chatId) filter.telegramChatId = chatId;

    const alerts = await Alert.find(filter).sort({ createdAt: -1 });
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * GET /api/alerts/:id - Get a specific alert
 */
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

/**
 * PATCH /api/alerts/:id/escalate - Escalate alert phase
 */
router.patch('/:id/escalate', async (req, res) => {
  try {
    const { phase } = req.body;
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (alert.status !== 'watching') {
      return res.status(400).json({ error: 'Alert is not active' });
    }

    alert.pollPhase = phase || 'hot';
    await alert.save();

    res.json({ message: `Escalated to ${alert.pollPhase}`, alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to escalate alert' });
  }
});

/**
 * POST /api/alerts/:id/scan-now - Manually trigger an immediate scan check
 */
router.post('/:id/scan-now', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    await pollSingleAlert(alert._id.toString());
    const updated = await Alert.findById(req.params.id);
    res.json({ message: 'Scan complete', alert: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/alerts/:id - Permanently delete an alert
 */
router.delete('/:id', async (req, res) => {
  try {
    removeFromPolling(req.params.id);
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    res.json({ message: 'Alert deleted permanently', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

/**
 * POST /api/alerts/repair-all - Force-heal ALL alerts in DB with broken URLs or theatre names
 * Call this once after deploy if dashboard shows old test data.
 */
router.post('/repair-all', async (req, res) => {
  try {
    const allAlerts = await Alert.find({ status: { $ne: 'expired' } });
    const results = [];

    for (const alert of allAlerts) {
      const badUrl = !alert.bmsUrl ||
        !alert.bmsUrl.startsWith('http') ||
        /\/(AAAC|AMBC|PVND|SUDX)\/|\/explore\/cinemas-|\/\d{6}$/i.test(alert.bmsUrl);

      // Also flag alerts with clearly test/broken theatre names
      const badTheatre = !alert.theatreName ||
        alert.theatreName === 'Selected Multiplex' ||
        alert.theatreName === 'Avt Cinemas';

      if (badUrl || badTheatre) {
        const query = (alert.theatreName && alert.theatreName !== 'Selected Multiplex')
          ? alert.theatreName
          : alert.bmsUrl;

        if (!query) {
          results.push({ id: alert._id, status: 'skipped', reason: 'no query' });
          continue;
        }

        const healed = await resolveTheatre(query, alert.city || 'hyderabad');
        if (healed?.bmsUrl) {
          const before = { theatreName: alert.theatreName, bmsUrl: alert.bmsUrl };
          alert.theatreName = healed.theatreName;
          alert.bmsUrl = healed.bmsUrl;
          if (alert.bookingUrl) alert.bookingUrl = healed.bmsUrl;
          await alert.save();
          results.push({ id: alert._id, status: 'healed', before, after: { theatreName: alert.theatreName, bmsUrl: alert.bmsUrl } });
        } else {
          results.push({ id: alert._id, status: 'unresolved', query });
        }
      } else {
        results.push({ id: alert._id, status: 'ok', theatreName: alert.theatreName });
      }
    }

    res.json({ repaired: results.filter(r => r.status === 'healed').length, total: allAlerts.length, results });
  } catch (error) {
    console.error('[Repair] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats - Get polling stats
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const totalWatching = await Alert.countDocuments({ status: 'watching' });
    const totalTriggered = await Alert.countDocuments({ status: 'triggered' });
    const pollingStats = getPollingStats();

    // Get top watched movies
    const topMovies = await Alert.aggregate([
      { $match: { status: 'watching' } },
      { $group: { _id: '$movieName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      watching: totalWatching,
      triggered: totalTriggered,
      activePollers: pollingStats.activeTimers,
      topMovies,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

