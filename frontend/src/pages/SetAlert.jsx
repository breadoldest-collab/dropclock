import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Film, MapPin, Building2, Hash, ArrowRight, 
  Loader2, CheckCircle2, Phone, Mail, Link2, Calendar, Sparkles, PlusCircle, Zap, Search 
} from 'lucide-react';
import api from '../api/client';

const POPULAR_CINEMAS = [
  { name: 'AAA Cinemas (Ameerpet)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/hyderabad/aaa-cinemas-ameerpet/ACAS' },
  { name: 'PVR: Inorbit Mall (Cyberabad)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/pvr-inorbit-cyberabad/PVIC' },
  { name: 'Prasads Multiplex (Necklace Road)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/hyderabad/prasads-multiplex-hyderabad/PRHN' },
  { name: 'AMB Cinemas (Gachibowli)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/amb-cinemas-gachibowli/AMBG' },
  { name: 'INOX: GVK One (Banjara Hills)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/inox-gvk-one-mall-banjara-hills-hyderabad/IGVK' },
  { name: 'ALLU Cinemas (Kokapet)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/hyderabad/allu-cinemas-kokapet/ALCO' },
  { name: 'PVR: Nexus Mall (Kukatpally)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/pvr-nexus-mall-kukatpally-hyderabad/PVNK' },
  { name: 'Sudarshan 35MM (RTC X Roads)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/sudarshan-35mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/BMSH/2485' },
  { name: 'AVD Cinemas (Mahbubnagar)', city: 'hyderabad', url: 'https://in.bookmyshow.com/cinemas/avd-cinemas-mahbubnagar/AVDM' },
];

const formatCinemaName = (raw) => {
  if (!raw) return '';
  return raw.trim().replace(/\b[a-z]/g, l => l.toUpperCase());
};

const getUpcomingDates = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayLabel = i === 0 ? 'TODAY' : i === 1 ? 'TOM' : days[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthStr = months[d.getMonth()];
    const year = d.getFullYear();
    return {
      label: dayLabel,
      dayNum: dateNum,
      month: monthStr,
      displayDate: `${dateNum} ${monthStr} ${year}`,
      bmsDateSlug: `${year}${String(d.getMonth() + 1).padStart(2, '0')}${dateNum}`,
      isoDate: `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${dateNum}`,
    };
  });
};

const UPCOMING_DATES = getUpcomingDates();

function SetAlert() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('url'); // 'url' or 'manual'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    bmsUrl: '',
    movieName: '',
    targetDate: UPCOMING_DATES[0].displayDate,
    isoDate: UPCOMING_DATES[0].isoDate,
    city: 'hyderabad',
    theatreName: '',
    email: '',
    phoneNumber: '',
    notificationMethod: 'email',
    watchType: 'new_shows',
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [theatreLocked, setTheatreLocked] = useState(false);

  useEffect(() => {
    const val = (mode === 'url' ? form.bmsUrl : form.theatreName || '').trim();
    if (val.length < 2 || val.startsWith('http')) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/theatres/suggest?q=${encodeURIComponent(val)}&limit=25`);
        setSuggestions(data.suggestions || []);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [form.bmsUrl, form.theatreName, mode]);

  const selectSuggestion = (s) => {
    setForm(prev => ({
      ...prev,
      theatreName: s.theatreName,
      city: s.city || prev.city,
      bmsUrl: s.bmsUrl || '',
    }));
    setTheatreLocked(true);
    setSuggestions([]);
  };

  const handleDateSelect = (displayDate, bmsDateSlug, isoDate) => {
    setForm(prev => {
      let updatedUrl = prev.bmsUrl;
      if (updatedUrl && bmsDateSlug) {
        updatedUrl = updatedUrl.replace(/\/(\d{8})(\/?)$/, `/${bmsDateSlug}$2`);
      }
      return {
        ...prev,
        targetDate: displayDate,
        isoDate: isoDate || prev.isoDate,
        bmsUrl: updatedUrl,
      };
    });
  };

  const handleCalendarChange = (isoVal) => {
    if (!isoVal) return;
    const [year, month, day] = isoVal.split('-');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthName = months[parseInt(month, 10) - 1] || month;
    const displayDate = `${day} ${monthName} ${year}`;
    const bmsDateSlug = `${year}${month}${day}`;
    handleDateSelect(displayDate, bmsDateSlug, isoVal);
  };

  const handleUrlChange = (val) => {
    const trimmed = (val || '').trim();
    updateField('bmsUrl', val);

    if (!trimmed) {
      updateField('theatreName', '');
      return;
    }

    if (trimmed.startsWith('http') || trimmed.includes('bookmyshow.com')) {
      const match = trimmed.match(/\/cinemas\/([^/]+)\/([^/]+)\/buytickets\/([^/]+)\/(\d{8})/i);
      if (match) {
        const citySlug = match[1].toLowerCase();
        const rawTheatre = match[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const dateStr = match[4];
        const y = dateStr.slice(0, 4);
        const m = dateStr.slice(4, 6);
        const d = dateStr.slice(6, 8);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthName = months[parseInt(m, 10) - 1] || m;
        const formattedDate = `${d} ${monthName} ${y}`;
        const iso = `${y}-${m}-${d}`;

        setForm(prev => ({
          ...prev,
          bmsUrl: val,
          city: citySlug,
          theatreName: formatCinemaName(rawTheatre) || rawTheatre,
          targetDate: formattedDate,
          isoDate: iso,
        }));
        setTheatreLocked(true);
      }
    } else {
      // User typed cinema name like "aaa cinemas" or "Prasads"
      const formatted = formatCinemaName(trimmed) || trimmed;
      setForm(prev => ({
        ...prev,
        bmsUrl: val,
        theatreName: formatted,
      }));
      setTheatreLocked(false);
    }
  };

  const selectQuickCinema = (cinema) => {
    handleUrlChange(cinema.url);
    setForm(prev => ({
      ...prev,
      theatreName: cinema.name,
      city: cinema.city,
    }));
    setTheatreLocked(true);
  };

  const handleSubmit = async () => {
    const needsEmail = form.notificationMethod === 'email' || form.notificationMethod === 'all';
    const needsPhone = form.notificationMethod === 'whatsapp' || form.notificationMethod === 'sms';

    if (needsEmail && (!form.email || !form.email.includes('@'))) {
      setError('Please enter a valid email address for instant drop alerts.');
      return;
    }

    if (needsPhone && !form.phoneNumber) {
      setError('Please provide your 10-digit mobile number.');
      return;
    }

    if (!form.email && !form.phoneNumber) {
      setError('Please enter your email address or mobile number.');
      return;
    }

    if (mode === 'url' && !form.bmsUrl) {
      setError('Please enter a BookMyShow URL or cinema name.');
      return;
    }

    setLoading(true);
    setError('');

    const rawUrlInput = (form.bmsUrl || '').trim();
    const isDirectUrl = rawUrlInput.startsWith('http://') || rawUrlInput.startsWith('https://');
    const cleanTheatre = (form.theatreName && form.theatreName !== 'Selected Multiplex')
      ? form.theatreName.trim()
      : (!isDirectUrl ? rawUrlInput : '');

    try {
      const { data } = await api.post('/api/alerts', {
        bmsUrl: isDirectUrl ? rawUrlInput : '',
        movieName: form.movieName,
        eventCode: 'UNKNOWN',
        city: form.city,
        theatreName: cleanTheatre,
        targetDate: form.targetDate,
        watchType: form.watchType,
        email: form.email ? form.email.trim() : null,
        phoneNumber: form.phoneNumber || null,
        notificationMethod: form.notificationMethod,
      });
      const saved = data?.alert;
      setForm(prev => ({
        ...prev,
        theatreName: saved?.theatreName || cleanTheatre,
        bmsUrl: saved?.bmsUrl || prev.bmsUrl,
      }));
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize alarm. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const dispatchSummary = [
      form.email ? form.email : null,
      form.phoneNumber ? `+91 ${form.phoneNumber}` : null,
    ].filter(Boolean).join(' • ');

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
            <div className="flex justify-between pt-2 gap-4">
              <span className="text-acid uppercase shrink-0">DISPATCH TO</span>
              <span className="text-acid font-bold text-right break-all">{dispatchSummary} ({form.notificationMethod.toUpperCase()})</span>
            </div>
          </div>

          <p className="font-space text-sm text-ink/80 mb-8">
            A confirmation has been dispatched. The instant BookMyShow adds a new showtime (e.g. Screen 6 PCX or midnight shows), you will receive an immediate alert with a direct booking deep-link.
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

            {/* URL or Cinema Input */}
            <div>
              <label className="font-dela text-sm uppercase text-ink block mb-2">
                BookMyShow Cinema URL or Multiplex Name:
              </label>
              <input
                type="text"
                value={form.bmsUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="Paste BookMyShow link or type e.g. AAA Cinemas, Prasads, PVR..."
                className="w-full px-4 py-3.5 bg-paper border-2 border-ink rounded-[12px] font-mono text-xs md:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20 focus:border-ink shadow-hard-xs"
              />
              <p className="font-mono text-[11px] text-ink/60 mt-1.5">
                Paste a BookMyShow URL or simply type your cinema name.
              </p>

              {/* Live Search Loading Indicator */}
              {searching && suggestions.length === 0 && (
                <div className="bg-paper border border-ink/40 rounded-[10px] px-3 py-2 mt-2 flex items-center gap-2 font-mono text-[11px] text-ink/70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ink" />
                  <span>Scanning BookMyShow cinema directory...</span>
                </div>
              )}

              {/* Live AI / Database Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-paper border-2 border-ink rounded-[14px] p-2 mt-2 shadow-hard-xs space-y-1">
                  <div className="font-mono text-[10px] text-ink/70 font-bold uppercase px-2 py-1.5 flex items-center justify-between border-b border-ink/10 mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-ink" />
                      <span>Recognized Theatres (Tap to Lock):</span>
                    </span>
                    <span className="text-[9px] bg-acid px-1.5 py-0.5 rounded border border-ink font-bold">
                      {suggestions.length} MATCH{suggestions.length > 1 ? 'ES' : ''} {suggestions.length > 4 ? '• SCROLL FOR MORE' : ''}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left px-3 py-2 bg-paper hover:bg-acid border border-transparent hover:border-ink rounded-[10px] font-space text-xs font-bold text-ink transition-all flex items-center justify-between shadow-none hover:shadow-hard-xs"
                      >
                        <span className="truncate pr-2">{s.theatreName}</span>
                        <span className="font-mono text-[10px] uppercase text-ink/70 bg-paper/80 px-2 py-0.5 rounded border border-ink/20 shrink-0">
                          {s.locality || s.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detected Card */}
            {theatreLocked && form.theatreName && (
              <div className="bg-acid/30 border-2 border-ink rounded-[14px] p-4 font-mono text-xs space-y-1 shadow-hard-xs">
                <div className="text-[10px] text-ink/70 font-bold uppercase flex items-center justify-between">
                  <span>TARGET RADAR LOCKED:</span>
                  <span className="text-[9px] bg-ink text-acid px-1.5 py-0.5 rounded font-mono font-bold">LOCKED</span>
                </div>
                <div className="font-bold text-ink text-sm">{form.theatreName}</div>
                <div className="text-ink/80">Date: {form.targetDate} • City: {form.city.toUpperCase()}</div>
              </div>
            )}

            {/* BMS-STYLE DATE SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-dela text-xs uppercase text-ink flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ink" />
                  Target Booking Date:
                </label>
                {form.targetDate && (
                  <span className="bg-acid px-2.5 py-0.5 border border-ink rounded font-mono text-[11px] font-bold text-ink shadow-hard-xs">
                    {form.targetDate}
                  </span>
                )}
              </div>

              {/* Day Pills Bar */}
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                {UPCOMING_DATES.map((item, idx) => {
                  const isSelected = form.targetDate === item.displayDate;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateSelect(item.displayDate, item.bmsDateSlug, item.isoDate)}
                      className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-2.5 rounded-[12px] border-2 border-ink text-center transition-all ${
                        isSelected 
                          ? 'bg-acid shadow-hard-xs scale-[1.03] font-bold' 
                          : 'bg-paper hover:bg-acid/30 shadow-hard-xs'
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold text-ink/70 uppercase">
                        {item.label}
                      </span>
                      <span className="font-dela text-base text-ink leading-tight my-0.5">
                        {item.dayNum}
                      </span>
                      <span className="font-mono text-[9px] text-ink font-bold uppercase">
                        {item.month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Input for Any Future Release */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink/70 font-bold uppercase shrink-0">
                  Or Pick Calendar Date:
                </span>
                <input
                  type="date"
                  value={form.isoDate || ''}
                  onChange={e => handleCalendarChange(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-paper border-2 border-ink rounded-[10px] font-mono text-xs font-bold text-ink shadow-hard-xs focus:outline-none focus:bg-acid/20 cursor-pointer"
                />
              </div>
            </div>

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
                  updateField('theatreName', e.target.value);
                  updateField('bmsUrl', '');
                }}
                placeholder="e.g. AAA Cinemas Ameerpet, Sudarshan 35MM, PVR, Devi 70MM..."
                className="w-full px-4 py-3 bg-paper border-2 border-ink rounded-[12px] font-space text-sm font-bold text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20"
              />

              {/* Live Search Loading Indicator */}
              {searching && suggestions.length === 0 && (
                <div className="bg-paper border border-ink/40 rounded-[10px] px-3 py-2 mt-2 flex items-center gap-2 font-mono text-[11px] text-ink/70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ink" />
                  <span>Scanning BookMyShow cinema directory...</span>
                </div>
              )}

              {/* Live AI / Database Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-paper border-2 border-ink rounded-[14px] p-2 mt-2 shadow-hard-xs space-y-1">
                  <div className="font-mono text-[10px] text-ink/70 font-bold uppercase px-2 py-1.5 flex items-center justify-between border-b border-ink/10 mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-ink" />
                      <span>Recognized Theatres (Tap to Lock):</span>
                    </span>
                    <span className="text-[9px] bg-acid px-1.5 py-0.5 rounded border border-ink font-bold">
                      {suggestions.length} MATCH{suggestions.length > 1 ? 'ES' : ''} {suggestions.length > 4 ? '• SCROLL FOR MORE' : ''}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left px-3 py-2 bg-paper hover:bg-acid border border-transparent hover:border-ink rounded-[10px] font-space text-xs font-bold text-ink transition-all flex items-center justify-between shadow-none hover:shadow-hard-xs"
                      >
                        <span className="truncate pr-2">{s.theatreName}</span>
                        <span className="font-mono text-[10px] uppercase text-ink/70 bg-paper/80 px-2 py-0.5 rounded border border-ink/20 shrink-0">
                          {s.locality || s.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

            {/* BMS-STYLE DATE SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-dela text-xs uppercase text-ink flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ink" />
                  Target Booking Date:
                </label>
                {form.targetDate && (
                  <span className="bg-acid px-2.5 py-0.5 border border-ink rounded font-mono text-[11px] font-bold text-ink shadow-hard-xs">
                    {form.targetDate}
                  </span>
                )}
              </div>

              {/* Day Pills Bar */}
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                {UPCOMING_DATES.map((item, idx) => {
                  const isSelected = form.targetDate === item.displayDate;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateSelect(item.displayDate, item.bmsDateSlug, item.isoDate)}
                      className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-2.5 rounded-[12px] border-2 border-ink text-center transition-all ${
                        isSelected 
                          ? 'bg-acid shadow-hard-xs scale-[1.03] font-bold' 
                          : 'bg-paper hover:bg-acid/30 shadow-hard-xs'
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold text-ink/70 uppercase">
                        {item.label}
                      </span>
                      <span className="font-dela text-base text-ink leading-tight my-0.5">
                        {item.dayNum}
                      </span>
                      <span className="font-mono text-[9px] text-ink font-bold uppercase">
                        {item.month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Input for Any Future Release */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink/70 font-bold uppercase shrink-0">
                  Or Pick Calendar Date:
                </span>
                <input
                  type="date"
                  value={form.isoDate || ''}
                  onChange={e => handleCalendarChange(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-paper border-2 border-ink rounded-[10px] font-mono text-xs font-bold text-ink shadow-hard-xs focus:outline-none focus:bg-acid/20 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* COMMON FIELDS: CHANNELS, EMAIL & MOBILE */}
        <div className="mt-8 pt-8 border-t-2 border-ink space-y-6">
          {/* Delivery Channel Selection */}
          <div>
            <label className="font-mono text-xs font-bold text-ink/70 uppercase block mb-2">
              Delivery Method:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'email', label: 'Email (Free)', desc: 'Works for anyone' },
                { id: 'whatsapp', label: 'WhatsApp', desc: 'Twilio mobile buzz' },
                { id: 'all', label: 'Both', desc: 'Email + WhatsApp' },
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

          {/* Email Address Input (Brevo Free Transactional Email) */}
          {(form.notificationMethod === 'email' || form.notificationMethod === 'all') && (
            <div>
              <label className="font-dela text-sm uppercase text-ink flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-ink" />
                Your Email Address (Instant Drop Link):
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-4 py-3.5 bg-paper border-2 border-ink rounded-[12px] font-mono font-bold text-base text-ink placeholder:text-ink/40 focus:outline-none focus:bg-acid/20 shadow-hard-xs"
              />
              <p className="font-mono text-[11px] text-ink/60 mt-1.5">
                Works for any email address worldwide with a clickable BookMyShow deep-link.
              </p>
            </div>
          )}

          {/* Mobile Number Input (WhatsApp / Both) */}
          {(form.notificationMethod === 'whatsapp' || form.notificationMethod === 'all') && (
            <div>
              <label className="font-dela text-sm uppercase text-ink flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-ink" />
                Your Mobile Number (WhatsApp):
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
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border-2 border-red-600 text-red-900 font-bold p-3 rounded-[10px] text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (form.notificationMethod === 'email' && !form.email.includes('@')) ||
              (form.notificationMethod === 'whatsapp' && !form.phoneNumber) ||
              (form.notificationMethod === 'all' && !form.email.includes('@') && !form.phoneNumber)
            }
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
