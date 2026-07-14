import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="w-full top-0 sticky z-50 flex justify-between items-center px-6 md:px-12 py-4 bg-surface border-b-4 border-black shadow-neu">
      <div className="flex items-center gap-2">
        <span className="text-3xl">🌱</span>
        <span className="text-2xl font-bold text-on-surface uppercase tracking-tighter">SRAS</span>
      </div>
      <div className="hidden md:flex items-center gap-8 font-bold">
        <a className="text-on-surface hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all" href="dashboard.html">NGO Dashboard</a>
        <a className="text-primary underline decoration-4 underline-offset-8" href="index.html">Victim Portal</a>
        <a className="text-on-surface hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all" href="tracking.html">Live Tracking</a>
      </div>
      <div className="flex gap-4">
        <a href="dashboard.html" className="border-4 border-black shadow-neu hover:shadow-none active:translate-x-1 active:translate-y-1 bg-primary-container text-on-primary-container px-4 py-2 font-bold uppercase transition-all flex items-center gap-2 text-sm">
          <LayoutDashboard size={16} />
          NGO Dashboard
        </a>
      </div>
    </nav>
  );
}

