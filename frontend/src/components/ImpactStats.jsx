import React, { useState, useEffect } from 'react';
import { Award, Zap } from 'lucide-react';

export default function ImpactStats() {
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/requests/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setResolvedCount(data.resolvedCount || 0);
          }
        }
      } catch (err) {
        console.error("Error fetching resolved count:", err);
      }
    };

    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
      <div className="w-full bg-[#1b1b1b] text-white border-4 border-black shadow-neu flex flex-col md:flex-row justify-between items-center py-8 px-6 gap-6 rounded-none">
        
        {/* Stat 1 */}
        <div className="flex flex-col items-center md:items-start w-full md:w-1/3 border-b-4 md:border-b-0 md:border-r-4 border-black pb-4 md:pb-0 md:pr-6">
          <span className="font-display text-5xl font-extrabold text-primary-container leading-none mb-2">
            {resolvedCount > 0 ? resolvedCount : '14'}
          </span>
          <span className="font-bold text-[10px] uppercase tracking-widest text-outline-variant">
            Rescues Completed
          </span>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col items-center md:items-start w-full md:w-1/3 border-b-4 md:border-b-0 md:border-r-4 border-black pb-4 md:pb-0 md:pr-6 pl-0 md:pl-6">
          <span className="font-display text-5xl font-extrabold text-tertiary-container leading-none mb-2">
            &lt; 15m
          </span>
          <span className="font-bold text-[10px] uppercase tracking-widest text-outline-variant">
            Avg Dispatch Time
          </span>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col items-center md:items-start w-full md:w-1/3 pl-0 md:pl-6">
          <span className="font-display text-5xl font-extrabold text-secondary-container leading-none mb-2">
            98.4%
          </span>
          <span className="font-bold text-[10px] uppercase tracking-widest text-outline-variant">
            Aid Success Rate
          </span>
        </div>

      </div>
    </section>
  );
}
