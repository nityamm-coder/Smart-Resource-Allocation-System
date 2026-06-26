import React, { useState } from 'react';
import { MessageSquare, PhoneCall, Trash2, Send, Cpu, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
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
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-nature-primary hover:bg-nature-primaryHover text-white shadow-nature-lg flex items-center justify-center transition-all hover:scale-105"
        title="Simulate Offline SMS Gateway"
      >
        <MessageSquare size={24} className="text-white" />
      </button>

      {/* Slide-over Drawer / Modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-nature-text"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-nature-bg border-l border-nature-borderSage shadow-nature-lg flex flex-col p-6 overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-lg text-nature-text flex items-center gap-2">
                  <span>📟</span> Offline SMS Gateway
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full border border-nature-borderSage hover:bg-nature-sageLight flex items-center justify-center text-sm font-bold text-nature-textMuted"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-nature-textMuted mb-6 leading-relaxed">
                In disaster zones without internet, victims send a standard SMS to our gateway. Use this phone mock to simulate sending a raw SMS message and watch how Gemini AI parses it.
              </p>

              {/* Simulated Phone Chassis */}
              <div className="border-[6px] border-nature-text bg-nature-text rounded-[32px] overflow-hidden shadow-xl flex-grow max-h-[500px] flex flex-col">
                {/* Phone Header */}
                <div className="bg-nature-text text-white/80 py-2 px-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1 font-semibold">
                    <PhoneCall size={12} className="text-nature-leaf" />
                    <span>Emergency SMS Gateway</span>
                  </div>
                  <button
                    onClick={handleClear}
                    className="text-white/60 hover:text-red-400 transition-colors"
                    title="Clear Logs"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Chat Screen Body */}
                <div className="flex-grow bg-[#F1F3F0] p-4 overflow-y-auto space-y-3 text-xs flex flex-col justify-start">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-xl p-3 leading-normal ${
                        msg.sender === 'user'
                          ? 'bg-nature-primary text-white self-end rounded-tr-none'
                          : msg.sender === 'system'
                          ? 'bg-nature-sageLight border border-nature-sage/30 text-nature-text self-start rounded-tl-none font-medium'
                          : 'bg-white text-nature-text border border-nature-borderSage self-start rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Chat Input inside phone */}
                <form onSubmit={handleSend} className="bg-white p-3 border-t border-nature-borderSage flex flex-col gap-2">
                  <input
                    type="tel"
                    placeholder="Sender's Phone Number"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="rounded-lg border border-nature-borderSage px-2.5 py-1.5 text-xs focus:outline-none focus:border-nature-sage text-nature-text"
                    required
                  />
                  <div className="flex gap-2">
                    <textarea
                      placeholder="Type raw emergency SMS..."
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      className="flex-grow rounded-lg border border-nature-borderSage px-2.5 py-1.5 text-xs focus:outline-none focus:border-nature-sage text-nature-text resize-none h-12"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 rounded-lg bg-nature-primary text-white hover:bg-nature-primaryHover transition-all flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Console Logs Output */}
              {showConsole && (
                <div className="mt-4 bg-[#1E2E24] rounded-xl p-4 text-left font-mono border border-nature-borderSage/50">
                  <div className="flex items-center gap-1.5 text-[10px] text-nature-sage uppercase tracking-wider mb-2 font-bold">
                    <Cpu size={12} className="animate-pulse" />
                    <span>Gateway Console Logs</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {consoleLogs.map((log, index) => (
                      <div key={index} className="flex gap-1.5 items-start">
                        <span className="text-white/40">&gt;</span>
                        <span
                          className={
                            log.status === 'error'
                              ? 'text-red-400'
                              : log.status === 'success'
                              ? 'text-nature-sage font-bold'
                              : 'text-white/80'
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
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-nature-sage text-white text-xs font-bold hover:bg-nature-sage/95 transition-all shadow"
                      >
                        Track Request
                        <ArrowRight size={12} />
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
