import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b py-4 transition-all shadow-[0_2px_20px_rgba(45,90,39,0.08)]" style={{ backgroundColor: '#1d573b', borderColor: '#16432d' }}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="index.html" className="flex items-center gap-3 group">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-300" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <span>🌱</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-none animate-pulse-slow" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              SRAS
            </span>
            <span className="text-[12px] md:text-[13px] font-bold uppercase tracking-widest leading-none mt-1.5 flex items-center gap-1" style={{ color: '#a7f3d0' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Smart Resource Allocation System
            </span>
          </div>
        </a>

        <div className="flex items-center gap-4">
          <a
            href="dashboard.html"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 shadow-sm"
            style={{
              color: '#ffffff',
              borderColor: 'rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
          >
            <LayoutDashboard size={15} className="text-emerald-300" />
            <span className="hidden sm:inline">NGO Dashboard</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
