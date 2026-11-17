import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Ticket, CheckCircle2 } from 'lucide-react';

function Home() {
  return (
    <div className="overflow-hidden min-h-[calc(100vh-120px)] flex flex-col justify-between">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 py-8 md:py-16 my-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT 7 COLUMNS */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-[1.5px] border-ink bg-white shadow-hard-xs">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                &gt;_ FOR CINEPHILES &amp; BLOCKBUSTER HUNTERS
              </span>
            </div>

            {/* Massive Display Title */}
            <div className="space-y-1">
              <h1 className="font-dela uppercase tracking-tighter text-ink text-6xl sm:text-7xl xl:text-[6.8rem] leading-[0.88] select-none">
                BOOK IT
              </h1>
              <h1 className="font-dela uppercase tracking-tighter text-ink text-6xl sm:text-7xl xl:text-[6.8rem] leading-[0.88] select-none">
                <span className="marker-highlight">OR DIE</span>
              </h1>
              <h1 className="font-dela uppercase tracking-tighter text-ink text-6xl sm:text-7xl xl:text-[6.8rem] leading-[0.88] select-none">
                TRYING.
              </h1>
            </div>

            {/* Subtitle */}
            <p className="font-space text-base md:text-lg text-ink font-medium max-w-lg leading-relaxed pt-2">
              Instant booking alarms for the terminally hyped. 24/7 BookMyShow radar, newly added multiplex show detection, and WhatsApp alerts that don't suck.
            </p>

            {/* Two CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/new-alert"
                className="btn-hard bg-ink text-paper font-space font-bold uppercase text-sm md:text-base px-8 py-4 rounded-[12px] flex items-center gap-2 border-2 border-ink shadow-hard hover:bg-acid hover:text-ink transition-all"
              >
                <span>GET THE DROP</span>
                <Zap className="w-4 h-4 fill-current" />
              </Link>

              <Link
                to="/dashboard"
                className="btn-hard bg-white text-ink font-space font-bold uppercase text-sm md:text-base px-8 py-4 rounded-[12px] border-2 border-ink shadow-hard hover:bg-[#F0ECE1] transition-all"
              >
                ACTIVE WATCHERS
              </Link>
            </div>

            {/* Trust points */}
            <div className="flex items-center gap-4 text-xs font-mono text-ink/80 pt-2">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-ink" /> 100% Free
              </span>
              <span>•</span>
              <span className="font-bold">
                Prasads, PVR, AMB &amp; Single Screens
              </span>
              <span>•</span>
              <span className="font-bold">
                WhatsApp / SMS Alerts
              </span>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS - CINEMA POSTER LIGHTBOX CARD */}
          <div className="lg:col-span-5 relative">
            
            {/* Dashed background offset frame */}
            <div className="absolute inset-0 border-2 border-dashed border-ink rounded-[28px] transform translate-x-3 -translate-y-3 pointer-events-none" />

            {/* Main Primary Card */}
            <div className="relative bg-[#12131A] border-2 border-ink rounded-[24px] overflow-hidden shadow-hard-lg group">
              
              {/* Photo Container */}
              <div className="relative h-[360px] sm:h-[420px] lg:h-[450px] w-full overflow-hidden bg-ink">
                <img
                  src="/cinema-posters.jpg"
                  alt="Cinema poster lightbox gallery"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-95"
                />
                
                {/* Vignette & bottom gradient fade into panel */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12131A] via-transparent to-black/30" />

                {/* Top Right Floating Badge */}
                <div className="absolute top-4 right-4 z-10 bg-white border-2 border-ink rounded-[14px] px-3.5 py-2 shadow-hard-sm flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[8px] bg-[#E8F8E5] border border-ink/20 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  </div>
                  <div className="text-left font-space leading-tight">
                    <div className="font-bold text-xs text-ink">Radar Live</div>
                    <div className="text-[10px] text-ink/70 font-mono">30s Scan Cycle</div>
                  </div>
                </div>
              </div>

              {/* Bottom Dark Metadata Panel */}
              <div className="bg-[#12131A] text-white p-5 md:p-6 border-t-2 border-ink">
                
                {/* Pill Edition Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 font-mono text-[10px] text-white/90 mb-3">
                  <span className="w-2 h-2 rounded-full bg-acid animate-pulse" />
                  <span className="font-bold tracking-wider">BLOCKBUSTER RADAR</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-dela text-2xl uppercase tracking-tight text-white leading-tight">
                      MULTIPLEX DROPS
                    </h3>
                    <p className="font-space text-xs text-white/60 mt-1">
                      Prasads PCX • PVR Inox • RTC X Roads
                    </p>
                  </div>

                  {/* Arrow CTA */}
                  <Link
                    to="/new-alert"
                    aria-label="Set alert"
                    className="w-12 h-12 bg-acid text-ink border-2 border-ink rounded-[12px] flex items-center justify-center hover:bg-white transition-all shadow-hard-xs shrink-0"
                  >
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MINIMAL FOOTER */}
      <footer className="border-t-2 border-ink py-4 bg-white/60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-ink/70 gap-2">
          <span>DROPCLOCK • 24/7 BOOKMYSHOW TICKET DROP ALARM</span>
          <span>FREE • OPEN SOURCE • NO BULL</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
