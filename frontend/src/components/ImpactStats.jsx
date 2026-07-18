import React, { useState, useEffect } from 'react';

export default function ImpactStats() {
  const [resolvedCount, setResolvedCount] = useState(0);
  const [activeVolunteers, setActiveVolunteers] = useState(0);
  const [suppliesDeployed, setSuppliesDeployed] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/requests/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setResolvedCount(data.resolvedCount || 0);
            setActiveVolunteers(data.activeVolunteers || 0);
            setSuppliesDeployed(data.suppliesDeployed || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
      <div className="w-full bg-[#1b1b1b] text-white border-4 border-black shadow-neu flex flex-col md:flex-row justify-between items-center py-4 px-10 md:px-16 gap-6 rounded-none">
        
        {/* Stat 1 */}
        <div className="flex flex-col items-center md:items-start w-full md:w-1/3 border-b border-slate-800 md:border-b-0 md:border-r border-slate-700/50 pb-4 md:pb-0 md:pr-8">
          <span className="font-display text-4xl md:text-5xl font-extrabold text-[#00e676] leading-none mb-1.5">
            {resolvedCount}
          </span>
          <span className="font-bold text-[9px] uppercase tracking-widest text-[#a7f3d0]">
            Rescues Completed
          </span>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col items-center md:items-start w-full md:w-1/3 border-b border-slate-800 md:border-b-0 md:border-r border-slate-700/50 pb-4 md:pb-0 md:pr-8 pl-0 md:pl-8">
          <span className="font-display text-4xl md:text-5xl font-extrabold text-[#ffd600] leading-none mb-1.5">
            {activeVolunteers}
          </span>
          <span className="font-bold text-[9px] uppercase tracking-widest text-amber-200">
            Active Volunteers
          </span>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col items-center md:items-start w-full md:w-1/3 pl-0 md:pl-8">
          <span className="font-display text-4xl md:text-5xl font-extrabold text-[#00b0ff] leading-none mb-1.5">
            {suppliesDeployed}
          </span>
          <span className="font-bold text-[9px] uppercase tracking-widest text-sky-200">
            Supplies Deployed
          </span>
        </div>

      </div>
    </section>
  );
}
