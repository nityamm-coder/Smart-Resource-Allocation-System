import React, { useState, useEffect } from 'react';
import { ShieldCheck, HeartHandshake, Activity } from 'lucide-react';

export default function Hero() {
  const [typewriterText, setTypewriterText] = useState('');
  const words = ["Food Packs", "Medical Aid", "Emergency Shelter", "Critical Supplies"];
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Volunteer simulation rotation
  const [simulatedMatch, setSimulatedMatch] = useState({
    name: "Priya Sharma",
    role: "Medical Expert",
    hub: "Vasind Hub",
    initials: "PS"
  });

  const simulatedVolunteers = [
    { name: "Priya Sharma", role: "Medical Expert · Emergency First Aid", hub: "Vasind Hub", initials: "PS" },
    { name: "Rohan Mehta", role: "Logistics Expert · Food Supply", hub: "Kalyan Hub", initials: "RM" },
    { name: "Anita Desai", role: "Field Coordinator · Shelter Setup", hub: "Thane Hub", initials: "AD" },
    { name: "Kunal Verma", role: "Disaster Responder · Rescue Operations", hub: "Mumbai Central Hub", initials: "KV" }
  ];

  useEffect(() => {
    let volIndex = 0;
    const interval = setInterval(() => {
      volIndex = (volIndex + 1) % simulatedVolunteers.length;
      setSimulatedMatch(simulatedVolunteers[volIndex]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer;
    const currentWord = words[wordIndex];

    const type = () => {
      if (isDeleting) {
        setTypewriterText(currentWord.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      } else {
        setTypewriterText(currentWord.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }
    };

    let speed = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex === currentWord.length) {
      speed = 1800; // Hold word
      setIsDeleting(true);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
      speed = 400; // Delay before typing next word
    }

    timer = setTimeout(type, speed);
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex]);

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 border-b border-emerald-900/5 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent">
      {/* Glow backgrounds */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 ambient-glow-1 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[450px] h-[450px] ambient-glow-2 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left text block */}
        <div className="lg:col-span-7 text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-500/20 shadow-sm">
            <HeartHandshake size={14} className="animate-pulse text-emerald-600" />
            AI Community-Driven Relief
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 drop-shadow-md leading-[1.1] min-h-[120px] md:min-h-[160px] lg:min-h-[auto]">
            Report a Need for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-800 via-teal-700 to-green-800 bg-clip-text text-transparent text-neon-green drop-shadow-sm">
              {typewriterText}
            </span>
            <span className="typewriter-cursor text-emerald-700 font-light ml-0.5">|</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-800 font-medium drop-shadow-md max-w-2xl leading-relaxed">
            Describe what you or someone near you needs. Our AI will automatically translate, categorize, score urgency, and connect you to the right available volunteer in real-time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-semibold bg-white/70 border border-slate-200/50 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-md">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold shadow-sm">
                ✓
              </div>
              Multi-Language AI
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-semibold bg-white/70 border border-slate-200/50 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-md">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold shadow-sm">
                ✓
              </div>
              Urgency Grading
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-semibold bg-white/70 border border-slate-200/50 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-md">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold shadow-sm">
                ✓
              </div>
              Instant Dispatch
            </div>
          </div>
        </div>

        {/* Right card graphic */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end animate-float">
          <div className="relative w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur-2xl border border-emerald-900/10 p-6 shadow-[0_25px_50px_-12px_rgba(20,60,30,0.25)] overflow-hidden">
            {/* Ambient spot behind the graphic */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Dispatch Engine</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shadow-sm flex items-center gap-1">
                <Activity size={10} className="animate-pulse" /> Network: Active
              </span>
            </div>

            {/* Graphic Mock */}
            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 relative overflow-hidden transition-all duration-500">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">Suggested Match</span>
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500 animate-bounce" /> Priority Lock
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm">
                    {simulatedMatch.initials}
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-slate-800 transition-all duration-300">{simulatedMatch.name}</h4>
                    <p className="text-[11px] text-slate-500 transition-all duration-300">{simulatedMatch.role}</p>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span>Hub Location:</span>
                  <span className="font-semibold text-emerald-600">{simulatedMatch.hub}</span>
                </div>
              </div>

              <div className="text-center p-3 border border-dashed border-emerald-500/20 rounded-2xl bg-emerald-500/5 backdrop-blur-sm">
                <p className="text-xs text-slate-650 italic">
                  "AI coordinates matching in under 15 seconds to dispatch assistance directly to coordinates."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
