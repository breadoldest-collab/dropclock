import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Zap, Trash2, Plus, MapPin, RefreshCw, Loader2, Phone, Mail,
  ExternalLink, Search, Pause, Play, RotateCcw, Volume2, VolumeX,
  Lock, ShieldCheck, SlidersHorizontal, Check
} from 'lucide-react';
import api from '../api/client';
import { useAuth, getGuestAlertIds, removeGuestAlertId } from '../context/AuthContext';

function playDropAlarmSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [880, 1174.66, 880, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.13);
    });
  } catch {}
}

function Dashboard() {
  const { user, isAuthenticated, authReady, updatePreferences } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'watching' | 'triggered' | 'paused'
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('dropclock_sound') === '1');

  // Defaults drawer state
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefEmail, setPrefEmail] = useState('');
  const [prefPhone, setPrefPhone] = useState('');
  const [prefCity, setPrefCity] = useState('hyderabad');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const prevTriggeredIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (user) {
      setPrefEmail(user.defaultEmail || '');
      setPrefPhone(user.defaultPhone || '');
      setPrefCity(user.defaultCity || 'hyderabad');
    }
  }, [user]);

  const fetchAlerts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const guestIds = !isAuthenticated ? getGuestAlertIds() : [];
      const query = !isAuthenticated && guestIds.length > 0
        ? `?ids=${encodeURIComponent(guestIds.join(','))}`
        : '';

      const { data } = await api.get(`/api/alerts${query}`);
      const list = data.alerts || [];

      // Check for newly triggered alarms while watching
      const currentTriggered = new Set(list.filter(a => a.status === 'triggered').map(a => a._id));
      if (!firstLoadRef.current) {
        const newlyTriggered = list.filter(
          a => a.status === 'triggered' && !prevTriggeredIdsRef.current.has(a._id)
        );
        if (newlyTriggered.length > 0) {
          if (soundEnabled) playDropAlarmSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            newlyTriggered.forEach(a => {
              new Notification(`DROP DETECTED: ${a.movieName}`, {
                body: `${a.theatreName} — ${(a.newShowsDetected || []).join(', ') || 'Bookings are LIVE!'}`,
              });
            });
          }
        }
      }
      prevTriggeredIdsRef.current = currentTriggered;
      firstLoadRef.current = false;

      setAlerts(list);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated, soundEnabled]);

  const fetchStats = useCallback(async () => {
    try {
      const guestIds = !isAuthenticated ? getGuestAlertIds() : [];
      const query = !isAuthenticated && guestIds.length > 0
        ? `?ids=${encodeURIComponent(guestIds.join(','))}`
        : '';
      const { data } = await api.get(`/api/alerts/stats/overview${query}`);
      setStats(data);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authReady) return;
    firstLoadRef.current = true;
    fetchAlerts();
    fetchStats();
  }, [authReady, isAuthenticated, fetchAlerts, fetchStats]);

  // Live background radar sync every 30s when there are active watchers
  useEffect(() => {
    if (!authReady) return;
    const timer = setInterval(() => {
      fetchAlerts({ silent: true });
      fetchStats();
    }, 30000);
    return () => clearInterval(timer);
  }, [authReady, fetchAlerts, fetchStats]);

  const toggleSoundAlarm = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('dropclock_sound', next ? '1' : '0');
    if (next) {
      playDropAlarmSound();
      if ('Notification' in window && Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch {}
      }
    }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefsSaved(false);
    try {
      await updatePreferences({
        defaultEmail: prefEmail,
        defaultPhone: prefPhone,
        defaultCity: prefCity,
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save defaults:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const formatTheatre = (theatreName, bmsUrl = '') => {
    const raw = (theatreName === 'Selected Multiplex' && bmsUrl) ? bmsUrl : (theatreName || bmsUrl);
    if (!raw) return 'Multiplex Cinema';
    const lower = raw.toLowerCase();
    if (lower.includes('aaa cinemas')) return 'AAA Cinemas (Ameerpet)';
    if (lower.includes('allu cinemas')) return 'ALLU Cinemas (Kokapet)';
    if (lower.includes('avd cinemas')) return 'AVD Cinemas (Mahbubnagar)';
    if (lower.includes('prasads')) return 'Prasads Multiplex (Necklace Road)';
    if (lower.includes('amb cinemas')) return 'AMB Cinemas (Gachibowli)';
    return raw.replace(/\b[a-z]/g, l => l.toUpperCase());
  };

  const normalizeBmsVenueUrl = (url, theatreName = '', city = 'hyderabad') => {
    const raw = `${theatreName || ''} ${url || ''}`.toLowerCase();

    if (raw.includes('avd')) return 'https://in.bookmyshow.com/cinemas/mahbubnagar/avd-cinemas-mahbubnagar/buytickets/AVDM/';
    if (raw.includes('aaa')) return 'https://in.bookmyshow.com/cinemas/hyderabad/aaa-cinemas-ameerpet/buytickets/ACAS/';
    if (raw.includes('allu')) return 'https://in.bookmyshow.com/cinemas/hyderabad/allu-cinemas-kokapet/buytickets/ALCO/';
    if (raw.includes('prasad')) return 'https://in.bookmyshow.com/cinemas/hyderabad/prasads-multiplex-hyderabad/buytickets/PRHN/';
    if (raw.includes('amb')) return 'https://in.bookmyshow.com/cinemas/hyderabad/amb-cinemas-gachibowli/buytickets/AMBG/';
    if (raw.includes('inorbit')) return 'https://in.bookmyshow.com/cinemas/hyderabad/pvr-inorbit-cyberabad/buytickets/PVIC/';
    if (raw.includes('nexus') || (raw.includes('pvr') && raw.includes('kukatpally'))) return 'https://in.bookmyshow.com/cinemas/hyderabad/pvr-nexus-mall-kukatpally-hyderabad/buytickets/PVNK/';
    if (raw.includes('gvk')) return 'https://in.bookmyshow.com/cinemas/hyderabad/inox-gvk-one-mall-banjara-hills-hyderabad/buytickets/IGVK/';
    if (raw.includes('satyam')) return 'https://in.bookmyshow.com/cinemas/hyderabad/asian-satyam-mall-ameerpet-hyderabad/buytickets/ASMA/';
    if (raw.includes('sudarshan')) return 'https://in.bookmyshow.com/cinemas/hyderabad/sudarshan-35mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/buytickets/BMSH/2485';
    if (raw.includes('devi')) return 'https://in.bookmyshow.com/cinemas/hyderabad/devi-70mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/buytickets/BMSH/2483';
    if (raw.includes('sandhya')) return 'https://in.bookmyshow.com/cinemas/hyderabad/sandhya-70mm-rtc-x-roads-hyderabad/buytickets/SAND/';
    if (raw.includes('bramaramba') || raw.includes('bhramaramba')) return 'https://in.bookmyshow.com/cinemas/hyderabad/bhramaramba-70mm-kukatpally-hyderabad/buytickets/BHRA/';

    if (url && url.startsWith('https://in.bookmyshow.com/cinemas/')) {
      let path = url.replace('https://in.bookmyshow.com/cinemas/', '').replace(/^\/+|\/+$/g, '');
      const cleanCity = (city || 'hyderabad').toLowerCase().trim();
      const knownCities = ['hyderabad', 'mahbubnagar', 'bengaluru', 'chennai', 'vijayawada', 'visakhapatnam', 'mumbai', 'delhi'];
      const hasCity = knownCities.some(c => path.startsWith(c + '/'));
      if (!hasCity) path = `${cleanCity}/${path}`;
      if (!path.includes('/buytickets/')) {
        const parts = path.split('/');
        if (parts.length === 3) path = `${parts[0]}/${parts[1]}/buytickets/${parts[2]}/`;
        else if (parts.length === 4 && parts[2] === 'BMSH') path = `${parts[0]}/${parts[1]}/buytickets/BMSH/${parts[3]}`;
      }
      return `https://in.bookmyshow.com/cinemas/${path}`;
    }

    if (url && url.startsWith('http')) return url;
    return `https://in.bookmyshow.com/explore/cinemas-${(city || 'hyderabad').toLowerCase()}`;
  };

  const getBmsUrl = (alert) => {
    if (alert.bookingUrl && alert.bookingUrl.startsWith('http') && !alert.bookingUrl.includes('undefined')) {
      return alert.bookingUrl;
    }
    return normalizeBmsVenueUrl(alert.bmsUrl, alert.theatreName, alert.city);
  };

  const cancelAlert = async (id) => {
    try {
      await api.delete(`/api/alerts/${id}`);
      removeGuestAlertId(id);
      setAlerts(prev => prev.filter(a => a._id !== id));
      fetchStats();
    } catch (err) {
      console.error('Failed to cancel alert:', err);
    }
  };

  const scanNow = async (id) => {
    setScanningId(id);
    try {
      const { data } = await api.post(`/api/alerts/${id}/scan-now`);
      if (data?.alert) {
        setAlerts(prev => prev.map(a => a._id === id ? data.alert : a));
      }
      fetchStats();
    } catch (err) {
      console.error('Scan now failed:', err);
    } finally {
      setScanningId(null);
    }
  };

  const escalateAlert = async (id) => {
    setActionId(id);
    try {
      await api.patch(`/api/alerts/${id}/escalate`, { phase: 'hot' });
      setAlerts(prev => prev.map(a =>
        a._id === id ? { ...a, pollPhase: 'hot' } : a
      ));
    } catch (err) {
      console.error('Failed to escalate:', err);
    } finally {
      setActionId(null);
    }
  };

  const togglePause = async (id) => {
    setActionId(id);
    try {
      const { data } = await api.patch(`/api/alerts/${id}/toggle-pause`);
      if (data?.alert) {
        setAlerts(prev => prev.map(a => a._id === id ? data.alert : a));
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    } finally {
      setActionId(null);
    }
  };

  const rearmAlert = async (id) => {
    setActionId(id);
    try {
      const { data } = await api.post(`/api/alerts/${id}/rearm`);
      if (data?.alert) {
        setAlerts(prev => prev.map(a => a._id === id ? data.alert : a));
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to re-arm alert:', err);
    } finally {
      setActionId(null);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMovie = (alert.movieName || '').toLowerCase().includes(q);
      const matchTheatre = (alert.theatreName || '').toLowerCase().includes(q);
      const matchCity = (alert.city || '').toLowerCase().includes(q);
      return matchMovie || matchTheatre || matchCity;
    }
    return true;
  });

  if (loading || !authReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-ink animate-spin" />
        <span className="font-dela text-sm uppercase text-ink">READING RADAR TELEMETRY...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Cross-Device Account Banner */}
      {!isAuthenticated ? (
        <div className="mb-8 bg-acid/35 border-2 border-ink rounded-[20px] p-5 md:p-6 shadow-hard flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[12px] bg-ink text-acid flex items-center justify-center shrink-0 shadow-hard-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-dela text-base md:text-lg uppercase text-ink">
                SIGN IN TO LOCATE YOUR CLOCKS ON ANY DEVICE
              </h2>
              <p className="font-space text-xs md:text-sm text-ink/80 mt-0.5">
                Right now this device only sees clocks created in this browser. Sign in with your username & password to sync alarms across your phone, tablet, and laptop.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/login"
              state={{ from: '/dashboard' }}
              className="btn-hard bg-ink text-acid font-space font-bold uppercase text-xs px-5 py-3 rounded-[10px] border-2 border-ink shadow-hard-xs"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              state={{ from: '/dashboard' }}
              className="btn-hard bg-paper text-ink font-space font-bold uppercase text-xs px-4 py-3 rounded-[10px] border-2 border-ink shadow-hard-xs hover:bg-white"
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-paper border-2 border-ink rounded-[18px] p-4 shadow-hard-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 bg-acid border-2 border-ink px-3 py-1 rounded-full font-mono text-xs font-bold text-ink">
                <ShieldCheck className="w-3.5 h-3.5" />
                SYNCED VAULT: @{user?.username}
              </span>
              <span className="font-mono text-xs text-ink/70 hidden sm:inline">
                Your clocks follow you on every device you sign into.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPrefs(p => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0ECE1] border-2 border-ink rounded-[10px] font-space text-xs font-bold uppercase text-ink hover:bg-acid transition-colors shadow-hard-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Saved Defaults</span>
            </button>
          </div>

          {showPrefs && (
            <form onSubmit={handleSavePrefs} className="mt-4 pt-4 border-t-2 border-dashed border-ink/20 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-ink/70 mb-1">Default Email</label>
                <input
                  type="email"
                  value={prefEmail}
                  onChange={e => setPrefEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-3 py-2 bg-white border-2 border-ink rounded-[10px] font-mono text-xs font-bold text-ink"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-ink/70 mb-1">Default WhatsApp / Phone</label>
                <input
                  type="tel"
                  value={prefPhone}
                  onChange={e => setPrefPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-white border-2 border-ink rounded-[10px] font-mono text-xs font-bold text-ink"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-ink/70 mb-1">Default City</label>
                <input
                  type="text"
                  value={prefCity}
                  onChange={e => setPrefCity(e.target.value)}
                  placeholder="hyderabad"
                  className="w-full px-3 py-2 bg-white border-2 border-ink rounded-[10px] font-mono text-xs font-bold text-ink lowercase"
                />
              </div>
              <button
                type="submit"
                disabled={savingPrefs}
                className="btn-hard bg-ink text-acid font-space font-bold uppercase text-xs py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-1.5"
              >
                {prefsSaved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : (savingPrefs ? 'Saving...' : 'Save Defaults')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-block transform -rotate-1 bg-acid border-2 border-ink px-3 py-1 rounded-full shadow-hard-xs mb-2">
            <span className="font-mono text-xs font-bold uppercase text-ink">
              TELEMETRY & LOGS
            </span>
          </div>
          <h1 className="font-dela text-3xl md:text-5xl uppercase tracking-tighter text-ink glitch-hover">
            ACTIVE RADARS
          </h1>
          <p className="font-space text-sm text-ink/70 font-medium mt-1">
            {alerts.filter(a => a.status === 'watching').length} live watchers scanning BookMyShow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSoundAlarm}
            title={soundEnabled ? 'Browser Alarm Sound ON' : 'Enable Browser Alarm Sound'}
            className={`px-3.5 py-2.5 border-2 border-ink rounded-[10px] font-space text-xs font-bold uppercase flex items-center gap-1.5 shadow-hard-xs transition-all ${
              soundEnabled ? 'bg-acid text-ink' : 'bg-paper text-ink/80 hover:bg-acid/40'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Siren ON' : 'Siren OFF'}</span>
          </button>

          <button
            onClick={() => { fetchAlerts(); fetchStats(); }}
            className="w-11 h-11 bg-paper border-2 border-ink rounded-[10px] flex items-center justify-center shadow-hard-xs hover:bg-acid hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            title="Refresh Radar"
          >
            <RefreshCw className="w-5 h-5 text-ink" />
          </button>

          <Link
            to="/new-alert"
            className="btn-hard bg-acid text-ink font-space font-bold uppercase text-xs md:text-sm px-5 py-3 rounded-[10px] flex items-center gap-2 shadow-hard-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Set New Alarm</span>
          </Link>
        </div>
      </div>

      {/* Stats Bento */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-paper border-2 border-ink rounded-[16px] p-5 shadow-hard">
            <span className="font-mono text-[11px] text-ink/60 uppercase font-bold block mb-1">
              SCANNING 24/7
            </span>
            <div className="font-dela text-3xl md:text-4xl text-ink">{stats.watching}</div>
            <div className="font-mono text-xs text-ink/70 mt-1">Active Targets</div>
          </div>

          <div className="bg-acid border-2 border-ink rounded-[16px] p-5 shadow-hard">
            <span className="font-mono text-[11px] text-ink/60 uppercase font-bold block mb-1">
              DROPS TRIGGERED
            </span>
            <div className="font-dela text-3xl md:text-4xl text-ink">{stats.triggered}</div>
            <div className="font-mono text-xs text-ink/70 mt-1">Alerts Dispatched</div>
          </div>

          <div className="bg-ink text-paper border-2 border-ink rounded-[16px] p-5 shadow-hard">
            <span className="font-mono text-[11px] text-acid uppercase font-bold block mb-1">
              PAUSED CLOCKS
            </span>
            <div className="font-dela text-3xl md:text-4xl text-acid">{stats.paused || 0}</div>
            <div className="font-mono text-xs text-paper/70 mt-1">Standing By</div>
          </div>
        </div>
      )}

      {/* Search & Status Filter Bar */}
      {alerts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `All (${alerts.length})` },
              { id: 'watching', label: `Watching (${alerts.filter(a => a.status === 'watching').length})` },
              { id: 'triggered', label: `Triggered (${alerts.filter(a => a.status === 'triggered').length})` },
              { id: 'paused', label: `Paused (${alerts.filter(a => a.status === 'paused').length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-[10px] border-2 border-ink font-space text-xs font-bold uppercase transition-all ${
                  statusFilter === tab.id ? 'bg-ink text-acid shadow-hard-xs' : 'bg-paper text-ink hover:bg-acid/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-ink/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movie, cinema, city..."
              className="w-full pl-9 pr-3 py-2 bg-paper border-2 border-ink rounded-[10px] font-space text-xs font-semibold text-ink focus:outline-none focus:bg-white shadow-hard-xs"
            />
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-paper border-2 border-ink rounded-[24px] p-12 text-center shadow-hard-lg">
          <div className="w-16 h-16 bg-acid border-2 border-ink rounded-[14px] flex items-center justify-center mx-auto mb-4 shadow-hard-sm">
            <Bell className="w-8 h-8 text-ink stroke-[2]" />
          </div>
          <h3 className="font-dela text-2xl uppercase tracking-tight text-ink mb-2">
            NO ACTIVE RADARS
          </h3>
          <p className="font-space text-sm text-ink/80 max-w-md mx-auto mb-6">
            {isAuthenticated
              ? `No alarms saved under @${user?.username} yet. Set an alarm and it will sync across all your devices!`
              : "You don't have any cinemas under monitoring on this device yet. Set an alarm or sign in to locate saved clocks!"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/new-alert"
              className="btn-hard bg-ink text-acid font-space font-bold uppercase text-xs px-6 py-3.5 rounded-[10px] inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Set First Drop Alarm</span>
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                state={{ from: '/dashboard' }}
                className="btn-hard bg-paper text-ink font-space font-bold uppercase text-xs px-6 py-3.5 rounded-[10px] border-2 border-ink inline-flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In to Locate Clocks</span>
              </Link>
            )}
          </div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-paper border-2 border-ink rounded-[20px] p-8 text-center shadow-hard-sm font-space text-sm text-ink/75">
          No clocks match your current filter.{' '}
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
            className="font-bold text-ink underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert._id}
              className={`border-2 border-ink rounded-[20px] p-6 shadow-hard transition-all ${
                alert.status === 'triggered'
                  ? 'bg-acid/20 border-ink'
                  : alert.status === 'paused'
                    ? 'bg-[#F0ECE1] opacity-90'
                    : 'bg-paper'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-dela text-xl md:text-2xl uppercase tracking-tight text-ink">
                      {alert.movieName}
                    </span>
                    {alert.status === 'triggered' && (
                      <span className="px-2 py-0.5 bg-red-600 text-paper border border-ink font-dela text-[10px] uppercase rounded-[4px]">
                        DROP DETECTED
                      </span>
                    )}
                    {alert.status === 'paused' && (
                      <span className="px-2 py-0.5 bg-ink/15 text-ink border border-ink font-dela text-[10px] uppercase rounded-[4px]">
                        PAUSED
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-ink/80">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-ink" />
                      {formatTheatre(alert.theatreName, alert.bmsUrl)}
                    </span>
                    <span>•</span>
                    <span className="uppercase font-bold">{alert.city}</span>
                    {alert.targetDate && (
                      <>
                        <span>•</span>
                        <span className="bg-acid px-2 py-0.5 border border-ink rounded font-bold text-ink">
                          DATE: {alert.targetDate}
                        </span>
                      </>
                    )}
                    {alert.email && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-bold text-ink">
                          <Mail className="w-3 h-3" />
                          {alert.email}
                        </span>
                      </>
                    )}
                    {alert.phoneNumber && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-bold text-ink">
                          <Phone className="w-3 h-3" />
                          +91 {alert.phoneNumber}
                        </span>
                      </>
                    )}
                    <span className="text-[10px] uppercase text-ink/60 font-bold">
                      ({alert.notificationMethod?.toUpperCase()})
                    </span>
                  </div>

                  {/* Known Shows Baseline */}
                  {alert.knownShows?.length > 0 && (
                    <div className="pt-1 font-mono text-xs text-ink/70">
                      Baseline tracked: <strong>{alert.knownShows.length} shows</strong> ({alert.knownShows.slice(0, 4).join(', ')}{alert.knownShows.length > 4 ? '...' : ''})
                    </div>
                  )}

                  {/* Triggered shows notification */}
                  {alert.newShowsDetected?.length > 0 && (
                    <div className="p-3 bg-acid border-2 border-ink rounded-[10px] font-mono text-xs font-bold text-ink space-y-1">
                      <div>NEW SHOWS DROPPED: {alert.newShowsDetected.join(', ')}</div>
                      <div className="text-[11px] text-ink/80">Dispatched to your alert channel!</div>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                  {alert.status === 'watching' && (
                    <span className="px-3 py-1 bg-ink text-acid border-2 border-ink rounded-[8px] font-mono text-xs font-bold uppercase">
                      {alert.pollPhase === 'hot' ? '10m HOT' : '30m SCAN'}
                    </span>
                  )}

                  {alert.status === 'watching' && (
                    <button
                      onClick={() => scanNow(alert._id)}
                      disabled={scanningId === alert._id}
                      title="Scan BookMyShow now"
                      className="btn-hard px-3 py-2 bg-paper text-ink border-2 border-ink rounded-[8px] font-space font-bold uppercase text-xs flex items-center gap-1.5 shadow-hard-xs hover:bg-acid disabled:opacity-50 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${scanningId === alert._id ? 'animate-spin' : ''}`} />
                      <span>{scanningId === alert._id ? 'Scanning...' : 'Scan Now'}</span>
                    </button>
                  )}

                  {alert.status === 'watching' && alert.pollPhase !== 'hot' && (
                    <button
                      onClick={() => escalateAlert(alert._id)}
                      disabled={actionId === alert._id}
                      title="Boost to 10m HOT scan"
                      className="p-2.5 bg-acid border-2 border-ink rounded-[8px] hover:bg-ink hover:text-acid shadow-hard-xs transition-all"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}

                  {(alert.status === 'watching' || alert.status === 'paused') && (
                    <button
                      onClick={() => togglePause(alert._id)}
                      disabled={actionId === alert._id}
                      title={alert.status === 'watching' ? 'Pause watcher' : 'Resume watcher'}
                      className="p-2.5 bg-paper border-2 border-ink rounded-[8px] text-ink hover:bg-acid shadow-hard-xs transition-all"
                    >
                      {alert.status === 'watching' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}

                  {alert.status === 'triggered' && (
                    <button
                      onClick={() => rearmAlert(alert._id)}
                      disabled={actionId === alert._id}
                      title="Keep watching for more screens (e.g. IMAX/midnight)"
                      className="btn-hard px-3 py-2 bg-paper text-ink border-2 border-ink rounded-[8px] font-space font-bold uppercase text-xs flex items-center gap-1.5 shadow-hard-xs hover:bg-acid transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-Arm</span>
                    </button>
                  )}

                  <a
                    href={getBmsUrl(alert)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-hard px-4 py-2 bg-acid text-ink border-2 border-ink rounded-[8px] font-space font-bold uppercase text-xs flex items-center gap-1 shadow-hard-xs hover:bg-acid/80"
                  >
                    <span>Book on BMS</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => cancelAlert(alert._id)}
                    title="Remove Tracker"
                    className="p-2.5 bg-paper border-2 border-ink rounded-[8px] text-ink hover:bg-red-500 hover:text-paper shadow-hard-xs transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {alert.lastCheckedAt && (
                <div className="mt-4 pt-3 border-t border-ink/20 flex justify-between font-mono text-[11px] text-ink/60">
                  <span>Last Radar Ping: {new Date(alert.lastCheckedAt).toLocaleTimeString('en-IN')}</span>
                  <span>Scans Executed: {alert.checkCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
