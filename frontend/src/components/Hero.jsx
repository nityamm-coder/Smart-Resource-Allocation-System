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

    let speed = isDeleting ? 90 : 180;

    if (!isDeleting && charIndex === currentWord.length) {
      speed = 3000; // Hold word (3 seconds) for better readability
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
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-20 bg-background border-b-4 border-black">
      {/* Background Image with blur and overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src="/leaves.jpg" 
          className="w-full h-full object-cover filter blur-[0.5px] opacity-80" 
          alt="Leaves Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/0 via-background/85 to-background/0"></div>
      </div>

      {/* Abstract Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        {/* Left text block */}
        <div className="lg:col-span-7 text-left space-y-6">
          <div className="inline-flex items-center gap-2 bg-tertiary-container text-on-tertiary-container px-3 py-1.5 border-4 border-black shadow-neu font-bold uppercase tracking-wider text-xs">
            <HeartHandshake size={14} className="animate-pulse" />
            AI Community-Driven Relief
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-on-surface leading-[1.1] min-h-[120px] md:min-h-[160px] lg:min-h-[auto] uppercase">
            Report a Need for <br className="hidden sm:inline" />
            <span className="underline decoration-8 decoration-primary-container underline-offset-4 whitespace-nowrap">
              {typewriterText}
            </span>
            <span className="typewriter-cursor ml-1">|</span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant font-bold max-w-2xl leading-relaxed">
            Describe what you or someone near you needs. Our AI will automatically translate, categorize, score urgency, and connect you to the right available volunteer in real-time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-on-surface font-bold bg-white border-4 border-black px-4 py-3 shadow-neu">
              <span className="text-primary font-bold">✓</span> Multi-Language AI
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-on-surface font-bold bg-white border-4 border-black px-4 py-3 shadow-neu">
              <span className="text-primary font-bold">✓</span> Urgency Grading
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-on-surface font-bold bg-white border-4 border-black px-4 py-3 shadow-neu">
              <span className="text-primary font-bold">✓</span> Instant Dispatch
            </div>
          </div>
        </div>

        {/* Right card graphic */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm bg-white border-4 border-black p-6 shadow-neu-heavy">
            <div className="flex justify-between items-center mb-5 border-b-4 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Dispatch Engine</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-[#dae1ff] border-2 border-black text-secondary shadow-neu-sm flex items-center gap-1">
                <Activity size={10} className="animate-pulse" /> Network: Live
              </span>
            </div>

            {/* Graphic Mock */}
            <div className="space-y-4">
              <div className="bg-surface-container border-4 border-black p-4 relative">
                <div className="flex items-center justify-between mb-3 border-b-2 border-black border-dashed pb-1">
                  <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest">Suggested Match</span>
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                    <ShieldCheck size={12} className="text-primary" /> Active Lock
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border-2 border-black bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-neu-sm">
                    {simulatedMatch.initials}
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-on-surface">{simulatedMatch.name}</h4>
                    <p className="text-[11px] text-on-surface-variant font-medium">{simulatedMatch.role}</p>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-on-surface-variant flex items-center justify-between border-t border-black border-dashed pt-2.5 font-bold">
                  <span>Hub Location:</span>
                  <span className="text-primary">{simulatedMatch.hub}</span>
                </div>
              </div>

              <div className="text-center p-3 border-4 border-dashed border-black bg-tertiary-container text-on-tertiary-container font-bold text-xs">
                "AI coordinates matching in under 15 seconds to dispatch assistance directly to coordinates."
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

