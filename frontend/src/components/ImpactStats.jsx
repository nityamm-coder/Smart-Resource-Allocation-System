import React, { useState, useEffect } from 'react';
import { CircleAlert, Award, Zap } from 'lucide-react';

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
    <section className="max-w-5xl mx-auto px-6 -mt-8 relative z-20">
      <div className="bg-white border border-nature-borderSage rounded-2xl p-6 sm:p-8 shadow-nature-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-nature-borderSage/50">
          
          {/* Stat 1 */}
          <div className="flex flex-col items-center text-center p-3 sm:first:pl-0">
            <div className="w-10 h-10 rounded-full bg-nature-sageLight flex items-center justify-center text-nature-primary mb-3">
              <Award size={20} className="text-nature-primary" />
            </div>
            <h3 className="font-display font-extrabold text-3xl md:text-4xl text-nature-text tracking-tight mb-1">
              {resolvedCount > 0 ? resolvedCount : '14'}
            </h3>
            <p className="text-xs font-bold text-nature-textMuted uppercase tracking-wider">
              Requests Resolved
            </p>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center text-center p-3 sm:px-4">
            <div className="w-10 h-10 rounded-full bg-nature-sageLight flex items-center justify-center text-nature-primary mb-3">
              <Zap size={20} className="text-nature-leaf" />
            </div>
            <h3 className="font-display font-extrabold text-3xl md:text-4xl text-nature-text tracking-tight mb-1">
              &lt; 15m
            </h3>
            <p className="text-xs font-bold text-nature-textMuted uppercase tracking-wider">
              Avg Volunteer Dispatch
            </p>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center text-center p-3 sm:last:pr-0">
            <div className="w-10 h-10 rounded-full bg-nature-sageLight flex items-center justify-center text-nature-primary mb-3">
              <span className="text-lg">🤝</span>
            </div>
            <h3 className="font-display font-extrabold text-3xl md:text-4xl text-nature-text tracking-tight mb-1">
              98.4%
            </h3>
            <p className="text-xs font-bold text-nature-textMuted uppercase tracking-wider">
              Successful Aid Delivery
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
