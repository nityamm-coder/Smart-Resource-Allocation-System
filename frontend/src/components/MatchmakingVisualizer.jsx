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
      <div className="glass-card glass-card-darker rounded-3xl p-5 shadow-sm">
        <h3 className="font-display font-extrabold text-sm text-slate-800 mb-4 flex items-center gap-2">
          <Search size={15} className="text-emerald-600" />
          Track Existing Request
        </h3>
        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Request ID..."
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="flex-grow rounded-xl glass-input px-4 py-2 text-sm placeholder-slate-405"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-650 text-white hover:shadow-sm text-sm transition-all duration-300 flex items-center gap-1.5 shrink-0"
          >
            Track
          </button>
        </form>
      </div>

      {/* Radar Sweep & Connection Visualizer */}
      <div className="flex-grow glass-card rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden min-h-[420px]">
        
        {/* Soft Radar Sweep Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08] flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border border-emerald-600 relative animate-radar-sweep origin-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[150px] bg-gradient-to-t from-transparent to-emerald-600 origin-bottom" style={{ transform: 'rotate(180deg)' }} />
          </div>
          <div className="absolute w-[200px] h-[200px] rounded-full border border-emerald-600/40" />
          <div className="absolute w-[100px] h-[100px] rounded-full border border-emerald-600/20" />
          {/* Radar grid coordinates */}
          <div className="absolute w-[300px] h-[1px] bg-emerald-600/20" />
          <div className="absolute h-[300px] w-[1px] bg-emerald-600/20" />
        </div>

        {/* Pulse nodes on the radar */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-emerald-600 rounded-full animate-ping-slow" />
          <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
          <span className="absolute top-[35%] left-[27%] text-[7px] text-slate-400 font-bold uppercase tracking-widest">Priya</span>

          <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-teal-600 rounded-full animate-ping-slow" />
          <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-teal-600 rounded-full" />
          <span className="absolute bottom-[35%] right-[27%] text-[7px] text-slate-400 font-bold uppercase tracking-widest">Rohan</span>
        </div>

        {/* Top Header */}
        <div className="text-center relative z-10 space-y-1.5 mt-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Cpu size={22} className={isSubmitting ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
          </div>
          <h3 className="font-display font-extrabold text-base text-slate-800">AI Matchmaking Dispatch</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Our AI analyses the request context in real-time, grades emergency status, and routes it to nearby volunteers.
          </p>
        </div>

        {/* SVG Nodes Connection Graph */}
        <div className="my-6 relative z-10 flex items-center justify-center">
          <svg className="w-full max-w-[280px] h-16" viewBox="0 0 280 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Connection path: User -> AI */}
            <path
              d="M 32 32 L 140 32"
              stroke={isSubmitting ? "#059669" : "rgba(45,90,39,0.12)"}
              strokeWidth="2"
              className={isSubmitting ? "animate-dash-line" : ""}
            />
            {/* Connection path: AI -> Volunteer */}
            <path
              d="M 140 32 L 248 32"
              stroke={isSubmitting ? "#059669" : "rgba(45,90,39,0.12)"}
              strokeWidth="2"
              className={isSubmitting ? "animate-dash-line" : ""}
            />

            {/* Node 1: Victim */}
            <g transform="translate(12, 12)">
              <circle cx="20" cy="20" r="19" fill="#ffffff" stroke="rgba(45,90,39,0.15)" strokeWidth="2" />
              <foreignObject x="8" y="8" width="24" height="24">
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User size={14} />
                </div>
              </foreignObject>
            </g>

            {/* Node 2: AI Processor */}
            <g transform="translate(120, 12)">
              <circle cx="20" cy="20" r="20" fill={isSubmitting ? "rgba(16, 185, 129, 0.1)" : "#ffffff"} stroke={isSubmitting ? "#10B981" : "rgba(45,90,39,0.2)"} strokeWidth="2" className={isSubmitting ? "glow-ring animate-pulse" : ""} />
              <foreignObject x="10" y="10" width="20" height="20">
                <div className="w-full h-full flex items-center justify-center text-xl">
                  🌱
                </div>
              </foreignObject>
            </g>

            {/* Node 3: Volunteer */}
            <g transform="translate(228, 12)">
              <circle cx="20" cy="20" r="19" fill="#ffffff" stroke={isSubmitting ? "#10B981" : "rgba(45,90,39,0.15)"} strokeWidth="2" />
              <foreignObject x="8" y="8" width="24" height="24">
                <div className={isSubmitting ? "w-full h-full flex items-center justify-center text-emerald-600" : "w-full h-full flex items-center justify-center text-slate-500"}>
                  <ShieldCheck size={15} />
                </div>
              </foreignObject>
            </g>
          </svg>
        </div>

        {/* Terminal Logger Console */}
        <div className="bg-[#080E0B] border border-emerald-950/20 rounded-2xl p-4 text-left relative z-10 font-mono shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5">
            <Terminal size={12} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">System Log Console</span>
          </div>
          
          <div className="space-y-1 text-[11px] h-[72px] overflow-y-auto scrollbar-thin">
            {terminalLogs.map((log, index) => (
              <div key={index} className="flex gap-1.5 items-start leading-normal">
                <span className="text-emerald-500 font-bold shrink-0">&gt;</span>
                <span className={
                  log.type === 'error' 
                    ? 'text-red-400' 
                    : log.type === 'warning' 
                    ? 'text-amber-400' 
                    : log.type === 'success' 
                    ? 'text-emerald-400 font-semibold text-neon-green' 
                    : 'text-slate-400'
                }>
                  {log.text}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-0.5">
              <span className="text-emerald-500 font-bold shrink-0">&gt;</span>
              <span className="w-1.5 h-3 bg-emerald-400 typewriter-cursor"></span>
            </div>
          </div>
        </div>

        {/* Bottom Link Button */}
        <div className="mt-4 text-center">
          <a
            href="tracking.html"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 transition-all hover:underline"
          >
            Go to Dedicated Tracking Portal →
          </a>
        </div>
      </div>
    </div>
  );
}
