import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="w-full top-0 sticky z-50 flex justify-between items-center px-12 md:px-32 py-5 bg-[#0d3822]">
      <div className="flex items-center gap-3.5">
        <div className="bg-white p-1.5 rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
          <span className="text-3xl">🌱</span>
        </div>
        <div>
          <span className="text-3xl font-extrabold text-white tracking-tight block leading-none">SRAS</span>
          <span className="text-[10px] font-bold text-[#80ED99] tracking-wider uppercase flex items-center gap-1.5 mt-1.5">
            <span className="text-[8px] text-[#80ED99]">&#9679;</span> Smart Resource Allocation System
          </span>
        </div>
      </div>
      <div className="flex gap-4">
        <a href="dashboard.html" className="border border-[#38a3a5] hover:bg-[#38a3a5]/20 text-white px-6 py-2.5 rounded-full font-bold text-sm tracking-wide uppercase transition-all flex items-center gap-2">
          <LayoutDashboard size={18} className="text-[#38a3a5]" />
          NGO Dashboard
        </a>
      </div>
    </nav>
  );
}

