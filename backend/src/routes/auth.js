import { Router } from 'express';
import User from '../models/User.js';
import Alert from '../models/Alert.js';
import { hashPassword, verifyPassword, signAuthToken, requireAuth } from '../utils/auth.js';

const router = Router();

function formatUserResponse(user) {
  return {
    id: user._id,
    username: user.displayUsername || user.username,
    normalizedUsername: user.username,
    defaultEmail: user.defaultEmail || '',
    defaultPhone: user.defaultPhone || '',
    defaultCity: user.defaultCity || 'hyderabad',
    defaultNotificationMethod: user.defaultNotificationMethod || 'email',
    createdAt: user.createdAt,
  };
}

function validateUsername(raw) {
  const clean = String(raw || '').trim();
  if (clean.length < 3 || clean.length > 32) {
    return { error: 'Username must be between 3 and 32 characters.' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(clean)) {
    return { error: 'Username can only contain letters, numbers, dots, underscores, or hyphens.' };
  }
  return { clean, normalized: clean.toLowerCase() };
}

/**
 * POST /api/auth/register
 * Create an account with username + password to sync clocks across devices
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, defaultEmail, defaultPhone, defaultCity, defaultNotificationMethod } = req.body;

    const uCheck = validateUsername(username);
    if (uCheck.error) {
      return res.status(400).json({ error: uCheck.error });
    }

    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const existing = await User.findOne({ username: uCheck.normalized });
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken. Try signing in or pick another.' });
    }

    const user = new User({
      username: uCheck.normalized,
      displayUsername: uCheck.clean,
      passwordHash: hashPassword(password),
      defaultEmail: defaultEmail ? String(defaultEmail).trim().toLowerCase() : '',
      defaultPhone: defaultPhone ? String(defaultPhone).trim() : '',
      defaultCity: defaultCity ? String(defaultCity).trim().toLowerCase() : 'hyderabad',
      defaultNotificationMethod: defaultNotificationMethod || 'email',
    });

    await user.save();

    const token = signAuthToken({
      userId: user._id.toString(),
      username: user.username,
    });

    return res.status(201).json({
      message: 'Account created! Your clocks are now synced.',
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Sign in with username + password on any device to access saved clocks
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalized = String(username || '').trim().toLowerCase();

    if (!normalized || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: normalized });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signAuthToken({
      userId: user._id.toString(),
      username: user.username,
    });

    return res.json({
      message: 'Signed in! Loading your clocks...',
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 * Get logged-in user profile and clock counts
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const [watching, triggered, paused] = await Promise.all([
      Alert.countDocuments({ userId: user._id, status: 'watching' }),
      Alert.countDocuments({ userId: user._id, status: 'triggered' }),
      Alert.countDocuments({ userId: user._id, status: 'paused' }),
    ]);

    return res.json({
      user: formatUserResponse(user),
      counts: { watching, triggered, paused, total: watching + triggered + paused },
    });
  } catch (error) {
    console.error('[Auth] Me error:', error);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
});

/**
 * PATCH /api/auth/preferences
 * Update saved notification defaults for future alarms
 */
router.patch('/preferences', requireAuth, async (req, res) => {
  try {
    const { defaultEmail, defaultPhone, defaultCity, defaultNotificationMethod } = req.body;
    const update = {};

    if (defaultEmail !== undefined) update.defaultEmail = String(defaultEmail).trim().toLowerCase();
    if (defaultPhone !== undefined) update.defaultPhone = String(defaultPhone).trim();
    if (defaultCity !== undefined) update.defaultCity = String(defaultCity).trim().toLowerCase() || 'hyderabad';
    if (defaultNotificationMethod !== undefined) update.defaultNotificationMethod = defaultNotificationMethod;

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    return res.json({
      message: 'Notification defaults saved.',
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth] Preferences update error:', error);
    return res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

export default router;
