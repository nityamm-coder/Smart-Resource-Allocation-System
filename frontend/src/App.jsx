import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ImpactStats from './components/ImpactStats';
import SubmitRequestForm from './components/SubmitRequestForm';
import MatchmakingVisualizer from './components/MatchmakingVisualizer';
import SmsSimulator from './components/SmsSimulator';
import { PencilLine, Cpu, CheckCircle } from 'lucide-react';

export default function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-nature-bg flex flex-col font-sans select-none antialiased selection:bg-nature-sageLight/60 selection:text-nature-primary">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Impact Stats Card Row */}
      <ImpactStats />

      {/* Main Grid: Form and Visualizer Columns */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-16 w-full flex-grow">
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
        <section className="mt-16 md:mt-24 max-w-4xl mx-auto text-center space-y-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-nature-leaf uppercase tracking-wider bg-nature-sageLight px-3 py-1 rounded-full border border-nature-borderSage/60">
              Process Pipeline
            </span>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-nature-text">
              How the Dispatch System Works
            </h2>
            <p className="text-sm text-nature-textMuted max-w-md mx-auto">
              Our automated system links emergency reports directly to community volunteer networks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white border border-nature-borderSage rounded-2xl p-6 shadow-nature hover:-translate-y-1 transition-transform space-y-4">
              <div className="w-12 h-12 rounded-xl bg-nature-sageLight/50 border border-nature-borderSage text-nature-primary flex items-center justify-center mx-auto shadow-nature-sm">
                <PencilLine size={20} className="text-nature-primary" />
              </div>
              <h4 className="font-display font-bold text-sm text-nature-text">1. Describe the Need</h4>
              <p className="text-xs text-nature-textMuted leading-relaxed">
                Provide details in English or regional languages (Hindi, Marathi, Hinglish) via our Web form or raw SMS gateway.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-nature-borderSage rounded-2xl p-6 shadow-nature hover:-translate-y-1 transition-transform space-y-4">
              <div className="w-12 h-12 rounded-xl bg-nature-sageLight/50 border border-nature-borderSage text-nature-primary flex items-center justify-center mx-auto shadow-nature-sm">
                <Cpu size={20} className="text-nature-leaf" />
              </div>
              <h4 className="font-display font-bold text-sm text-nature-text">2. AI Processes Urgency</h4>
              <p className="text-xs text-nature-textMuted leading-relaxed">
                Gemini AI parses raw text, translates, categorizes (Food, Medical, Shelter), and scores urgency from 1 to 5.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-nature-borderSage rounded-2xl p-6 shadow-nature hover:-translate-y-1 transition-transform space-y-4">
              <div className="w-12 h-12 rounded-xl bg-nature-sageLight/50 border border-nature-borderSage text-nature-primary flex items-center justify-center mx-auto shadow-nature-sm">
                <CheckCircle size={20} className="text-nature-sage" />
              </div>
              <h4 className="font-display font-bold text-sm text-nature-text">3. Volunteer Matched</h4>
              <p className="text-xs text-nature-textMuted leading-relaxed">
                The algorithm automatically finds the best nearby available volunteer based on skills, locality, and workload.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Offline SMS Simulator drawer trigger */}
      <SmsSimulator />

      {/* Footer */}
      <footer className="border-t border-nature-borderSage bg-white/40 py-8 px-6 text-center text-xs font-semibold text-nature-textMuted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Smart Community Resource Allocation. Developed for relief coordination.</p>
          <div className="flex gap-4">
            <a href="index.html" className="hover:text-nature-primary transition-colors">Submit Portal</a>
            <span>·</span>
            <a href="dashboard.html" className="hover:text-nature-primary transition-colors">NGO Dashboard</a>
            <span>·</span>
            <a href="tracking.html" className="hover:text-nature-primary transition-colors">Tracking Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
