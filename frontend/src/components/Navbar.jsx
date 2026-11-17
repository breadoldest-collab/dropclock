import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="px-4 pt-4 max-w-7xl mx-auto">
      <nav className="bg-white border-2 border-ink rounded-[16px] px-6 py-3.5 flex items-center justify-between shadow-hard-sm">
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
        <div className="flex items-center gap-6 font-space text-xs font-bold tracking-wider uppercase text-ink">
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

        {/* Right CTA Area */}
        <div className="flex items-center gap-3">
          <Link
            to="/new-alert"
            className="bg-ink text-paper font-space text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-[10px] border-2 border-ink hover:bg-acid hover:text-ink transition-all shadow-hard-xs"
          >
            GET THE DROP
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
