import React, { useState, useEffect } from 'react';
import { ShieldCheck, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  const [typewriterText, setTypewriterText] = useState('');
  const words = ["Food Packs", "Medical Aid", "Emergency Shelter", "Critical Supplies"];
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

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

    let speed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentWord.length) {
      speed = 2000; // Hold word
      setIsDeleting(true);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
      speed = 500; // Delay before typing next word
    }

    timer = setTimeout(type, speed);
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex]);

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 border-b border-nature-borderSage/20 bg-gradient-to-b from-nature-sageLight/30 via-transparent to-transparent">
      {/* Abstract Background Nature Patterns */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-nature-sage/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-nature-sageLight/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* Left text block */}
        <div className="md:col-span-7 text-left space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-nature-sageLight text-nature-primary border border-nature-borderSage/60">
            <HeartHandshake size={14} className="animate-pulse text-nature-leaf" />
            Community-Driven Relief
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-nature-text leading-[1.1] min-h-[140px] md:min-h-[180px] lg:min-h-[auto]">
            Report a Need for <br className="hidden sm:inline" />
            <span className="text-nature-leaf bg-gradient-to-r from-nature-primary to-nature-leaf bg-clip-text text-transparent">
              {typewriterText}
            </span>
            <span className="typewriter-cursor text-nature-leaf font-light">|</span>
          </h1>

          <p className="text-base sm:text-lg text-nature-textMuted max-w-2xl leading-relaxed">
            Describe what you or someone near you needs. Our AI will automatically translate, categorize, score urgency, and connect you to the right available volunteer in real-time.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-nature-text font-semibold">
              <div className="w-5 h-5 rounded-full bg-nature-sage/20 flex items-center justify-center text-nature-primary">
                ✓
              </div>
              Multi-Language Translation
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-nature-text font-semibold">
              <div className="w-5 h-5 rounded-full bg-nature-sage/20 flex items-center justify-center text-nature-primary">
                ✓
              </div>
              Instant Urgency Grading
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-nature-text font-semibold">
              <div className="w-5 h-5 rounded-full bg-nature-sage/20 flex items-center justify-center text-nature-primary">
                ✓
              </div>
              Real-time Volunteer dispatch
            </div>
          </div>
        </div>

        {/* Right card graphic */}
        <div className="md:col-span-5 flex justify-center md:justify-end">
          <div className="relative group">
            {/* Soft backdrop glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-nature-sage to-nature-leaf rounded-2xl blur-md opacity-25 group-hover:opacity-40 transition duration-500" />
            
            <div className="relative w-full max-w-sm rounded-2xl bg-white border border-nature-borderSage p-6 shadow-nature-lg overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nature-leaf opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-nature-leaf"></span>
                  </span>
                  <span className="text-xs font-bold text-nature-text/80 uppercase tracking-wider">Live Operations</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-nature-sageLight text-nature-primary">Active Hubs: 4</span>
              </div>

              {/* Graphic Mock */}
              <div className="space-y-4">
                <div className="bg-nature-bg rounded-xl p-4 border border-nature-borderSage/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-nature-sage uppercase tracking-wider">Matched Volunteer</span>
                    <span className="text-xs font-semibold text-nature-primary flex items-center gap-1">
                      <ShieldCheck size={12} /> Priority Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-nature-sage/20 text-nature-primary flex items-center justify-center font-bold text-sm">
                      PS
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-nature-text">Priya Sharma</h4>
                      <p className="text-xs text-nature-textMuted">Medical expert · Vasind Hub</p>
                    </div>
                  </div>
                </div>

                <div className="text-center p-3 border border-dashed border-nature-borderSage/80 rounded-xl bg-nature-bg/30">
                  <p className="text-xs text-nature-textMuted italic">
                    "AI coordinates matching in under 15 seconds to dispatch assistance directly to coordinates."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
