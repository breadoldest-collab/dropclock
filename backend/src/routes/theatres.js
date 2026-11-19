import express from 'express';
import { resolveTheatre, getLiveSuggestions } from '../services/theatreResolver.js';

const router = express.Router();

/**
 * GET /api/theatres/suggest?q=...
 * Returns matching theatres for autocomplete dropdown (with fast Gemini AI fallback)
 */
router.get('/suggest', async (req, res) => {
  try {
    const { q, city, date } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }
    const clean = q.trim();
    let suggestions = getLiveSuggestions(clean);

    // If no instant local match and query is >= 3 chars, resolve via Gemini AI (with 4s timeout)
    if (suggestions.length === 0 && clean.length >= 3) {
      const resolvePromise = resolveTheatre(clean, city || 'hyderabad', date || '20261118');
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 4000));
      const aiMatch = await Promise.race([resolvePromise, timeoutPromise]);

      if (aiMatch && aiMatch.theatreName) {
        suggestions = [{
          theatreName: aiMatch.theatreName,
          city: aiMatch.city,
          locality: aiMatch.locality,
          venueCode: aiMatch.venueCode,
          bmsUrl: aiMatch.bmsUrl,
          score: 1.0,
          source: aiMatch.source,
        }];
      }
    }

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

/**
 * GET /api/theatres/resolve?q=...&city=...&date=...
 * AI-powered theatre resolution
 */
router.get('/resolve', async (req, res) => {
  try {
    const { q, city, date } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }
    const result = await resolveTheatre(q, city || 'hyderabad', date || '20261118');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve theatre' });
  }
});

export default router;

