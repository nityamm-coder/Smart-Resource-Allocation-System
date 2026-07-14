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
      <div className="flex-grow bg-white border-4 border-black p-6 flex flex-col justify-between relative overflow-hidden min-h-[420px] shadow-neu-heavy rounded-none">
        
        {/* Soft Radar Sweep Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08] flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border-2 border-black relative animate-radar-sweep origin-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[150px] bg-gradient-to-t from-transparent to-black origin-bottom" style={{ transform: 'rotate(180deg)' }} />
          </div>
          <div className="absolute w-[200px] h-[200px] rounded-full border border-black" />
          <div className="absolute w-[100px] h-[100px] rounded-full border border-black" />
          {/* Radar grid coordinates */}
          <div className="absolute w-[300px] h-[1px] bg-black" />
          <div className="absolute h-[300px] w-[1px] bg-black" />
        </div>

        {/* Pulse nodes on the radar */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-error border-2 border-black rounded-full" />
          <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-black rounded-full" />
          <span className="absolute top-[35%] left-[27%] text-[9px] text-on-surface font-bold uppercase tracking-widest">Priya</span>

          <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-secondary-container border-2 border-black rounded-full" />
          <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-black rounded-full" />
          <span className="absolute bottom-[35%] right-[27%] text-[9px] text-on-surface font-bold uppercase tracking-widest">Rohan</span>
        </div>

        {/* Top Header */}
        <div className="text-center relative z-10 space-y-1.5 mt-2">
          <div className="w-12 h-12 border-4 border-black bg-tertiary-container text-on-tertiary-container flex items-center justify-center mx-auto mb-2 shadow-neu-sm rounded-none">
            <Cpu size={22} className={isSubmitting ? 'animate-spin' : ''} />
          </div>
          <h3 className="font-display font-extrabold text-base text-on-surface uppercase">AI Matchmaking Dispatch</h3>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto font-medium">
            Our AI analyzes the request context in real-time, grades emergency status, and routes it to nearby volunteers.
          </p>
        </div>

        {/* SVG Nodes Connection Graph */}
        <div className="my-6 relative z-10 flex items-center justify-center">
          <svg className="w-full max-w-[280px] h-16" viewBox="0 0 280 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Connection path: User -> AI */}
            <path
              d="M 32 32 L 140 32"
              stroke="#000000"
              strokeWidth={isSubmitting ? "4" : "2"}
              strokeDasharray={isSubmitting ? "6,6" : "0"}
              className={isSubmitting ? "animate-dash-line" : ""}
            />
            {/* Connection path: AI -> Volunteer */}
            <path
              d="M 140 32 L 248 32"
              stroke="#000000"
              strokeWidth={isSubmitting ? "4" : "2"}
              strokeDasharray={isSubmitting ? "6,6" : "0"}
              className={isSubmitting ? "animate-dash-line" : ""}
            />

            {/* Node 1: Victim */}
            <g transform="translate(12, 12)">
              <rect x="0" y="0" width="38" height="38" fill="#ffffff" stroke="#000000" strokeWidth="3" />
              <foreignObject x="7" y="7" width="24" height="24">
                <div className="w-full h-full flex items-center justify-center text-on-surface">
                  <User size={16} />
                </div>
              </foreignObject>
            </g>

            {/* Node 2: AI Processor */}
            <g transform="translate(120, 12)">
              <rect x="0" y="0" width="40" height="40" fill={isSubmitting ? "#45fd73" : "#ffffff"} stroke="#000000" strokeWidth="3" className={isSubmitting ? "animate-pulse" : ""} />
              <foreignObject x="10" y="10" width="20" height="20">
                <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                  🌱
                </div>
              </foreignObject>
            </g>

            {/* Node 3: Volunteer */}
            <g transform="translate(228, 12)">
              <rect x="0" y="0" width="38" height="38" fill="#ffffff" stroke="#000000" strokeWidth="3" />
              <foreignObject x="7" y="7" width="24" height="24">
                <div className="w-full h-full flex items-center justify-center text-primary">
                  <ShieldCheck size={16} />
                </div>
              </foreignObject>
            </g>
          </svg>
        </div>

        {/* Terminal Logger Console */}
        <div className="bg-inverse-surface text-primary-container border-4 border-black p-4 text-left relative z-10 font-mono shadow-inner rounded-none">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-black border-dashed">
            <span className="w-2.5 h-2.5 bg-primary-container rounded-full animate-pulse block"></span>
            <span className="text-[10px] font-bold text-primary-container uppercase tracking-widest">System Log Console</span>
          </div>
          
          <div className="space-y-1 text-[11px] h-[72px] overflow-y-auto scrollbar-thin">
            {terminalLogs.map((log, index) => (
              <div key={index} className="flex gap-1.5 items-start leading-normal">
                <span className="text-primary-container font-bold shrink-0">&gt;</span>
                <span className={
                  log.type === 'error' 
                    ? 'text-red-400' 
                    : log.type === 'warning' 
                    ? 'text-amber-400 font-bold' 
                    : log.type === 'success' 
                    ? 'text-primary-container font-bold uppercase' 
                    : 'text-white'
                }>
                  {log.text}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-0.5">
              <span className="text-primary-container font-bold shrink-0">&gt;</span>
              <span className="w-1.5 h-3 bg-primary-container animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* Bottom Link Button */}
        <div className="mt-4 text-center">
          <a
            href="tracking.html"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline decoration-2"
          >
            Go to Dedicated Tracking Portal →
          </a>
        </div>
      </div>
    </div>
  );
}

