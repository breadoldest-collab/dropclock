import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, Eye, Zap, Trash2, Plus, 
  Clock, Film, MapPin, RefreshCw, Loader2, Phone, ExternalLink 
} from 'lucide-react';
import api from '../api/client';

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const formatTheatre = (name) => {
    if (!name) return 'Multiplex Cinema';
    const lower = name.toLowerCase();
    if (lower.includes('aaa')) return 'AAA Cinemas (AAAC)';
    if (lower.includes('prasad')) return 'Prasads Multiplex (PRHN)';
    if (lower.includes('amb')) return 'AMB Cinemas (AMBC)';
    if (lower.includes('pvr') && lower.includes('nexus')) return 'PVR Inox Nexus (PVND)';
    if (lower.includes('pvr')) return 'PVR Cinemas';
    if (lower.includes('inox')) return 'INOX Cinemas';
    if (lower.includes('sudarshan')) return 'Sudarshan 35MM (SUDX)';
    return name.replace(/\b[a-z]/g, l => l.toUpperCase());
  };

  const getBmsUrl = (alert) => {
    if (alert.bookingUrl) return alert.bookingUrl;
    if (alert.bmsUrl) return alert.bmsUrl;
    const name = (alert.theatreName || '').toLowerCase();
    const dateNum = (alert.targetDate || '').replace(/[^0-9]/g, '') || '20261217';
    if (name.includes('aaa')) return `https://in.bookmyshow.com/cinemas/HYD/aaa-cinemas-ameerpet/buytickets/AAAC/${dateNum}`;
    if (name.includes('prasad')) return `https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/${dateNum}`;
    if (name.includes('amb')) return `https://in.bookmyshow.com/cinemas/HYD/amb-cinemas-gachibowli/buytickets/AMBC/${dateNum}`;
    if (name.includes('pvr')) return `https://in.bookmyshow.com/cinemas/HYD/pvr-nexus-mall-kukatpally/buytickets/PVND/${dateNum}`;
    if (name.includes('sudarshan')) return `https://in.bookmyshow.com/cinemas/HYD/sudarshan-35mm-rtc-x-roads/buytickets/SUDX/${dateNum}`;
    return `https://in.bookmyshow.com/explore/cinemas-${alert.city || 'hyderabad'}`;
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
            {alerts.filter(a => a.status === 'watching').length} live watchers polling BookMyShow every 30s
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
              POLLERS HOT
            </span>
            <div className="font-dela text-3xl md:text-4xl text-acid">{stats.activePollers || stats.watching}</div>
            <div className="font-mono text-xs text-paper/70 mt-1">30s Interval</div>
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
                      {formatTheatre(alert.theatreName)}
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
                    {alert.phoneNumber && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-bold text-ink">
                          <Phone className="w-3 h-3" />
                          +91 {alert.phoneNumber} ({alert.notificationMethod?.toUpperCase()})
                        </span>
                      </>
                    )}
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
                    {alert.pollPhase === 'hot' ? '30s HOT' : '3m WARM'}
                  </span>

                  {alert.status === 'watching' && alert.pollPhase !== 'hot' && (
                    <button
                      onClick={() => escalateAlert(alert._id)}
                      title="Escalate to 30s HOT scan"
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
