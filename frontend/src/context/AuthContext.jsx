import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'dropclock_token';
const USER_KEY = 'dropclock_user';
const GUEST_IDS_KEY = 'dropclock_guest_alert_ids';

export function getGuestAlertIds() {
  try {
    const raw = localStorage.getItem(GUEST_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addGuestAlertId(id) {
  if (!id) return;
  try {
    const current = getGuestAlertIds();
    if (!current.includes(id)) {
      localStorage.setItem(GUEST_IDS_KEY, JSON.stringify([id, ...current].slice(0, 50)));
    }
  } catch {}
}

export function removeGuestAlertId(id) {
  if (!id) return;
  try {
    const current = getGuestAlertIds().filter(item => item !== id);
    localStorage.setItem(GUEST_IDS_KEY, JSON.stringify(current));
  } catch {}
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState(false);

  const persistSession = (newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setToken('');
    }
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setUser(newUser);
    } else {
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  };

  const claimGuestAlertsIfAny = useCallback(async () => {
    const guestIds = getGuestAlertIds();
    if (!guestIds.length) return 0;
    try {
      const { data } = await api.post('/api/alerts/claim', { ids: guestIds });
      localStorage.removeItem(GUEST_IDS_KEY);
      return data?.claimed || 0;
    } catch {
      return 0;
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setAuthReady(true);
      return null;
    }
    try {
      const { data } = await api.get('/api/auth/me');
      if (data?.user) {
        persistSession(savedToken, data.user);
        setAuthReady(true);
        return data.user;
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        persistSession('', null);
      }
    }
    setAuthReady(true);
    return null;
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password });
    persistSession(data.token, data.user);
    const claimed = await claimGuestAlertsIfAny();
    return { user: data.user, claimed };
  };

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    persistSession(data.token, data.user);
    const claimed = await claimGuestAlertsIfAny();
    return { user: data.user, claimed };
  };

  const updatePreferences = async (prefs) => {
    const { data } = await api.patch('/api/auth/preferences', prefs);
    if (data?.user) {
      persistSession(token, data.user);
    }
    return data.user;
  };

  const logout = () => {
    persistSession('', null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        authReady,
        login,
        register,
        logout,
        updatePreferences,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
