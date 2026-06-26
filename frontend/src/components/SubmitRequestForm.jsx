import React, { useState } from 'react';
import { Navigation, Send, Loader2, MapPin, CheckCircle } from 'lucide-react';
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
        particleCount: 120,
        spread: 70,
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
    <div className="bg-white border border-nature-borderSage rounded-2xl p-6 sm:p-8 shadow-nature-lg">
      <h2 className="font-display font-bold text-xl md:text-2xl text-nature-text mb-6 flex items-center gap-2">
        <span className="text-2xl">📝</span>
        Submit a Help Request
      </h2>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-550/5 border border-red-500/20 text-red-700 text-sm">
          ⚠️ <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-nature-sageLight border border-nature-sage/40 text-nature-primary text-sm flex items-center gap-2">
          <CheckCircle size={16} className="text-nature-leaf" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-bold text-nature-text uppercase tracking-wider mb-2">
            Describe the need
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-nature-borderSage bg-nature-bg/30 text-nature-text p-3 text-sm focus:outline-none focus:border-nature-sage focus:ring-4 focus:ring-nature-sageLight/50 placeholder-nature-textMuted/50 transition-all resize-none"
            placeholder="e.g. An elderly man in our building has run out of insulin and cannot reach a hospital..."
            required
          />
          <span className="block text-[11px] text-nature-textMuted mt-1.5 leading-normal">
            Be as descriptive as possible — Gemini AI uses this to analyze category and grade urgency.
          </span>
        </div>

        {/* Contact Phone */}
        <div>
          <label htmlFor="victimPhone" className="block text-xs font-bold text-nature-text uppercase tracking-wider mb-2">
            Your Contact Number
          </label>
          <input
            type="tel"
            id="victimPhone"
            value={victimPhone}
            onChange={(e) => setVictimPhone(e.target.value)}
            className="w-full rounded-xl border border-nature-borderSage bg-nature-bg/30 text-nature-text p-3 text-sm focus:outline-none focus:border-nature-sage focus:ring-4 focus:ring-nature-sageLight/50 placeholder-nature-textMuted/50 transition-all"
            placeholder="e.g. +91 98765 43210"
            required
          />
          <span className="block text-[11px] text-nature-textMuted mt-1.5 leading-normal">
            Coordinators and matched volunteers will call you at this number.
          </span>
        </div>

        {/* Address */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="address" className="text-xs font-bold text-nature-text uppercase tracking-wider">
              Exact Address / Landmark (Optional)
            </label>
            <button
              type="button"
              onClick={handleShareLocation}
              disabled={gpsLoading}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                gpsSuccess
                  ? 'bg-nature-sageLight text-nature-primary border-nature-sage/40'
                  : 'bg-white hover:bg-nature-sageLight/30 text-nature-leaf border-nature-borderSage hover:border-nature-sage'
              }`}
            >
              {gpsLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Locating...
                </>
              ) : gpsSuccess ? (
                <>
                  <CheckCircle size={12} className="text-nature-leaf" />
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
            className="w-full rounded-xl border border-nature-borderSage bg-nature-bg/30 text-nature-text p-3 text-sm focus:outline-none focus:border-nature-sage focus:ring-4 focus:ring-nature-sageLight/50 placeholder-nature-textMuted/50 transition-all resize-none"
            placeholder="e.g. Flat 202, Building B, Tarmale Nagar, Vasind, Maharashtra (Or click Share GPS)"
          />
        </div>

        {/* Local Hub / Zone */}
        <div>
          <label htmlFor="zone" className="block text-xs font-bold text-nature-text uppercase tracking-wider mb-2">
            Select Nearest Locality/Hub
          </label>
          <select
            id="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full rounded-xl border border-nature-borderSage bg-nature-bg/30 text-nature-text p-3 text-sm focus:outline-none focus:border-nature-sage focus:ring-4 focus:ring-nature-sageLight/50 transition-all cursor-pointer"
            required
          >
            <option value="" disabled>Select nearest locality...</option>
            <option value="Vasind">Vasind</option>
            <option value="Kalyan">Kalyan</option>
            <option value="Thane">Thane</option>
            <option value="Mumbai Central">Mumbai Central</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold bg-nature-primary hover:bg-nature-primaryHover text-white shadow-nature transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              AI Analyzing Emergency...
            </>
          ) : (
            <>
              <Send size={16} />
              Submit Help Request
            </>
          )}
        </button>
      </form>
    </div>
  );
}
