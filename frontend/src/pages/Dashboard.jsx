import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, Eye, Zap, Trash2, Plus, 
  Clock, Film, MapPin, RefreshCw, Loader2, Phone, Mail, ExternalLink 
} from 'lucide-react';
import api from '../api/client';

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState(null);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/api/alerts');
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/api/alerts/stats/overview');
      setStats(data);
    } catch {}
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

    // 1. Direct verified mappings with exact working BookMyShow routes
    if (raw.includes('avd')) {
      return 'https://in.bookmyshow.com/cinemas/mahbubnagar/avd-cinemas-mahbubnagar/buytickets/AVDM/';
    }
    if (raw.includes('aaa')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/aaa-cinemas-ameerpet/buytickets/ACAS/';
    }
    if (raw.includes('allu')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/allu-cinemas-kokapet/buytickets/ALCO/';
    }
    if (raw.includes('prasad')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/prasads-multiplex-hyderabad/buytickets/PRHN/';
    }
    if (raw.includes('amb')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/amb-cinemas-gachibowli/buytickets/AMBG/';
    }
    if (raw.includes('inorbit')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/pvr-inorbit-cyberabad/buytickets/PVIC/';
    }
    if (raw.includes('nexus') || (raw.includes('pvr') && raw.includes('kukatpally'))) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/pvr-nexus-mall-kukatpally-hyderabad/buytickets/PVNK/';
    }
    if (raw.includes('gvk')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/inox-gvk-one-mall-banjara-hills-hyderabad/buytickets/IGVK/';
    }
    if (raw.includes('satyam')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/asian-satyam-mall-ameerpet-hyderabad/buytickets/ASMA/';
    }
    if (raw.includes('sudarshan')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/sudarshan-35mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/buytickets/BMSH/2485';
    }
    if (raw.includes('devi')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/devi-70mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/buytickets/BMSH/2483';
    }
    if (raw.includes('sandhya')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/sandhya-70mm-rtc-x-roads-hyderabad/buytickets/SAND/';
    }
    if (raw.includes('bramaramba') || raw.includes('bhramaramba')) {
      return 'https://in.bookmyshow.com/cinemas/hyderabad/bhramaramba-70mm-kukatpally-hyderabad/buytickets/BHRA/';
    }

    // 2. Normalize any valid BookMyShow cinema URL to ensure city and /buytickets/ are present
    if (url && url.startsWith('https://in.bookmyshow.com/cinemas/')) {
      let path = url.replace('https://in.bookmyshow.com/cinemas/', '').replace(/^\/+|\/+$/g, '');
      const cleanCity = (city || 'hyderabad').toLowerCase().trim();
      const knownCities = ['hyderabad', 'mahbubnagar', 'bengaluru', 'chennai', 'vijayawada', 'visakhapatnam', 'mumbai', 'delhi'];
      const hasCity = knownCities.some(c => path.startsWith(c + '/'));
      if (!hasCity) {
        path = `${cleanCity}/${path}`;
      }
      if (!path.includes('/buytickets/')) {
        const parts = path.split('/');
        if (parts.length === 3) {
          path = `${parts[0]}/${parts[1]}/buytickets/${parts[2]}/`;
        } else if (parts.length === 4 && parts[2] === 'BMSH') {
          path = `${parts[0]}/${parts[1]}/buytickets/BMSH/${parts[3]}`;
        }
      }
      return `https://in.bookmyshow.com/cinemas/${path}`;
    }

    if (url && url.startsWith('http')) return url;
    return `https://in.bookmyshow.com/explore/cinemas-${(city || 'hyderabad').toLowerCase()}`;
  };

  const getBmsUrl = (alert) => {
    // If the alert already triggered with a verified drop deep link, use it
    if (alert.bookingUrl && alert.bookingUrl.startsWith('http') && !alert.bookingUrl.includes('undefined')) {
      return alert.bookingUrl;
    }
    return normalizeBmsVenueUrl(alert.bmsUrl, alert.theatreName, alert.city);
  };

  const cancelAlert = async (id) => {
    try {
      await api.delete(`/api/alerts/${id}`);
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
    try {
      await api.patch(`/api/alerts/${id}/escalate`, { phase: 'hot' });
      setAlerts(prev => prev.map(a => 
        a._id === id ? { ...a, pollPhase: 'hot' } : a
      ));
    } catch (err) {
      console.error('Failed to escalate:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-ink animate-spin" />
        <span className="font-dela text-sm uppercase text-ink">READING RADAR TELEMETRY...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
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
            {alerts.filter(a => a.status === 'watching').length} live watchers scanning showtimes every 30 mins
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchAlerts(); fetchStats(); }}
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
        <div className="grid grid-cols-3 gap-4 mb-8">
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
              ACTIVE POLLERS
            </span>
            <div className="font-dela text-3xl md:text-4xl text-acid">{stats.activePollers || stats.watching}</div>
            <div className="font-mono text-xs text-paper/70 mt-1">30m Interval</div>
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
            You don't have any cinemas under monitoring right now. Set an alarm to track new shows!
          </p>
          <Link
            to="/new-alert"
            className="btn-hard bg-ink text-acid font-space font-bold uppercase text-xs px-6 py-3.5 rounded-[10px] inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Set First Drop Alarm</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`border-2 border-ink rounded-[20px] p-6 shadow-hard transition-all ${
                alert.status === 'triggered'
                  ? 'bg-acid/20 border-ink'
                  : 'bg-paper'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-dela text-xl md:text-2xl uppercase tracking-tight text-ink">
                      {alert.movieName}
                    </span>
                    {alert.status === 'triggered' && (
                      <span className="px-2 py-0.5 bg-red-600 text-paper border border-ink font-dela text-[10px] uppercase rounded-[4px]">
                        DROP DETECTED
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
                      <div className="text-[11px] text-ink/80">Dispatched to your mobile!</div>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  {/* Status chip */}
                  <span className="px-3 py-1 bg-ink text-acid border-2 border-ink rounded-[8px] font-mono text-xs font-bold uppercase">
                    {alert.pollPhase === 'hot' ? '10m HOT' : '30m SCAN'}
                  </span>

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
                      title="Escalate to 10m HOT scan"
                      className="p-2.5 bg-acid border-2 border-ink rounded-[8px] hover:bg-ink hover:text-acid shadow-hard-xs transition-all"
                    >
                      <Zap className="w-4 h-4" />
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
