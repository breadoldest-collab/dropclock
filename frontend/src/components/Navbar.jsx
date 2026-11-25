import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="px-4 pt-4 max-w-7xl mx-auto">
      <nav className="bg-white border-2 border-ink rounded-[16px] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-hard-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 group">
          <span className="font-dela text-2xl uppercase tracking-tighter text-ink">
            DROP
          </span>
          <span className="font-dela text-2xl uppercase tracking-tighter text-ink/30 group-hover:text-ink transition-colors">
            CLOCK
          </span>
        </Link>

        {/* Center Nav Links */}
        <div className="flex items-center gap-5 sm:gap-6 font-space text-xs font-bold tracking-wider uppercase text-ink">
          <Link 
            to="/" 
            className={`transition-colors ${isActive('/') ? 'text-ink underline underline-offset-4 decoration-2' : 'text-ink/70 hover:text-ink'}`}
          >
            Radar
          </Link>
          <Link 
            to="/dashboard" 
            className={`transition-colors ${isActive('/dashboard') ? 'text-ink underline underline-offset-4 decoration-2' : 'text-ink/70 hover:text-ink'}`}
          >
            Active Watchers
          </Link>
        </div>

        {/* Right CTA & Auth Area */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 bg-acid/30 border-2 border-ink px-3 py-2 rounded-[10px] font-mono text-xs font-bold text-ink shadow-hard-xs"
                title="Synced account across devices"
              >
                <User className="w-3.5 h-3.5" />
                <span>@{user?.username}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="p-2 bg-paper border-2 border-ink rounded-[10px] text-ink hover:bg-red-500 hover:text-paper transition-colors shadow-hard-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-paper text-ink font-space text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-[10px] border-2 border-ink hover:bg-acid transition-all shadow-hard-xs"
            >
              LOGIN / SYNC
            </Link>
          )}

          <Link
            to="/new-alert"
            className="bg-ink text-paper font-space text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-[10px] border-2 border-ink hover:bg-acid hover:text-ink transition-all shadow-hard-xs"
          >
            GET THE DROP
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
