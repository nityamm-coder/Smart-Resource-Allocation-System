import React, { useState, useEffect } from 'react';
import { Search, Loader2, Cpu, User, ShieldCheck } from 'lucide-react';

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
      // Default logs
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
      <div className="bg-white border border-nature-borderSage rounded-2xl p-5 shadow-nature">
        <h3 className="font-display font-bold text-base text-nature-text mb-3 flex items-center gap-2">
          <Search size={16} className="text-nature-leaf" />
          Track Existing Request
        </h3>
        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Request ID..."
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="flex-grow rounded-xl border border-nature-borderSage bg-nature-bg/30 text-nature-text px-4 py-2 text-sm focus:outline-none focus:border-nature-sage focus:ring-4 focus:ring-nature-sageLight/50 placeholder-nature-textMuted/50 transition-all"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl font-bold bg-nature-sage hover:bg-nature-sage/95 text-white hover:shadow-nature-sm text-sm transition-all flex items-center gap-1.5"
          >
            Track
          </button>
        </form>
      </div>

      {/* Radar Sweep & Connection Visualizer */}
      <div className="flex-grow bg-white border border-nature-borderSage rounded-2xl p-6 shadow-nature flex flex-col justify-between relative overflow-hidden min-h-[420px]">
        {/* Soft Radar Sweep Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
          <div className="w-[300px] h-[300px] rounded-full border border-nature-primary relative animate-radar-sweep origin-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[150px] bg-gradient-to-t from-transparent to-nature-primary origin-bottom" style={{ transform: 'rotate(180deg)' }} />
          </div>
          <div className="absolute w-[200px] h-[200px] rounded-full border border-nature-primary/40" />
          <div className="absolute w-[100px] h-[100px] rounded-full border border-nature-primary/20" />
        </div>

        {/* Top Header */}
        <div className="text-center relative z-10 space-y-2 mt-4">
          <div className="w-14 h-14 rounded-full bg-nature-sageLight/60 text-nature-primary flex items-center justify-center mx-auto mb-2 border border-nature-borderSage shadow-nature-sm">
            <Cpu size={24} className={isSubmitting ? 'animate-spin' : ''} />
          </div>
          <h3 className="font-display font-bold text-lg text-nature-text">AI Matchmaking Dispatch</h3>
          <p className="text-xs text-nature-textMuted max-w-xs mx-auto">
            Our AI analyses the request context in real-time, grades emergency status, and routes it to nearby volunteers.
          </p>
        </div>

        {/* Nodes Connection Graph */}
        <div className="flex items-center justify-center gap-2 md:gap-4 my-6 relative z-10">
          <div className="w-12 h-12 rounded-full border border-nature-borderSage bg-nature-bg flex items-center justify-center text-nature-text shadow-nature-sm">
            <User size={20} />
          </div>
          
          <div className="flex items-center flex-grow max-w-[80px] justify-between">
            <div className="w-1.5 h-1.5 rounded-full bg-nature-sage animate-ping" />
            <div className="h-0.5 bg-nature-borderSage flex-grow" />
            <div className="w-1.5 h-1.5 rounded-full bg-nature-sage" />
          </div>

          <div className="w-14 h-14 rounded-full border-2 border-nature-sage bg-nature-sageLight flex items-center justify-center text-nature-primary shadow-nature">
            🌱
          </div>

          <div className="flex items-center flex-grow max-w-[80px] justify-between">
            <div className="w-1.5 h-1.5 rounded-full bg-nature-sage" />
            <div className="h-0.5 bg-nature-borderSage flex-grow" />
            <div className="w-1.5 h-1.5 rounded-full bg-nature-leaf animate-pulse" />
          </div>

          <div className="w-12 h-12 rounded-full border-2 border-nature-leaf bg-nature-sageLight flex items-center justify-center text-nature-leaf shadow-nature-sm">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Terminal Logger Console */}
        <div className="bg-nature-bg/85 border border-nature-borderSage/60 rounded-xl p-4 text-left relative z-10 font-mono">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nature-leaf opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nature-leaf"></span>
            </span>
            <span className="text-[10px] font-bold text-nature-leaf uppercase tracking-wider">System Log Console</span>
          </div>
          
          <div className="space-y-1 text-[11px] text-nature-text">
            {terminalLogs.map((log, index) => (
              <div key={index} className="flex gap-1.5 items-start">
                <span className="text-nature-sage font-bold">&gt;</span>
                <span className={log.type === 'error' ? 'text-red-600' : log.type === 'warning' ? 'text-amber-600' : log.type === 'success' ? 'text-nature-primary font-bold' : 'text-nature-textMuted'}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Link Button */}
        <div className="mt-4 text-center">
          <a
            href="tracking.html"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-nature-leaf hover:text-nature-primary underline transition-all"
          >
            Go to Dedicated Tracking Portal →
          </a>
        </div>
      </div>
    </div>
  );
}
