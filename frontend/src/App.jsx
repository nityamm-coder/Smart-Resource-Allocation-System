import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ImpactStats from './components/ImpactStats';
import SubmitRequestForm from './components/SubmitRequestForm';
import MatchmakingVisualizer from './components/MatchmakingVisualizer';
import SmsSimulator from './components/SmsSimulator';
import NetworkCanvas from './components/NetworkCanvas';
import { PencilLine, Cpu, CheckCircle } from 'lucide-react';

export default function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="min-h-screen text-slate-700 flex flex-col font-sans select-none antialiased selection:bg-emerald-500/10 selection:text-emerald-800 relative overflow-x-hidden">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FAFBF9] via-[#ECF2EE] to-[#F1F6F3] -z-20 pointer-events-none" />

      {/* Interactive Network Graph Background (Visible on Light Background) */}
      <NetworkCanvas />

      {/* Navbar */}
      <Navbar />

      {/* Faded Leaves Background Image */}
      <div className="absolute top-[80px] left-0 right-0 h-[650px] pointer-events-none -z-10 overflow-hidden opacity-[0.35] select-none">
        <img src="/leaves.jpg" className="w-full h-full object-cover object-top" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/60 via-transparent to-[#F1F6F3]" />
      </div>

      {/* Hero Section */}
      <Hero />

      {/* Impact Stats Card Row */}
      <ImpactStats />

      {/* Main Grid: Form and Visualizer Columns */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-16 w-full flex-grow relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-6 w-full">
            <SubmitRequestForm onSubmittingStateChange={setIsSubmitting} />
          </div>

          {/* Right Column: Visualizer */}
          <div className="lg:col-span-6 w-full">
            <MatchmakingVisualizer isSubmitting={isSubmitting} />
          </div>
          
        </div>

        {/* How It Works section */}
        <section className="mt-20 md:mt-28 max-w-5xl mx-auto text-center space-y-12">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
              Process Pipeline
            </span>
            <h2 className="font-display font-extrabold text-2xl md:text-3.5xl text-slate-800 tracking-tight">
              How the Dispatch System Works
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Our automated system links emergency reports directly to community volunteer networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="glass-card rounded-2xl p-6 shadow-md transition-all duration-300 transform hover:-translate-y-1.5 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <PencilLine size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-800">1. Describe the Need</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide details in English or regional languages (Hindi, Marathi, Hinglish) via our Web form or raw SMS gateway.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card rounded-2xl p-6 shadow-md transition-all duration-300 transform hover:-translate-y-1.5 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 flex items-center justify-center mx-auto shadow-sm">
                <Cpu size={20} className="animate-pulse" />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-800">2. AI Processes Urgency</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gemini AI parses raw text, translates, categorizes (Food, Medical, Shelter), and scores urgency from 1 to 5.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card rounded-2xl p-6 shadow-md transition-all duration-300 transform hover:-translate-y-1.5 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-white md:text-slate-800">3. Volunteer Matched</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The algorithm automatically finds the best nearby available volunteer based on skills, locality, and workload.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Offline SMS Simulator drawer trigger */}
      <SmsSimulator />

      {/* Footer */}
      <footer className="border-t border-slate-200/50 bg-slate-50/50 py-8 px-6 text-center text-xs font-semibold text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Smart Community Resource Allocation. Developed for relief coordination.</p>
          <div className="flex gap-4">
            <a href="index.html" className="hover:text-emerald-600 transition-colors">Submit Portal</a>
            <span>·</span>
            <a href="dashboard.html" className="hover:text-emerald-600 transition-colors">NGO Dashboard</a>
            <span>·</span>
            <a href="tracking.html" className="hover:text-emerald-600 transition-colors">Tracking Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
