import React, { useState, useEffect } from 'react';
import { Search, Loader2, Cpu, User, ShieldCheck, Terminal } from 'lucide-react';

export default function MatchmakingVisualizer({ isSubmitting }) {
  const [trackId, setTrackId] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'info', text: 'Initializing neural matchmaking engine...' },
    { type: 'info', text: 'Geographic coordinate network: Connected' },
    { type: 'success', text: 'System status: STANDBY - Awaiting emergency request...' }
  ]);

  // Effect to append logs when submission states change
  useEffect(() => {
    if (isSubmitting) {
      setTerminalLogs([
        { type: 'info', text: 'Analyzing request description with Gemini AI...' },
        { type: 'info', text: 'Categorizing emergency priority queue...' },
        { type: 'warning', text: 'Scanning local zone for active volunteers...' },
        { type: 'success', text: 'Grid connection established. Dispatching payload...' }
      ]);
    } else {
      const timer = setTimeout(() => {
        setTerminalLogs([
          { type: 'info', text: 'Connecting to geographic grid...' },
          { type: 'info', text: 'Analyzing local volunteer hubs...' },
          { type: 'success', text: 'Ready. Standby for user input...' }
        ]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSubmitting]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackId.trim()) {
      window.location.href = `tracking.html?id=${trackId.trim()}`;
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Search / Track Box */}
      <div className="bg-white border-4 border-black p-5 shadow-neu rounded-none">
        <h3 className="font-display font-bold text-sm text-on-surface mb-4 flex items-center gap-2 uppercase">
          <Search size={15} />
          Track Existing Request
        </h3>
        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Request ID..."
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="flex-grow border-4 border-black px-4 py-2 text-sm placeholder-on-surface-variant bg-surface rounded-none focus:outline-none focus:ring-4 focus:ring-primary-container"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 border-4 border-black bg-secondary-container text-on-secondary-container font-bold uppercase transition-all shadow-neu-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-sm shrink-0 rounded-none"
          >
            Track
          </button>
        </form>
      </div>

      {/* Radar Sweep & Connection Visualizer */}
      <div className="flex-grow flex flex-col relative min-h-[460px]">
        {/* Header Bar */}
        <div className="bg-[#c6ff00] border-4 border-black p-4 flex justify-between items-center relative z-10">
          <h3 className="font-display font-extrabold text-sm text-black uppercase tracking-wider">
            AI Matchmaking Dispatch
          </h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex-grow bg-white border-x-4 border-b-4 border-black p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-neu-heavy">
          
          {/* Radar Anim Container */}
          <div className="relative w-44 h-44 rounded-full border-4 border-black bg-[#0d2116] flex items-center justify-center my-4 overflow-hidden shadow-[0_0_20px_rgba(57,255,20,0.15)]">
            {/* Sector sweep */}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#39ff14]/20 via-transparent to-transparent animate-spin" 
              style={{ animationDuration: '4s' }}
            />
            {/* Concentric rings */}
            <div className="absolute w-36 h-36 rounded-full border border-[#39ff14]/30 animate-pulse" style={{ animationDuration: '2s' }} />
            <div className="absolute w-26 h-26 rounded-full border border-[#39ff14]/40" />
            <div className="absolute w-16 h-16 rounded-full border border-[#39ff14]/50" />
            <div className="absolute w-6 h-6 rounded-full border border-[#39ff14]/70 bg-[#39ff14]/10" />
            
            {/* Crosshairs */}
            <div className="absolute w-36 h-[1px] bg-[#39ff14]/25" />
            <div className="absolute h-36 w-[1px] bg-[#39ff14]/25" />

            {/* Simulated Blinking Targets */}
            <div className="absolute top-[30%] left-[25%]">
              <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-650 border border-black shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            </div>
            <div className="absolute bottom-[35%] right-[28%]">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-sky-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500 border border-black shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant max-w-xs text-center leading-relaxed mb-6 font-bold relative z-10">
            Our AI analyzes the request context in real-time, grades emergency status, and routes it to nearby volunteers.
          </p>

          {/* CRT Terminal Log Console */}
          <div className="w-full bg-[#050f08] border-4 border-black rounded-3xl p-4 text-left font-mono relative overflow-hidden shadow-neu-sm">
            {/* CRT Screen scanline effect overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] z-10" />
            {/* Glow border overlay matching CRT green */}
            <div className="absolute inset-0 border-2 border-[#39ff14]/40 rounded-3xl pointer-events-none" />
            
            <div className="space-y-1.5 text-[11px] text-[#39ff14] font-mono relative z-10">
              {terminalLogs.map((log, index) => (
                <div key={index} className="flex gap-1.5 items-start leading-relaxed">
                  <span className="text-[#39ff14] font-bold shrink-0">&gt;</span>
                  <span>{log.text}</span>
                </div>
              ))}
              <div className="flex items-center gap-0.5">
                <span className="text-[#39ff14] font-bold shrink-0">&gt;</span>
                <span className="w-1.5 h-3 bg-[#39ff14] animate-pulse"></span>
              </div>
            </div>
          </div>

          {/* Bottom Link Button */}
          <div className="mt-4 text-center">
            <a
              href="tracking.html"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline decoration-2 transition-colors"
            >
              Go to Dedicated Tracking Portal →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

