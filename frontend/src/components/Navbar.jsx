import React from 'react';
import { Heart, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-nature-bg/85 backdrop-blur-md border-b border-nature-borderSage/40 py-4 transition-all">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="index.html" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-nature-sageLight flex items-center justify-center text-nature-primary group-hover:scale-105 transition-transform">
            <span className="text-xl">🌱</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-xl md:text-2xl tracking-tight text-nature-text leading-none">
              Smart Resource
            </span>
            <span className="text-xs font-semibold text-nature-sage uppercase tracking-wider leading-none mt-1">
              Allocation Portal
            </span>
          </div>
        </a>

        <div className="flex items-center gap-4">
          <a
            href="dashboard.html"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-nature-borderSage bg-nature-card text-nature-text hover:bg-nature-sageLight/50 hover:text-nature-primary hover:border-nature-sage transition-all shadow-nature-sm"
          >
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">NGO Dashboard</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
