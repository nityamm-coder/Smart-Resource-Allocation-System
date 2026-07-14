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
    <div className="min-h-screen text-on-surface flex flex-col font-sans select-none antialiased selection:bg-primary-container selection:text-on-primary-container relative overflow-x-hidden bg-background">
      
      {/* Interactive Network Graph Background (Visible on Light Background) */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <NetworkCanvas />
      </div>

      {/* Navbar */}
      <Navbar />

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
            <span className="text-[10px] font-bold text-on-primary-container uppercase tracking-widest bg-primary-container px-3.5 py-1.5 border-2 border-black shadow-neu-sm">
              Process Pipeline
            </span>
            <h2 className="font-display font-extrabold text-2xl md:text-3.5xl text-on-surface tracking-tight uppercase mt-2">
              How the Dispatch System Works
            </h2>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto font-medium">
              Our automated system links emergency reports directly to community volunteer networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white border-4 border-black p-6 shadow-neu hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-black bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-neu-sm">
                <PencilLine size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-on-surface uppercase">1. Describe the Need</h4>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                Provide details in English or regional languages (Hindi, Marathi, Hinglish) via our Web form or raw SMS gateway.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border-4 border-black p-6 shadow-neu hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-black bg-tertiary-container text-on-tertiary-container flex items-center justify-center shadow-neu-sm">
                <Cpu size={20} className="animate-pulse" />
              </div>
              <h4 className="font-display font-bold text-sm text-on-surface uppercase">2. AI Processes Urgency</h4>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                Gemini AI parses raw text, translates, categorizes (Food, Medical, Shelter), and scores urgency from 1 to 5.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border-4 border-black p-6 shadow-neu hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-black bg-primary-container text-on-primary-container flex items-center justify-center shadow-neu-sm">
                <CheckCircle size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-on-surface uppercase">3. Volunteer Matched</h4>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                The algorithm automatically finds the best nearby available volunteer based on skills, locality, and workload.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Offline SMS Simulator drawer trigger */}
      <SmsSimulator />

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white py-8 px-6 text-center text-xs font-bold text-on-surface relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Smart Community Resource Allocation. Developed for relief coordination.</p>
          <div className="flex gap-4">
            <a href="index.html" className="underline decoration-2 hover:text-primary transition-colors">Submit Portal</a>
            <span>·</span>
            <a href="dashboard.html" className="underline decoration-2 hover:text-primary transition-colors">NGO Dashboard</a>
            <span>·</span>
            <a href="tracking.html" className="underline decoration-2 hover:text-primary transition-colors">Tracking Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

