import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, User, ArrowRight, Loader2, Eye, EyeOff, Smartphone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CITIES = ['hyderabad', 'bengaluru', 'mumbai', 'delhi', 'chennai', 'vijayawada', 'visakhapatnam'];

function Auth({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Optional notification defaults on register
  const [defaultEmail, setDefaultEmail] = useState('');
  const [defaultPhone, setDefaultPhone] = useState('');
  const [defaultCity, setDefaultCity] = useState('hyderabad');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  const isRegister = mode === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({
          username: username.trim(),
          password,
          defaultEmail: defaultEmail.trim(),
          defaultPhone: defaultPhone.trim(),
          defaultCity,
        });
      } else {
        await login(username.trim(), password);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-paper border-2 border-ink rounded-[24px] p-6 md:p-8 shadow-hard-lg">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-acid border-2 border-ink px-3 py-1 rounded-full shadow-hard-xs mb-4 transform -rotate-1">
          <ShieldCheck className="w-3.5 h-3.5 text-ink" />
          <span className="font-mono text-[11px] font-bold uppercase text-ink">
            CROSS-DEVICE CLOCK SYNC
          </span>
        </div>

        <h1 className="font-dela text-3xl md:text-4xl uppercase tracking-tighter text-ink">
          {isRegister ? 'CREATE CLOCK VAULT' : 'LOCATE YOUR CLOCKS'}
        </h1>
        <p className="font-space text-sm text-ink/75 font-medium mt-2">
          {isRegister
            ? 'Set a username & password so you can access and manage your ticket alarms from any phone or laptop.'
            : 'Sign in with your username and password to load your saved DropClock alarms on this device.'}
        </p>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F0ECE1] border-2 border-ink rounded-[12px] mt-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-2.5 rounded-[8px] font-space text-xs font-bold uppercase tracking-wider transition-all ${
              !isRegister ? 'bg-ink text-acid shadow-hard-xs' : 'text-ink/70 hover:text-ink'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-2.5 rounded-[8px] font-space text-xs font-bold uppercase tracking-wider transition-all ${
              isRegister ? 'bg-ink text-acid shadow-hard-xs' : 'text-ink/70 hover:text-ink'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mt-5 p-3.5 bg-red-100 border-2 border-ink rounded-[12px] font-mono text-xs font-bold text-red-900 shadow-hard-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase text-ink mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-ink/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="e.g. cinephile99"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-ink rounded-[12px] font-space text-sm font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink shadow-hard-xs"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase text-ink mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Min 4 characters"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="w-full pl-10 pr-11 py-3 bg-white border-2 border-ink rounded-[12px] font-space text-sm font-semibold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink shadow-hard-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Optional Auto-Fill Defaults when Creating Account */}
          {isRegister && (
            <div className="pt-2 border-t-2 border-dashed border-ink/20 space-y-3">
              <p className="font-mono text-[11px] font-bold uppercase text-ink/70">
                Optional: Save Defaults for 1-Click Alarms
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase text-ink/80 mb-1">
                    Default Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-ink/50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={defaultEmail}
                      onChange={(e) => setDefaultEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-ink rounded-[10px] font-space text-xs font-semibold text-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase text-ink/80 mb-1">
                    WhatsApp / Phone
                  </label>
                  <div className="relative">
                    <Smartphone className="w-3.5 h-3.5 text-ink/50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={defaultPhone}
                      onChange={(e) => setDefaultPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-ink rounded-[10px] font-space text-xs font-semibold text-ink focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-bold uppercase text-ink/80 mb-1">
                  Default City
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-ink/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-ink rounded-[10px] font-space text-xs font-bold uppercase text-ink focus:outline-none"
                  >
                    {CITIES.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-hard w-full bg-acid text-ink font-space font-bold uppercase text-sm py-3.5 px-6 rounded-[12px] border-2 border-ink shadow-hard flex items-center justify-center gap-2 hover:bg-ink hover:text-acid disabled:opacity-60 transition-all mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isRegister ? 'Creating Vault...' : 'Syncing Clocks...'}</span>
              </>
            ) : (
              <>
                <span>{isRegister ? 'Create Account & Sync' : 'Sign In & Load Clocks'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-ink/15 text-center font-mono text-xs text-ink/70">
          Prefer not to sign in right now?{' '}
          <Link to="/new-alert" className="font-bold text-ink underline underline-offset-2 hover:text-ink/70">
            Set a quick guest alarm
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Auth;
