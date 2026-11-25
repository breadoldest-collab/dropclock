import crypto from 'crypto';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days for seamless cross-device persistence

function getTokenSecret() {
  const raw = process.env.JWT_SECRET || process.env.MONGODB_URI || 'dropclock-radar-local-secret-v1';
  return crypto.createHash('sha256').update(`dropclock:${raw}`).digest();
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(String(password), salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function signAuthToken(payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }));
  const data = `${header}.${body}`;
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', getTokenSecret()).update(data).digest()
  );
  return `${data}.${sig}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', getTokenSecret()).update(data).digest()
  );

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(body));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req);
  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded?.userId) {
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
      };
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  const decoded = verifyAuthToken(token);
  if (!decoded?.userId) {
    return res.status(401).json({ error: 'Please sign in with your username and password.' });
  }
  req.user = {
    userId: decoded.userId,
    username: decoded.username,
  };
  next();
}
