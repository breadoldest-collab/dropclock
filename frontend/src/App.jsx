import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SetAlert from './pages/SetAlert';
import Navbar from './components/Navbar';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FDFBF7] text-[#09090B] font-space relative selection:bg-acid selection:text-ink">
        {/* Global SVG Noise Overlay */}
        <div className="noise-overlay" />

        {/* TV News Style Continuous Scrolling Ticker */}
        <div className="tv-ticker-wrap py-2">
          <div className="tv-ticker-content">
            {/* Segment 1 */}
            <div className="flex items-center gap-8 font-mono text-[11px] font-bold tracking-wider uppercase text-[#FDFBF7] pr-8">
              <span>DESIGN LOUD</span>
              <span>•</span>
              <span>CODE HARD</span>
              <span>•</span>
              <span>SHIP FASTER</span>
              <span>•</span>
              <span>NO REFUNDS ON VIBES</span>
              <span>•</span>
              <span>24/7 TICKET DROP ALARM</span>
              <span>•</span>
              <span>PRASADS MULTIPLEX (PRHN)</span>
              <span>•</span>
              <span>PVR INOX NEXUS</span>
              <span>•</span>
              <span>AMB CINEMAS GACHIBOWLI</span>
              <span>•</span>
              <span>RTC X ROADS SINGLE SCREENS</span>
              <span>•</span>
              <span>ZERO DELAY INSTANT BUZZ</span>
              <span>•</span>
            </div>

            {/* Segment 2 (Duplicate for continuous loop) */}
            <div className="flex items-center gap-8 font-mono text-[11px] font-bold tracking-wider uppercase text-[#FDFBF7] pr-8" aria-hidden="true">
              <span>DESIGN LOUD</span>
              <span>•</span>
              <span>CODE HARD</span>
              <span>•</span>
              <span>SHIP FASTER</span>
              <span>•</span>
              <span>NO REFUNDS ON VIBES</span>
              <span>•</span>
              <span>24/7 TICKET DROP ALARM</span>
              <span>•</span>
              <span>PRASADS MULTIPLEX (PRHN)</span>
              <span>•</span>
              <span>PVR INOX NEXUS</span>
              <span>•</span>
              <span>AMB CINEMAS GACHIBOWLI</span>
              <span>•</span>
              <span>RTC X ROADS SINGLE SCREENS</span>
              <span>•</span>
              <span>ZERO DELAY INSTANT BUZZ</span>
              <span>•</span>
            </div>
          </div>
        </div>

        {/* Sticky Header */}
        <Navbar />

        {/* Routes */}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-alert" element={<SetAlert />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
