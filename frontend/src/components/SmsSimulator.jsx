import React, { useState } from 'react';
import { MessageSquare, PhoneCall, Trash2, Send, Cpu, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmsSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [senderPhone, setSenderPhone] = useState('+91 98200 98200');
  const [smsText, setSmsText] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'system',
      text: 'SYSTEM: Gateway online. Compose your SMS emergency text below. You can use English, Hindi, Marathi, Hinglish, etc.'
    }
  ]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackLink, setTrackLink] = useState('');

  const handleClear = () => {
    setMessages([
      {
        sender: 'system',
        text: 'SYSTEM: Gateway online. Chat logs cleared.'
      }
    ]);
    setConsoleLogs([]);
    setShowConsole(false);
    setTrackLink('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!smsText.trim() || !senderPhone.trim()) return;

    const userMessageText = smsText;
    setMessages(prev => [...prev, { sender: 'user', text: userMessageText }]);
    setSmsText('');
    setLoading(true);
    setShowConsole(true);
    setTrackLink('');

    setConsoleLogs([
      { status: 'info', msg: `[Gateway] SMS received from: ${senderPhone}` },
      { status: 'info', msg: '[Gateway] Routing payload to Gemini parser...' }
    ]);

    try {
      const response = await fetch('/api/simulate-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsText: userMessageText, senderPhone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process SMS");
      }

      // Appending logs step by step
      setTimeout(() => {
        setConsoleLogs(prev => [
          ...prev,
          { status: 'success', msg: '[AI Engine] Parsing completed successfully.' }
        ]);
      }, 500);

      if (data.isRating) {
        setTimeout(() => {
          setConsoleLogs(prev => [
            ...prev,
            { status: 'success', msg: `[Feedback] Rating recorded: ${data.rating}/5 for ${data.volunteerName}` }
          ]);
          setMessages(prev => [
            ...prev,
            { sender: 'system', text: `SYSTEM: Feedback recorded. Rated volunteer ${data.volunteerName} ${data.rating}/5. Thank you!` }
          ]);
        }, 1000);
      } else {
        setTimeout(() => {
          setConsoleLogs(prev => [
            ...prev,
            { status: 'info', msg: `[AI Engine] Category: ${data.category} | Urgency: ${data.urgency}/5` },
            { status: 'success', msg: `[Match] Assigned volunteer: ${data.matchedVolunteer ? data.matchedVolunteer.name : 'NGO Coordinator'}` }
          ]);
          setMessages(prev => [
            ...prev,
            {
              sender: 'system',
              text: `SYSTEM: Request registered! Category: ${data.category}, Urgency: ${data.urgency}/5. Matched Volunteer: ${data.matchedVolunteer ? data.matchedVolunteer.name : 'NGO Coordinator'}. (ID: ${data.id})`
            }
          ]);
          setTrackLink(data.id);
        }, 1000);
      }

    } catch (err) {
      setConsoleLogs(prev => [
        ...prev,
        { status: 'error', msg: `[Gateway Error] ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 border-4 border-black bg-primary-container text-on-primary-container shadow-neu hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center justify-center transition-all rounded-none"
        title="Simulate Offline SMS Gateway"
      >
        <MessageSquare size={22} />
      </button>

      {/* Slide-over Drawer / Modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-xs"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white border-l-4 border-black shadow-2xl flex flex-col p-6 overflow-y-auto rounded-none"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b-4 border-black">
                <h3 className="font-display font-extrabold text-lg text-on-surface flex items-center gap-2 uppercase">
                  <span>📟</span> Offline SMS Gateway
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 border-2 border-black bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-sm font-bold text-on-surface transition-all rounded-none"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed font-bold">
                In disaster zones without internet, victims send a standard SMS to our gateway. Use this phone mock to simulate sending a raw SMS message and watch how Gemini AI parses it.
              </p>

              {/* Simulated Phone Chassis (Silver Bezel) */}
              <div className="border-4 border-black bg-surface-container rounded-none overflow-hidden shadow-neu-heavy flex-grow max-h-[480px] flex flex-col">
                {/* Phone Header */}
                <div className="bg-surface-container-high text-on-surface py-2.5 px-4 flex justify-between items-center text-xs border-b-4 border-black font-bold">
                  <div className="flex items-center gap-1.5 font-bold">
                    <PhoneCall size={11} className="text-primary" />
                    <span className="text-[10px] uppercase tracking-widest">SMS Gateway Link</span>
                  </div>
                  <button
                    onClick={handleClear}
                    className="text-on-surface-variant hover:text-error transition-colors"
                    title="Clear Logs"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Chat Screen Body (Light screen) */}
                <div className="flex-grow bg-[#E8EDE6] p-4 overflow-y-auto space-y-3 text-xs flex flex-col justify-start rounded-none">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-none p-3 leading-normal border-2 border-black ${
                        msg.sender === 'user'
                          ? 'bg-[#ffe170] text-on-surface self-end'
                          : msg.sender === 'system'
                          ? 'bg-white text-primary self-start font-bold'
                          : 'bg-white text-on-surface self-start'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Chat Input inside phone */}
                <form onSubmit={handleSend} className="bg-white p-3 border-t-4 border-black flex flex-col gap-2">
                  <input
                    type="tel"
                    placeholder="Sender's Phone Number"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="border-2 border-black bg-surface px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-container text-on-surface placeholder-on-surface-variant rounded-none font-bold"
                    required
                  />
                  <div className="flex gap-2">
                    <textarea
                      placeholder="Type raw emergency SMS..."
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      className="flex-grow border-2 border-black bg-surface px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-container text-on-surface placeholder-on-surface-variant resize-none h-12 rounded-none font-medium"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3.5 border-2 border-black bg-primary-container text-on-primary-container transition-all flex items-center justify-center shadow-neu-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] shrink-0 rounded-none"
                    >
                      {loading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Console Logs Output */}
              {showConsole && (
                <div className="mt-5 bg-inverse-surface rounded-none p-4 text-left font-mono border-4 border-black shadow-inner">
                  <div className="flex items-center gap-1.5 text-[9px] text-primary-container uppercase tracking-widest mb-2.5 font-bold border-b border-black border-dashed pb-1.5">
                    <Cpu size={12} className="animate-pulse" />
                    <span>Gateway Console Logs</span>
                  </div>
                  <div className="space-y-1 text-[11px] max-h-[100px] overflow-y-auto scrollbar-thin">
                    {consoleLogs.map((log, index) => (
                      <div key={index} className="flex gap-1.5 items-start">
                        <span className="text-white/20">&gt;</span>
                        <span
                          className={
                            log.status === 'error'
                              ? 'text-red-400 font-bold'
                              : log.status === 'success'
                              ? 'text-primary-container font-bold'
                              : 'text-slate-350'
                          }
                        >
                          {log.msg}
                        </span>
                      </div>
                    ))}
                  </div>

                  {trackLink && (
                    <div className="mt-3 text-right">
                      <a
                        href={`tracking.html?id=${trackLink}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-secondary-container text-on-secondary-container text-xs font-bold shadow-neu-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none"
                      >
                        Track Request
                        <ArrowRight size={11} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

