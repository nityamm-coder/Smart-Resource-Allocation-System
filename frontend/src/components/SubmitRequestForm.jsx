import React, { useState } from 'react';
import { Navigation, Send, Loader2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SubmitRequestForm({ onSubmittingStateChange }) {
  const [description, setDescription] = useState('');
  const [victimPhone, setVictimPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please type your address manually.");
      return;
    }

    setGpsLoading(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let localityText = "";

        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
          if (res.ok) {
            const data = await res.json();
            const parts = [];
            if (data.locality) parts.push(data.locality);
            if (data.city && data.city !== data.locality) parts.push(data.city);
            if (data.principalSubdivision) parts.push(data.principalSubdivision);
            if (parts.length > 0) {
              localityText = parts.join(", ") + " (GPS: Lat ";
            }
          }
        } catch (e) {
          console.warn("Reverse geocoding failed, falling back to raw coordinates:", e);
        }

        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        if (localityText) {
          setAddress(`${localityText}${lat.toFixed(6)}, Lng ${lng.toFixed(6)}) (${mapsUrl})`);
        } else {
          setAddress(`GPS Location: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)} (${mapsUrl})`);
        }

        setGpsLoading(false);
        setGpsSuccess(true);
        setTimeout(() => setGpsSuccess(false), 4000);
      },
      (error) => {
        console.error("GPS error:", error);
        setGpsLoading(false);
        alert("Unable to retrieve location automatically. Please enter your address manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!description.trim()) {
      setErrorMsg("Please describe the need before submitting.");
      return;
    }
    if (!victimPhone.trim()) {
      setErrorMsg("Please enter your contact phone number.");
      return;
    }
    if (!zone) {
      setErrorMsg("Please select your nearest locality.");
      return;
    }

    setLoading(true);
    if (onSubmittingStateChange) onSubmittingStateChange(true);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, zone, victimPhone, address })
      });

      const data = await response.json();

      if (response.status === 429) {
        setErrorMsg("Too many requests from this IP. Please wait 15 minutes and try again.");
        setLoading(false);
        if (onSubmittingStateChange) onSubmittingStateChange(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Unknown server error.");
      }

      // Fire confetti celebration!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setSuccessMsg("Request matched successfully! Redirecting you to the live tracker...");
      
      // Reset form
      setDescription('');
      setVictimPhone('');
      setAddress('');
      setZone('');

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = `tracking.html?id=${data.id}`;
      }, 2000);

    } catch (err) {
      setErrorMsg(err.message || "Failed to submit request.");
      setLoading(false);
      if (onSubmittingStateChange) onSubmittingStateChange(false);
    }
  };

  return (
    <div className="border-4 border-black p-6 sm:p-8 shadow-neu rounded-none" style={{ backgroundColor: '#caf0f8' }}>
      <h2 className="font-display font-extrabold text-xl md:text-2xl text-on-surface mb-6 flex items-center gap-2.5 border-b-4 border-black pb-3 uppercase">
        <span className="w-8 h-8 border-2 border-black bg-error-container text-on-error-container flex items-center justify-center text-sm shadow-neu-sm">
          🚨
        </span>
        Submit a Help Request
      </h2>

      {errorMsg && (
        <div className="mb-6 p-4 border-4 border-black bg-error-container text-on-error-container text-sm flex items-start gap-2.5 shadow-neu-sm rounded-none">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <strong className="uppercase">Submission Error:</strong> {errorMsg}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 border-4 border-black bg-primary-container text-on-primary-container text-sm flex items-center gap-2.5 shadow-neu-sm rounded-none">
          <CheckCircle size={18} className="shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Describe the need
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-4 border-black p-3.5 text-sm placeholder-on-surface-variant resize-none bg-surface focus:outline-none focus:ring-4 focus:ring-primary-container focus:ring-offset-0"
            placeholder="e.g. An elderly man in our building has run out of insulin and cannot reach a hospital..."
            required
          />
          <span className="block text-[11px] text-on-surface-variant mt-1.5 leading-normal font-bold">
            Be as descriptive as possible — Gemini AI uses this to analyze category and grade urgency.
          </span>
        </div>

        {/* Contact Phone */}
        <div>
          <label htmlFor="victimPhone" className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Your Contact Number
          </label>
          <input
            type="tel"
            id="victimPhone"
            value={victimPhone}
            onChange={(e) => setVictimPhone(e.target.value)}
            className="w-full border-4 border-black p-3.5 text-sm placeholder-on-surface-variant bg-surface focus:outline-none focus:ring-4 focus:ring-primary-container focus:ring-offset-0"
            placeholder="e.g. +91 98765 43210"
            required
          />
          <span className="block text-[11px] text-on-surface-variant mt-1.5 leading-normal font-bold">
            Coordinators and matched volunteers will call you at this number.
          </span>
        </div>

        {/* Address */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="address" className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Exact Address / Landmark (Optional)
            </label>
            <button
              type="button"
              onClick={handleShareLocation}
              disabled={gpsLoading}
              className={`flex items-center gap-1.5 px-3 py-1 border-2 border-black font-bold uppercase transition-all shadow-neu-sm text-xs ${
                gpsSuccess
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-tertiary-container hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
              }`}
            >
              {gpsLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Locating...
                </>
              ) : gpsSuccess ? (
                <>
                  <CheckCircle size={12} />
                  Shared
                </>
              ) : (
                <>
                  <MapPin size={12} />
                  Share GPS
                </>
              )}
            </button>
          </div>
          <textarea
            id="address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border-4 border-black p-3.5 text-sm placeholder-on-surface-variant resize-none bg-surface focus:outline-none focus:ring-4 focus:ring-primary-container focus:ring-offset-0"
            placeholder="e.g. Flat 202, Building B, Tarmale Nagar, Vasind, Maharashtra (Or click Share GPS)"
          />
        </div>

        {/* Local Hub / Zone */}
        <div>
          <label htmlFor="zone" className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
            Select Nearest Locality/Hub
          </label>
          <div className="relative">
            <select
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full border-4 border-black p-3.5 text-sm cursor-pointer bg-surface appearance-none font-bold focus:outline-none focus:ring-4 focus:ring-primary-container focus:ring-offset-0"
              required
            >
              <option value="" disabled>Select nearest locality...</option>
              <option value="Vasind">Vasind</option>
              <option value="Kalyan">Kalyan</option>
              <option value="Thane">Thane</option>
              <option value="Mumbai Central">Mumbai Central</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
              <span className="font-bold">▼</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-4 px-6 border-4 border-black font-bold bg-primary-container text-on-primary-container shadow-neu-heavy hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase rounded-none disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              AI Analyzing Emergency...
            </>
          ) : (
            <>
              <Send size={15} />
              Submit Help Request
            </>
          )}
        </button>
      </form>
    </div>
  );
}

