import express from 'express';
import { resolveTheatre, getLiveSuggestions } from '../services/theatreResolver.js';

const router = express.Router();

/**
 * GET /api/theatres/suggest?q=...
 * Returns matching theatres for autocomplete dropdown
 */
router.get('/suggest', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }
    const suggestions = getLiveSuggestions(q.trim());
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
