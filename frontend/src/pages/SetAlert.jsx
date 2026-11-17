import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Film, MapPin, Building2, Hash, ArrowRight, 
  Loader2, CheckCircle2, Phone, Link2, Calendar, Sparkles, PlusCircle, Zap 
} from 'lucide-react';
import api from '../api/client';

const POPULAR_CINEMAS = [
  { name: 'AAA Cinemas (AAAC)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/HYD/aaa-cinemas-ameerpet/buytickets/AAAC/20261217' },
  { name: 'Prasads Multiplex (PRHN)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217' },
  { name: 'AMB Cinemas (AMBC)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/HYD/amb-cinemas-gachibowli/buytickets/AMBC/20261217' },
  { name: 'PVR Inox Nexus (PVND)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/HYD/pvr-nexus-mall-kukatpally/buytickets/PVND/20261217' },
  { name: 'Sudarshan 35MM (RTC X Roads)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/HYD/sudarshan-35mm-rtc-x-roads/buytickets/SUDX/20261217' },
];

const formatCinemaName = (raw) => {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  if (lower.includes('aaa')) return 'AAA Cinemas (AAAC)';
  if (lower.includes('prasad')) return 'Prasads Multiplex (PRHN)';
  if (lower.includes('amb')) return 'AMB Cinemas (AMBC)';
  if (lower.includes('pvr') && lower.includes('nexus')) return 'PVR Inox Nexus (PVND)';
  if (lower.includes('pvr')) return 'PVR Cinemas';
  if (lower.includes('inox')) return 'INOX Cinemas';
  if (lower.includes('sudarshan')) return 'Sudarshan 35MM (SUDX)';
  return raw.trim().replace(/\b[a-z]/g, l => l.toUpperCase());
};

function SetAlert() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('url'); // 'url' or 'manual'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    bmsUrl: '',
    movieName: '',
    targetDate: '',
    city: 'hyderabad',
    theatreName: '',
    phoneNumber: '',
    notificationMethod: 'whatsapp',
    watchType: 'new_shows',
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleUrlChange = (url) => {
    updateField('bmsUrl', url);
    const match = url.match(/\/cinemas\/([^/]+)\/([^/]+)\/buytickets\/([^/]+)\/(\d{8})/i);
    if (match) {
      const citySlug = match[1].toLowerCase();
      const rawTheatre = match[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const dateStr = match[4];
      const formattedDate = `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;

      setForm(prev => ({
        ...prev,
        bmsUrl: url,
        city: citySlug,
        theatreName: rawTheatre,
        targetDate: formattedDate,
      }));
    }
  };

  const selectQuickCinema = (cinema) => {
    handleUrlChange(cinema.url);
    setForm(prev => ({
      ...prev,
      theatreName: cinema.name,
      city: cinema.city,
    }));
  };

  const handleSubmit = async () => {
    if (!form.phoneNumber) {
      setError('Please provide your 10-digit mobile number.');
      return;
    }

    if (mode === 'url' && !form.bmsUrl) {
      setError('Please enter or select a BookMyShow URL.');
      return;
    }

    setLoading(true);
    setError('');

    const formattedTheatre = formatCinemaName(form.theatreName) || form.theatreName || 'Selected Multiplex';

    try {
      await api.post('/api/alerts', {
        bmsUrl: form.bmsUrl,
        movieName: form.movieName,
        eventCode: 'UNKNOWN',
        city: form.city,
        theatreName: formattedTheatre,
        targetDate: form.targetDate,
        watchType: form.watchType,
        phoneNumber: form.phoneNumber,
        notificationMethod: form.notificationMethod,
      });
      setForm(prev => ({ ...prev, theatreName: formattedTheatre }));
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize alarm. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-paper border-2 border-ink rounded-[24px] p-8 md:p-12 text-center shadow-hard-lg">
          <div className="w-16 h-16 bg-acid border-2 border-ink rounded-[14px] flex items-center justify-center mx-auto mb-6 shadow-hard-sm">
            <CheckCircle2 className="w-8 h-8 text-ink stroke-[2.5]" />
          </div>

          <span className="font-mono text-xs uppercase text-ink/70 font-bold tracking-widest block mb-2">
            RADAR ACTIVE • 24/7 WATCHING
          </span>

          <h2 className="font-dela text-3xl md:text-4xl uppercase tracking-tighter text-ink mb-4">
            ALARM ARMED!
          </h2>

          <div className="bg-ink text-paper border-2 border-ink rounded-[16px] p-6 text-left my-6 space-y-2 font-mono text-xs">
            <div className="flex justify-between border-b border-paper/20 pb-2">
              <span className="text-acid uppercase">MOVIE</span>
              <span className="font-bold">{form.movieName || 'All Shows (Auto-Detect)'}</span>
            </div>
            <div className="flex justify-between border-b border-paper/20 py-2">
              <span className="text-acid uppercase">THEATRE</span>
              <span className="font-bold">{formatCinemaName(form.theatreName) || 'AAA Cinemas (AAAC)'}</span>
            </div>
            <div className="flex justify-between border-b border-paper/20 py-2">
              <span className="text-acid uppercase">DATE</span>
              <span className="font-bold">{form.targetDate}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-acid uppercase">DISPATCH TO</span>
              <span className="text-acid font-bold">+91 {form.phoneNumber} ({form.notificationMethod.toUpperCase()})</span>
            </div>
          </div>

          <p className="font-space text-sm text-ink/80 mb-8">
            The instant BookMyShow adds a new showtime (e.g. Screen 6 PCX or midnight shows), you will receive an immediate mobile alert with a direct booking deep-link.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => { setSuccess(false); setForm(prev => ({ ...prev, phoneNumber: '' })); }}
              className="btn-hard bg-paper text-ink font-space font-bold uppercase text-sm px-6 py-4 rounded-[12px]"
            >
              Set Another Alarm
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-hard bg-acid text-ink font-space font-bold uppercase text-sm px-8 py-4 rounded-[12px] shadow-hard"
            >
              View Active Radars
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-block transform -rotate-1 bg-acid border-2 border-ink px-3 py-1 rounded-full shadow-hard-xs mb-3">
          <span className="font-mono text-xs font-bold uppercase text-ink">
            SHOWTIME RADAR
          </span>
        </div>
        <h1 className="font-dela text-4xl md:text-6xl uppercase tracking-tighter text-ink glitch-hover">
          SET DROP ALARM
        </h1>
        <p className="font-space text-base md:text-lg text-ink/80 font-medium max-w-xl mx-auto mt-2">
          Monitor BookMyShow 24/7. When a multiplex drops <span className="bg-acid px-1 font-bold">new shows</span> on your date, get buzzed immediately.
        </p>

        {/* Mode Toggle */}
        <div className="inline-flex p-1 bg-paper border-2 border-ink rounded-[14px] shadow-hard-sm mt-6">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-space font-bold text-xs uppercase transition-all ${
              mode === 'url'
                ? 'bg-ink text-acid shadow-none'
                : 'text-ink hover:bg-acid'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Paste BMS Link (Fastest)
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-space font-bold text-xs uppercase transition-all ${
              mode === 'manual'
                ? 'bg-ink text-acid shadow-none'
                : 'text-ink hover:bg-acid'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Quick Multiplex Select
          </button>
        </div>
      </div>

      {/* MAIN CARD CONTAINER */}
      <div className="bg-paper border-2 border-ink rounded-[24px] p-6 md:p-10 shadow-hard-lg">
        {mode === 'url' ? (
          <div className="space-y-6">
            {/* Quick Cinema Chips */}
            <div>
              <label className="font-mono text-xs font-bold text-ink/70 uppercase block mb-2">
                1-Tap Popular Multiplexes:
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CINEMAS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectQuickCinema(c)}
                    className="btn-hard bg-paper text-ink font-space font-bold text-xs px-3 py-1.5 rounded-[8px] hover:bg-acid shadow-hard-xs"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="font-dela text-sm uppercase text-ink block mb-2">
                BookMyShow Cinema URL:
              </label>
              <input
                type="url"
                value={form.bmsUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217"
                className="w-full px-4 py-3.5 bg-paper border-2 border-ink rounded-[12px] font-mono text-xs md:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20 focus:border-ink shadow-hard-xs"
              />
              <p className="font-mono text-[11px] text-ink/60 mt-1.5">
                Paste the URL for your cinema on the specific booking date.
              </p>
            </div>

            {/* Detected Card */}
            {form.theatreName && (
              <div className="bg-acid/30 border-2 border-ink rounded-[14px] p-4 font-mono text-xs space-y-1 shadow-hard-xs">
                <div className="text-[10px] text-ink/70 font-bold uppercase">TARGET RADAR LOCKED:</div>
                <div className="font-bold text-ink">{form.theatreName}</div>
                <div className="text-ink/80">Date: {form.targetDate} • City: {form.city.toUpperCase()}</div>
              </div>
            )}

            {/* Optional Movie Filter */}
            <div>
              <label className="font-dela text-xs uppercase text-ink flex items-center justify-between mb-1.5">
                <span>Movie Filter (Optional):</span>
                <span className="font-mono text-[10px] text-ink/60 font-normal uppercase">Tracks all shows if blank</span>
              </label>
              <input
                type="text"
                value={form.movieName}
                onChange={e => updateField('movieName', e.target.value)}
                placeholder="Enter title (or leave blank to track all new shows)"
                className="w-full px-4 py-3 bg-paper border-2 border-ink rounded-[12px] font-space text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20 focus:border-ink shadow-hard-xs"
              />
            </div>
          </div>
        ) : (
          /* QUICK SELECT / MANUAL MODE */
          <div className="space-y-6">
            <div>
              <label className="font-dela text-xs uppercase text-ink block mb-2">
                Tap Quick Cinema or Type Below:
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CINEMAS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectQuickCinema(c)}
                    className={`px-3 py-2 rounded-[10px] border-2 border-ink text-left font-space font-bold text-xs transition-all ${
                      form.theatreName === c.name
                        ? 'bg-acid shadow-hard-xs'
                        : 'bg-paper hover:bg-acid/40 shadow-hard-xs'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Cinema Name Input */}
            <div>
              <label className="font-dela text-xs uppercase text-ink block mb-1">
                Theatre / Cinema Name:
              </label>
              <input
                type="text"
                value={form.theatreName}
                onChange={e => {
                  const val = e.target.value;
                  updateField('theatreName', val);
                  const lower = val.toLowerCase();
                  if (lower.includes('aaa')) {
                    updateField('bmsUrl', 'https://in.bookmyshow.com/cinemas/HYD/aaa-cinemas-ameerpet/buytickets/AAAC/20261217');
                  } else if (lower.includes('prasad')) {
                    updateField('bmsUrl', 'https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217');
                  } else if (lower.includes('amb')) {
                    updateField('bmsUrl', 'https://in.bookmyshow.com/cinemas/HYD/amb-cinemas-gachibowli/buytickets/AMBC/20261217');
                  } else if (lower.includes('pvr')) {
                    updateField('bmsUrl', 'https://in.bookmyshow.com/cinemas/HYD/pvr-nexus-mall-kukatpally/buytickets/PVND/20261217');
                  } else if (lower.includes('sudarshan')) {
                    updateField('bmsUrl', 'https://in.bookmyshow.com/cinemas/HYD/sudarshan-35mm-rtc-x-roads/buytickets/SUDX/20261217');
                  } else {
                    updateField('bmsUrl', '');
                  }
                }}
                placeholder="e.g. AAA Cinemas Ameerpet, Sudarshan 35MM, PVR"
                className="w-full px-4 py-3 bg-paper border-2 border-ink rounded-[12px] font-space text-sm font-bold text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-dela text-xs uppercase text-ink block mb-1">
                  Movie Name (Optional):
                </label>
                <input
                  type="text"
                  value={form.movieName}
                  onChange={e => updateField('movieName', e.target.value)}
                  placeholder="Enter title (or leave blank for any movie)"
                  className="w-full px-4 py-3 bg-paper border-2 border-ink rounded-[12px] font-space text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20"
                />
              </div>
              <div>
                <label className="font-dela text-xs uppercase text-ink block mb-1">
                  Target Date:
                </label>
                <input
                  type="text"
                  value={form.targetDate}
                  onChange={e => updateField('targetDate', e.target.value)}
                  placeholder="17 Dec 2026"
                  className="w-full px-4 py-3 bg-paper border-2 border-ink rounded-[12px] font-mono text-sm text-ink focus:outline-none focus:bg-acid/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* COMMON FIELDS: MOBILE & CHANNELS */}
        <div className="mt-8 pt-8 border-t-2 border-ink space-y-6">
          <div>
            <label className="font-dela text-sm uppercase text-ink flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-ink" />
              Your Mobile Number (For Instant Buzz):
            </label>
            <div className="flex gap-2">
              <span className="px-4 py-3.5 bg-acid border-2 border-ink rounded-[12px] font-mono font-bold text-sm text-ink shadow-hard-xs flex items-center">
                +91
              </span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={e => updateField('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="flex-1 px-4 py-3.5 bg-paper border-2 border-ink rounded-[12px] font-mono font-bold text-base text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20 shadow-hard-xs"
              />
            </div>
            <p className="font-mono text-[11px] text-ink/60 mt-1.5">
              The exact second a new show drops, we dispatch an alert with a direct BMS link.
            </p>
          </div>

          {/* Delivery Channel Selection */}
          <div>
            <label className="font-mono text-xs font-bold text-ink/70 uppercase block mb-2">
              Delivery Method:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'whatsapp', label: 'WhatsApp', desc: 'Clickable direct link' },
                { id: 'sms', label: 'SMS', desc: 'Offline immediate buzz' },
                { id: 'all', label: 'Both', desc: 'Maximum urgency' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateField('notificationMethod', opt.id)}
                  className={`p-3 rounded-[12px] border-2 border-ink text-left transition-all ${
                    form.notificationMethod === opt.id
                      ? 'bg-acid shadow-hard-sm'
                      : 'bg-paper hover:bg-acid/30 shadow-hard-xs'
                  }`}
                >
                  <div className="font-dela text-xs uppercase text-ink">{opt.label}</div>
                  <div className="font-mono text-[10px] text-ink/70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border-2 border-red-600 text-red-900 font-bold p-3 rounded-[10px] text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.phoneNumber}
            className="btn-hard w-full py-5 bg-ink text-acid font-dela text-base md:text-lg uppercase tracking-tight rounded-[14px] flex items-center justify-center gap-3 shadow-hard-lg hover:bg-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-acid" />
            ) : (
              <>
                <Zap className="w-5 h-5 fill-acid text-acid" />
                <span>ARM 24/7 DROP RADAR</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetAlert;
