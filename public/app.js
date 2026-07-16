// ============================================================
// app.js — Smart Resource Allocation Frontend
// ============================================================
// This file runs in the browser and handles two things:
//   1. On index.html  → listening to the form submission, calling
//                       our backend API, and showing the result.
//   2. On dashboard.html → fetching all requests from the backend
//                          and rendering them as Kanban cards.
// ============================================================

// ── Helper: which page are we on? ────────────────────────────
// We check for the presence of a unique element to know which
// page's code to run. This way a single app.js file works on both.
const isIndexPage     = document.getElementById("request-form") !== null;
const isDashboardPage = document.getElementById("kanban-board")  !== null;

// ── Base URL for all API calls ────────────────────────────────
// In development this hits localhost:3000.
// On Vercel it automatically uses the deployed URL because all
// requests are relative (no hardcoded host).
const API_BASE = "";

// ── Custom Toast Notification helper ─────────────────────────
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;

  let icon = '<i class="bi bi-info-circle toast-icon"></i>';
  if (type === "success") icon = '<i class="bi bi-check-circle-fill toast-icon"></i>';
  if (type === "danger") icon = '<i class="bi bi-exclamation-triangle-fill toast-icon"></i>';
  if (type === "warning") icon = '<i class="bi bi-exclamation-circle-fill toast-icon"></i>';

  toast.innerHTML = `
    ${icon}
    <div class="toast-message">${message}</div>
    <button class="toast-close-btn"><i class="bi bi-x"></i></button>
  `;

  container.appendChild(toast);

  // Trigger CSS transition
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  const dismissTimer = setTimeout(() => {
    dismissToast(toast);
  }, 4000);

  toast.querySelector(".toast-close-btn").addEventListener("click", () => {
    clearTimeout(dismissTimer);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  toast.classList.remove("show");
  setTimeout(() => {
    toast.remove();
  }, 350);
}

// =============================================================
// PAGE 1 — index.html (Request Submission Form)
// =============================================================
if (isIndexPage) {
  const form         = document.getElementById("request-form");
  const btnText      = document.getElementById("btn-text");
  const btnSpinner   = document.getElementById("btn-spinner");
  const submitBtn    = document.getElementById("submit-btn");
  const resultBanner = document.getElementById("result-banner");
  const placeholderContent = document.getElementById("placeholder-content");

  const trackSearchForm = document.getElementById("track-search-form");
  if (trackSearchForm) {
    trackSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const searchId = document.getElementById("track-search-id").value.trim();
      if (searchId) {
        window.location.href = `tracking.html?id=${searchId}`;
      }
    });
  }

  // ── Typewriter Animation Logic ──
  const typewriterEl = document.getElementById("typewriter-text");
  if (typewriterEl) {
    const words = ["Food Packs", "Medical Aid", "Emergency Shelter", "Critical Supplies"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
      const currentWord = words[wordIndex];
      if (isDeleting) {
        typewriterEl.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
      } else {
        typewriterEl.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
      }
      
      let typeSpeed = 100;
      if (isDeleting) {
        typeSpeed = 50;
      }
      
      if (!isDeleting && charIndex === currentWord.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 500;
      }
      
      setTimeout(type, typeSpeed);
    }
    
    setTimeout(type, 500);
  }

  /**
   * setLoading
   * Toggles the submit button between its normal state and a
   * "loading" spinner state so the user knows something is happening.
   *
   * @param {boolean} loading - true = show spinner, false = show text
   */
  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.classList.toggle("d-none", loading);
    btnSpinner.classList.toggle("d-none", !loading);
  }

  // ── Rate Limit Error Handler ──────────────────────────────────
  // Called when the server returns HTTP 429 (Too Many Requests).
  // Shows a distinctive banner with a live countdown timer so the
  // user knows exactly when they can try again.
  let rateLimitCountdownInterval = null;

  function showRateLimitError(waitMinutes = 15) {
    // Clear any previous countdown
    if (rateLimitCountdownInterval) clearInterval(rateLimitCountdownInterval);

    // Hide placeholder, show result panel
    if (placeholderContent) placeholderContent.classList.add("d-none");
    resultBanner.classList.remove("d-none", "alert-success", "alert-danger");
    resultBanner.classList.add("rate-limit-banner");

    // Disable the submit button for the full cooldown window
    submitBtn.disabled = true;

    let totalSeconds = waitMinutes * 60;

    function formatTime(secs) {
      const m = Math.floor(secs / 60).toString().padStart(2, "0");
      const s = (secs % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    function renderBanner(secondsLeft) {
      resultBanner.innerHTML = `
        <div class="rate-limit-icon">🛡️</div>
        <h5 class="rate-limit-title">Too Many Submissions</h5>
        <p class="rate-limit-msg">
          You've submitted too many requests in a short time.<br>
          This limit protects our system and ensures genuine victims get priority.
        </p>
        <div class="rate-limit-countdown">
          <span class="countdown-label">You can try again in</span>
          <span class="countdown-timer" id="countdown-display">${formatTime(secondsLeft)}</span>
        </div>
        <p class="rate-limit-hint">The form will unlock automatically when the timer reaches 00:00.</p>
      `;
    }

    renderBanner(totalSeconds);

    rateLimitCountdownInterval = setInterval(() => {
      totalSeconds--;
      const display = document.getElementById("countdown-display");
      if (display) display.textContent = formatTime(totalSeconds);

      if (totalSeconds <= 0) {
        clearInterval(rateLimitCountdownInterval);
        // Re-enable the button and reset the banner
        submitBtn.disabled = false;
        resultBanner.classList.remove("rate-limit-banner");
        resultBanner.classList.add("d-none");
        if (placeholderContent) placeholderContent.classList.remove("d-none");
      }
    }, 1000);
  }

  let statusInterval = null;

  function getCategoryWithIcon(category) {
    const icons = {
      "Medical": "🏥 Medical",
      "Food": "🍎 Food",
      "Shelter": "🏠 Shelter",
      "Life Jackets": "🛟 Life Jackets",
      "Other": "ℹ️ Other"
    };
    return icons[category] || category;
  }

  function renderLiveTimeline(timelineEvents) {
    const container = document.getElementById("tracker-timeline-container");
    if (!container || !timelineEvents) return;
    
    container.innerHTML = timelineEvents.map(event => {
      const timeStr = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      let statusClass = "active";
      if (event.status === "Resolved") statusClass = "completed";
      return `
        <div class="timeline-event ${statusClass}">
          <div class="timeline-event-dot"></div>
          <span class="timeline-event-time">${timeStr}</span>
          <span class="timeline-event-note">${event.note}</span>
        </div>
      `;
    }).join("");
  }

  function startStatusTracking(requestId) {
    if (statusInterval) clearInterval(statusInterval);
    
    statusInterval = setInterval(async () => {
      const stepAssigned = document.getElementById("step-assigned");
      const stepResolved = document.getElementById("step-resolved");
      try {
        const res = await fetch(`${API_BASE}/api/requests/${requestId}`);
        if (res.ok) {
          const data = await res.json();
          const request = data.request;
          const status = request.status;
          const hasVolunteer = !!request.matchedVolunteer;

          if (stepAssigned && stepResolved) {
            stepAssigned.className = "step";
            stepResolved.className = "step";

            if (status === "Open") {
              if (hasVolunteer) {
                stepAssigned.classList.add("completed");
              } else {
                stepAssigned.classList.add("active");
              }
            } else if (status === "In Progress") {
              stepAssigned.classList.add("completed");
              stepResolved.classList.add("active");
            } else if (status === "Resolved") {
              stepAssigned.classList.add("completed");
              stepResolved.classList.add("completed");
              clearInterval(statusInterval);
            }
          }

          renderLiveTimeline(request.timeline);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 3000);
  }

  function showResult(success, data) {
    resultBanner.classList.remove("d-none", "alert-success", "alert-danger");

    if (success) {
      if (statusInterval) clearInterval(statusInterval);
      if (placeholderContent) placeholderContent.classList.add("d-none");

      // WhatsApp quick message
      let volunteer = "No volunteer available right now — an NGO coordinator will follow up.";
      if (data.matchedVolunteer) {
        const waMessage = `Hi ${data.matchedVolunteer.name}, I just submitted a request for ${data.category} help in ${data.zone}.\n\nMy Details:\n- Description: ${data.description}\n- Address: ${data.address}\n- My Phone: ${data.victimPhone}\n\nCould you please assist me? (ID: ${data.id})`;
        const waLink = `https://wa.me/${data.matchedVolunteer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waMessage)}`;
        
        volunteer = `<strong>${data.matchedVolunteer.name}</strong><br>
           <i class="bi bi-star-fill text-warning me-1"></i>Specialty: ${data.matchedVolunteer.skills.join(", ")}<br>
           <i class="bi bi-telephone-fill text-success me-1"></i>Contact: <a href="tel:${data.matchedVolunteer.phone}">${data.matchedVolunteer.phone}</a><br>
           <a href="${waLink}" target="_blank" class="btn-whatsapp">
             <i class="bi bi-whatsapp"></i> Message on WhatsApp
           </a>`;
      }

      // AI translation banner if detected
      let translationHtml = '';
      if (data.detectedLanguage && data.detectedLanguage.toLowerCase() !== 'english' && data.translatedDescription) {
        translationHtml = `
          <div class="p-2 rounded mb-3 text-start" style="font-size:0.82rem; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-left: 4px solid var(--brand-primary); color: #c7d2fe;">
            <i class="bi bi-translate me-1 text-primary animate-pulse"></i> <strong>AI Translated (${data.detectedLanguage} ➔ English):</strong> "${data.translatedDescription}"
          </div>
        `;
      }

      resultBanner.classList.add("alert", "alert-success");
      resultBanner.innerHTML = `
        <h5 class="mb-2"><i class="bi bi-check-circle-fill me-2"></i>Request Submitted!</h5>
        <p class="mb-1">
          <strong>Category:</strong> ${getCategoryWithIcon(data.category)} &nbsp;|&nbsp;
          <strong>Urgency:</strong> ${data.urgency}/5
        </p>
        ${translationHtml}
        <p class="mb-1"><strong>Matched Volunteer:</strong></p>
        <div class="p-3 rounded mb-3" style="font-size:0.88rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--text-light);">${volunteer}</div>
        
        <p class="mb-2 fw-bold" style="font-size:0.88rem; color: var(--text-light);">Live Tracker:</p>
        <div class="status-stepper">
          <div class="step completed" id="step-submitted">
            <div class="step-icon"><i class="bi bi-send-fill"></i></div>
            Submitted
          </div>
          <div class="step ${data.matchedVolunteer ? "completed" : "active"}" id="step-assigned">
            <div class="step-icon"><i class="bi bi-person-badge"></i></div>
            Assigned
          </div>
          <div class="step" id="step-resolved">
            <div class="step-icon"><i class="bi bi-check2-circle"></i></div>
            Resolved
          </div>
        </div>
        <p class="mb-0 text-muted mt-3" style="font-size:0.82rem;">Request ID: ${data.id}</p>
        
        <div class="mt-4 pt-3 border-top border-secondary-subtle text-start">
          <p class="mb-2 fw-bold" style="font-size:0.82rem; color: var(--text-muted);"><i class="bi bi-clock-history me-1"></i>Live Action Log:</p>
          <div id="tracker-timeline-container" class="timeline-container">
            <!-- Dynamic timeline populated here -->
          </div>
        </div>
      `;

      setTimeout(() => {
        renderLiveTimeline(data.timeline);
      }, 0);

      startStatusTracking(data.id);
    } else {
      resultBanner.classList.add("alert", "alert-danger");
      resultBanner.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <strong>Error:</strong> ${data}
      `;
    }
  }

  // ── GPS Geolocation handler ──────────────────────────────────
  const gpsBtn = document.getElementById("gps-btn");
  if (gpsBtn) {
    gpsBtn.addEventListener("click", () => {
      const addressField = document.getElementById("address");
      if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser. Please type your address manually.", "warning");
        addressField.focus();
        return;
      }

      gpsBtn.disabled = true;
      const originalHtml = gpsBtn.innerHTML;
      gpsBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" style="width:0.85rem; height:0.85rem;" role="status"></span>Locating...`;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          let localityText = "";
          try {
            // Use BigDataCloud's free reverse geocoding API for fast client-side locality lookup
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
            console.warn("Reverse geocoding failed or offline, falling back to raw coordinates:", e);
          }

          if (localityText) {
            addressField.value = `${localityText}${lat.toFixed(6)}, Lng ${lng.toFixed(6)}) (https://maps.google.com/?q=${lat},${lng})`;
          } else {
            addressField.value = `GPS: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)} (https://maps.google.com/?q=${lat},${lng})`;
          }

          gpsBtn.disabled = false;
          gpsBtn.innerHTML = `<i class="bi bi-check-lg text-success me-1"></i>Shared`;
          setTimeout(() => {
            gpsBtn.innerHTML = originalHtml;
          }, 3000);
        },
        (error) => {
          console.error("GPS Error:", error);
          gpsBtn.disabled = false;
          gpsBtn.innerHTML = originalHtml;
          showToast("Unable to retrieve location automatically. Please enter your address manually.", "danger");
          addressField.focus();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const description = document.getElementById("description").value.trim();
    const zone        = document.getElementById("zone").value;
    const victimPhone = document.getElementById("victim-phone").value.trim();
    const address     = document.getElementById("address").value.trim();

    if (!description) {
      showResult(false, "Please describe the need before submitting.");
      return;
    }
    if (!victimPhone) {
      showResult(false, "Please enter your contact phone number.");
      return;
    }
    if (!zone) {
      showResult(false, "Please select your nearest locality.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ description, zone, victimPhone, address }),
      });

      const data = await response.json();

      // ── Special case: rate limit hit (HTTP 429) ──────────────
      // Show a dedicated countdown banner instead of a generic error.
      if (response.status === 429) {
        showRateLimitError(15);
        return; // Don't fall through to generic error handler
      }

      if (!response.ok) {
        throw new Error(data.error || "Unknown server error.");
      }

      form.reset();
      
      // Fire celebration confetti!
      if (window.confetti) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
      showToast("Emergency request reported successfully! Redirecting to tracking portal...", "success");
      setTimeout(() => {
        window.location.href = `tracking.html?id=${data.id}`;
      }, 1500);
    } catch (err) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  });
}

// =============================================================
// PAGE 2 — dashboard.html (NGO Kanban Dashboard)
// =============================================================
if (isDashboardPage) {
  let allRequests = [];
  let activeCategory = "All";
  let searchQuery = "";
  let allVolunteers = [];
  let volunteerSearchQuery = "";
  const expandedRequestIds = new Set(); // Track expanded resolved cards to persist state over auto-refreshes

  let isInitialLoad = true;
  const notifiedRequestIds = new Set();
  let unsubscribeFirestore = null;

  const notificationBtn = document.getElementById("notification-btn");

  // Play notification chime using Web Audio API
  function playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (frequency, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playTone(880, now, 0.15);
      playTone(1200, now + 0.15, 0.25);
    } catch (e) {
      console.warn("Failed to play notification sound:", e);
    }
  }

  // Update navbar alerts button text and style
  function updateNotificationButton() {
    if (!notificationBtn) return;
    if (!("Notification" in window)) {
      notificationBtn.classList.add("d-none");
      return;
    }
    notificationBtn.classList.remove("d-none");
    if (Notification.permission === "granted") {
      notificationBtn.innerHTML = `<i class="bi bi-bell-fill text-success me-1"></i>Alerts Active`;
      notificationBtn.className = "btn btn-outline-success btn-sm";
      notificationBtn.disabled = true;
    } else if (Notification.permission === "denied") {
      notificationBtn.innerHTML = `<i class="bi bi-bell-slash text-danger me-1"></i>Alerts Blocked`;
      notificationBtn.className = "btn btn-outline-danger btn-sm";
      notificationBtn.disabled = true;
    } else {
      notificationBtn.innerHTML = `<i class="bi bi-bell-fill animate-pulse me-1"></i>Enable Alerts`;
      notificationBtn.className = "btn btn-outline-warning btn-sm";
      notificationBtn.disabled = false;
    }
  }

  // Fire system and in-app notifications for critical requests
  function fireUrgency5Notification(reqId, reqData) {
    playNotificationSound();
    
    // In-app toast
    showToast(`🔴 CRITICAL EMERGENCY: ${reqData.description} (${reqData.zone})`, "danger");

    if (Notification.permission === "granted") {
      const notification = new Notification("CRITICAL EMERGENCY (Urgency 5)", {
        body: `[${reqData.category}] ${reqData.description}\nHub: ${reqData.zone}\nPhone: ${reqData.victimPhone}`,
        icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
        tag: reqId,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        const card = document.getElementById(`card-${reqId}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("highlight-card");
          setTimeout(() => card.classList.remove("highlight-card"), 5000);
        }
        notification.close();
      };
    }
  }

  // Setup click handler for notifications registration button
  if (notificationBtn) {
    updateNotificationButton();
    notificationBtn.addEventListener("click", () => {
      Notification.requestPermission().then((permission) => {
        updateNotificationButton();
        if (permission === "granted") {
          showToast("Urgency-5 browser alerts enabled successfully!", "success");
          playNotificationSound();
        }
      });
    });
  }

  // Start the Firestore live stream
  function startLiveListener() {
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK is not available. Using polling fallback.");
      return;
    }

    try {
      const firebaseConfig = {
        projectId: "smart-resource-allocatio-156d4"
      };
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      const firestoreDb = firebase.firestore();

      unsubscribeFirestore = firestoreDb.collection("requests")
        .orderBy("urgency", "desc")
        .onSnapshot((snapshot) => {
          console.log("🔥 Live Firestore update received");
          
          const requests = [];
          snapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
          });

          // Detect new urgency-5 open requests to notify
          if (!isInitialLoad) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added" || change.type === "modified") {
                const reqData = change.doc.data();
                const reqId = change.doc.id;
                if (reqData.urgency === 5 && reqData.status === "Open" && !notifiedRequestIds.has(reqId)) {
                  notifiedRequestIds.add(reqId);
                  fireUrgency5Notification(reqId, reqData);
                }
              }
            });
          } else {
            // Populate initial set to avoid notifying for existing requests
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.urgency === 5 && data.status === "Open") {
                notifiedRequestIds.add(doc.id);
              }
            });
            isInitialLoad = false;
            
            // Hide skeleton load if this is the initial snapshot
            loadingState.classList.add("d-none");
            if (currentView === "board") {
              kanbanBoard.classList.remove("d-none");
            } else {
              mapViewContainer.classList.remove("d-none");
              initMap();
              setTimeout(() => {
                map.invalidateSize();
                applyFilters();
              }, 100);
            }
          }

          allRequests = requests;
          applyFilters();
        }, (error) => {
          console.error("Firestore onSnapshot subscription failed, falling back to REST polling:", error);
          unsubscribeFirestore = null;
          loadRequests();
        });
    } catch (e) {
      console.error("Firebase connection initialization failed, falling back to REST polling:", e);
      unsubscribeFirestore = null;
    }
  }

  // DOM references
  const kanbanBoard    = document.getElementById("kanban-board");
  const loadingState   = document.getElementById("loading-state");
  const errorState     = document.getElementById("error-state");
  const errorMessage   = document.getElementById("error-message");
  const refreshBtn     = document.getElementById("refresh-btn");

  const searchFilterInput = document.getElementById("search-filter");
  const filterButtons = document.querySelectorAll(".btn-filter");

  const volunteersList = document.getElementById("volunteers-list");
  const volunteerSearchInput = document.getElementById("volunteer-search");

  const btnViewBoard = document.getElementById("btn-view-board");
  const btnViewMap = document.getElementById("btn-view-map");
  const btnViewBlockchain = document.getElementById("btn-view-blockchain");
  const mapViewContainer = document.getElementById("map-view-container");
  const blockchainViewContainer = document.getElementById("blockchain-view-container");

  let currentView = "board"; // "board" or "map" or "blockchain"
  let map = null;
  let mapMarkers = [];
  let shouldFitMapBounds = true;

  // Column containers (one per status)
  const colOpen        = document.getElementById("col-open");
  const colProgress    = document.getElementById("col-progress");
  const colResolved    = document.getElementById("col-resolved");

  // Stat counters
  const statTotal      = document.getElementById("stat-total");
  const statOpen       = document.getElementById("stat-open");
  const statProgress   = document.getElementById("stat-progress");
  const statResolved   = document.getElementById("stat-resolved");

  // Column badge counters
  const countOpen      = document.getElementById("count-open");
  const countProgress  = document.getElementById("count-progress");
  const countResolved  = document.getElementById("count-resolved");

  function urgencyLabel(u) {
    const labels = {
      1: "Low",
      2: "Minor",
      3: "Moderate",
      4: "High",
      5: "Critical",
    };
    return labels[u] || u;
  }

  function getCategoryWithIcon(category) {
    const icons = {
      "Medical": "🏥 Medical",
      "Food": "🍎 Food",
      "Shelter": "🏠 Shelter",
      "Life Jackets": "🛟 Life Jackets",
      "Other": "ℹ️ Other"
    };
    return icons[category] || category;
  }

  function parseDate(createdAt) {
    if (!createdAt) return new Date();
    if (createdAt.seconds !== undefined) {
      return new Date(createdAt.seconds * 1000);
    }
    if (createdAt._seconds !== undefined) {
      return new Date(createdAt._seconds * 1000);
    }
    return new Date(createdAt);
  }

  function formatAddressHtml(address) {
    if (!address) return "N/A";
    
    // Look for Google Maps link, e.g. (https://maps.google.com/?q=lat,lng) or similar
    const mapsUrlRegex = /(https?:\/\/maps\.google\.com\/\?q=[^\s\)]+)/i;
    const match = address.match(mapsUrlRegex);
    
    if (match) {
      const url = match[1];
      // Clean up the text version of address to not show the ugly URL
      // Remove the URL portion and parentheses around it. E.g. " (https://maps.google.com/?q=...)"
      let cleanText = address.replace(/\s*\(\s*https?:\/\/maps\.google\.com\/\?q=[^\s\)]+\s*\)/gi, "");
      // Just in case there are no parentheses around the URL
      cleanText = cleanText.replace(mapsUrlRegex, "");
      cleanText = cleanText.trim();
      
      return `
        <span>${cleanText || "GPS Location"}</span>
        <div class="mt-1">
          <a href="${url}" target="_blank" class="btn-maps">
            <i class="bi bi-geo-alt-fill"></i> Open in Google Maps
          </a>
        </div>
      `;
    }
    
    // Fallback if there is some other URL, but not Google Maps
    const genericUrlRegex = /(https?:\/\/[^\s]+)/i;
    const genericMatch = address.match(genericUrlRegex);
    if (genericMatch) {
      const url = genericMatch[1];
      let cleanText = address.replace(url, "").trim();
      cleanText = cleanText.replace(/\(\s*\)/g, "").trim();
      return `
        <span>${cleanText || "External Link"}</span>
        <div class="mt-1">
          <a href="${url}" target="_blank" class="btn-maps" style="background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.3); color: #c7d2fe !important;">
            <i class="bi bi-box-arrow-up-right"></i> Open Link
          </a>
        </div>
      `;
    }
    
    return address;
  }

  function buildCard(req) {
    const urgencyClass = `u${req.urgency}`;
    const sourceClass = req.source === "SMS" ? "sms" : "web";
    const sourceLabel = req.source === "SMS" ? "📟 SMS" : "🌐 Web";
    const sourceBadge = `<span class="badge-source ${sourceClass} ms-2">${sourceLabel}</span>`;
    
    // SLA and elapsed time calculations
    const createdDate = parseDate(req.createdAt);
    const minutesOpen = Math.floor((new Date() - createdDate) / 60000);
    const isSlaViolation = req.status === "Open" && req.urgency === 5 && minutesOpen >= 5;
    
    let durationText = "";
    if (req.status !== "Resolved") {
      const minutes = Math.max(0, minutesOpen);
      durationText = `<span class="d-inline-block text-muted fw-semibold" style="font-size:0.72rem;" title="Time elapsed since request creation"><i class="bi bi-clock me-1"></i>${req.status} for ${minutes}m</span>`;
    }

    const slaBadge = isSlaViolation
      ? `<span class="badge-sla ms-2"><i class="bi bi-exclamation-triangle-fill"></i> SLA EXCEEDED</span>`
      : "";

    const volunteerHtml = req.matchedVolunteer
      ? `<div class="volunteer-chip">
           <i class="bi bi-person-check-fill me-1"></i>
           <strong>${req.matchedVolunteer.name}</strong><br>
           <i class="bi bi-telephone-fill me-1 text-success"></i><a href="tel:${req.matchedVolunteer.phone}">${req.matchedVolunteer.phone}</a>
         </div>`
      : `<div class="volunteer-chip" style="background:rgba(245,158,11,0.06); border-color:rgba(245,158,11,0.2); color:#fbbf24;">
           <i class="bi bi-person-x"></i> No volunteer matched yet
         </div>`;

    let suppliesHtml = "";
    if (req.allocatedSupplies && req.allocatedSupplies.length > 0) {
      suppliesHtml = `
        <div class="mt-2 mb-2 p-2 rounded text-start" style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.16); font-size: 0.75rem; color: #a7f3d0;">
          <strong style="color: #34d399;"><i class="bi bi-box-seam me-1"></i>Allocated Supplies:</strong>
          <div class="d-flex flex-wrap gap-1 mt-1">
            ${req.allocatedSupplies.map(s => `<span class="badge bg-success-subtle text-success border border-success-subtle py-1 px-2" style="font-size:0.68rem; border-radius: 4px;">${s.item} x${s.quantity}</span>`).join('')}
          </div>
        </div>
      `;
    }

    const statuses = ["Open", "In Progress", "Resolved"];
    const optionsHtml = statuses
      .map(
        (s) =>
          `<option value="${s}" ${s === req.status ? "selected" : ""}>${s}</option>`
      )
      .join("");

    const clusteredHtml = req.clusteredReports && req.clusteredReports.length > 0
      ? `<div class="mt-2 pt-2 border-top border-black border-dashed">
           <a class="meta d-inline-flex align-items-center" data-bs-toggle="collapse" href="#clustered-${req.id}" role="button" aria-expanded="false" aria-controls="clustered-${req.id}" style="font-size:0.72rem; color: #0050cc; text-decoration:underline; font-weight: 800;">
             <i class="bi bi-people-fill me-1"></i>View Clustered Reports (${req.clusteredReports.length})
           </a>
           <div style="display: none;" class="mt-2" id="clustered-${req.id}">
             <div class="clustered-reports-list" style="font-size:0.72rem;">
               ${req.clusteredReports.map((cReport, idx) => {
                 const time = new Date(cReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 const date = new Date(cReport.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                 return `
                   <div class="clustered-report-item mb-2 pb-2" style="border-bottom: 1px dashed rgba(0,0,0,0.15);">
                     <div class="d-flex justify-content-between align-items-center mb-1">
                       <span class="text-slate-600 fw-bold">Report #${idx + 2} (${date}, ${time})</span>
                       <span class="badge-source ${cReport.detectedLanguage ? 'sms' : 'web'} text-xs" style="font-size: 0.65rem; padding: 0.1rem 0.3rem;">
                         ${cReport.detectedLanguage ? '📟 ' + cReport.detectedLanguage : '🌐 English'}
                       </span>
                     </div>
                     <div class="text-black mb-1 fw-bold" style="white-space: normal;">"${cReport.description}"</div>
                     ${(cReport.detectedLanguage && cReport.detectedLanguage.toLowerCase() !== 'english' && cReport.translatedDescription) ? 
                       `<div class="mb-1 font-bold" style="font-size: 0.72rem; color: #006e27;">
                         <i class="bi bi-translate me-1"></i> Translated: "${cReport.translatedDescription}"
                        </div>` : ''
                     }
                     <div class="text-slate-700 mb-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i>Address: ${formatAddressHtml(cReport.address)}</div>
                     <div class="text-slate-700"><i class="bi bi-telephone-fill text-success me-1"></i>Contact: <a href="tel:${cReport.victimPhone}" class="text-secondary font-bold">${cReport.victimPhone}</a></div>
                   </div>
                 `;
               }).join("")}
             </div>
           </div>
         </div>`
      : "";

    const timelineHtml = req.timeline && req.timeline.length > 0
      ? `<div class="mt-2 pt-2 border-top border-black border-dashed">
           <a class="meta d-inline-flex align-items-center" data-bs-toggle="collapse" href="#timeline-${req.id}" role="button" aria-expanded="false" aria-controls="timeline-${req.id}" style="font-size:0.72rem; color: #555555; text-decoration:underline; font-weight: 800;">
             <i class="bi bi-clock-history me-1"></i>View Action Log (${req.timeline.length})
           </a>
           <div style="display: none;" class="mt-2" id="timeline-${req.id}">
             <div class="timeline-container p-0 m-0" style="padding-left:1rem !important; font-size:0.72rem;">
               ${req.timeline.map(t => {
                 const time = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 return `
                   <div class="timeline-event mb-1 pb-1" style="margin-bottom:0.4rem !important; border-bottom: 1px dashed rgba(0,0,0,0.15);">
                     <span class="timeline-event-time" style="font-size:0.68rem; display:inline; color:#555; font-weight:bold;">[${time}]</span>
                     <span class="timeline-event-note" style="color:#111; font-weight:600; font-size:0.72rem;">${t.note}</span>
                   </div>
                 `;
               }).join("")}
             </div>
           </div>
         </div>`
      : "";

    if (req.status === "Resolved") {
      const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = createdDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const formattedTime = `${dateStr}, ${timeStr}`;
      const isExpanded = expandedRequestIds.has(req.id);

      return `
        <div class="request-card urgency-${req.urgency} resolved-compact-card ${isExpanded ? 'expanded' : ''}" id="card-${req.id}">
          <div class="compact-header">
            <p class="compact-desc">
              ${req.clusteredReports && req.clusteredReports.length > 0 ? `<span class="badge-clustered me-2" style="font-size: 0.65rem;"><i class="bi bi-people-fill"></i> +${req.clusteredReports.length}</span>` : ''}
              ${req.description}
            </p>
            <span class="compact-meta">
              <i class="bi bi-check-circle-fill text-success" style="font-size: 0.82rem;"></i>
              ${formattedTime}
            </span>
          </div>
          
          <div class="card-expanded-content">
            <div class="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
              <div>
                <span class="badge-category">${getCategoryWithIcon(req.category)}</span>
                ${sourceBadge}
                ${req.clusteredReports && req.clusteredReports.length > 0 ? `<span class="badge-clustered ms-2"><i class="bi bi-people-fill"></i> +${req.clusteredReports.length} reports</span>` : ''}
              </div>
              <div class="d-flex align-items-center">
                <span class="badge-urgency ${urgencyClass}">
                  ⚡ ${urgencyLabel(req.urgency)}
                </span>
              </div>
            </div>
            
            <p class="description mb-2" style="white-space: normal;">
              ${req.description}
              ${(req.detectedLanguage && req.detectedLanguage.toLowerCase() !== 'english' && req.translatedDescription) ? 
                `<span class="d-block mt-2 p-2 rounded" style="font-size: 0.82rem; background: rgba(45, 154, 78, 0.08); border: 1px solid rgba(45, 154, 78, 0.2); border-left: 4px solid var(--brand-primary); color: #1b6b37;">
                  <i class="bi bi-translate me-1"></i> <strong>Translated (${req.detectedLanguage}):</strong> "${req.translatedDescription}"
                 </span>` : ''
              }
            </p>
            
            <div class="meta mb-1">
              <i class="bi bi-geo-alt-fill text-danger me-1"></i><strong>Address:</strong> ${formatAddressHtml(req.address)}
            </div>
            <div class="meta mb-1">
              <i class="bi bi-telephone-fill text-primary me-1"></i><strong>Contact:</strong> <a href="tel:${req.victimPhone}">${req.victimPhone || "N/A"}</a>
            </div>
            <div class="meta mb-2">
              <i class="bi bi-map me-1"></i>Hub: ${req.zone}
            </div>
            ${suppliesHtml}
            ${volunteerHtml}
            
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2">
              <div class="d-flex align-items-center gap-2">
                <span class="meta mb-0 font-bold">Status:</span>
                <span class="px-2.5 py-1 border-2 border-black bg-primary-container text-on-primary-container font-bold text-xs uppercase">Resolved</span>
              </div>
            </div>
            ${clusteredHtml}
            ${timelineHtml}
          </div>
        </div>
      `;
    }

    return `
      <div class="request-card urgency-${req.urgency} ${isSlaViolation ? 'sla-violation' : ''}" id="card-${req.id}">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
          <div>
            <span class="badge-category">${getCategoryWithIcon(req.category)}</span>
            ${sourceBadge}
            ${req.clusteredReports && req.clusteredReports.length > 0 ? `<span class="badge-clustered ms-2"><i class="bi bi-people-fill"></i> +${req.clusteredReports.length} reports</span>` : ''}
          </div>
          <div class="d-flex align-items-center">
            <span class="badge-urgency ${urgencyClass}">
              ⚡ ${urgencyLabel(req.urgency)}
            </span>
            ${slaBadge}
          </div>
        </div>
        <p class="description mb-2">
          ${req.description}
          ${(req.detectedLanguage && req.detectedLanguage.toLowerCase() !== 'english' && req.translatedDescription) ? 
            `<span class="d-block mt-2 p-2 rounded text-indigo" style="font-size: 0.82rem; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-left: 4px solid var(--brand-primary); color: #c7d2fe;">
              <i class="bi bi-translate me-1"></i> <strong>Translated (${req.detectedLanguage}):</strong> "${req.translatedDescription}"
             </span>` : ''
          }
        </p>
        <div class="meta mb-1">
          <i class="bi bi-geo-alt-fill text-danger me-1"></i><strong>Address:</strong> ${formatAddressHtml(req.address)}
        </div>
        <div class="meta mb-1">
          <i class="bi bi-telephone-fill text-primary me-1"></i><strong>Contact:</strong> <a href="tel:${req.victimPhone}">${req.victimPhone || "N/A"}</a>
        </div>
        <div class="meta mb-2">
          <i class="bi bi-map me-1"></i>Hub: ${req.zone}
        </div>
        ${suppliesHtml}
        ${volunteerHtml}
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2">
          <div class="d-flex align-items-center gap-2">
            <label for="status-${req.id}" class="meta mb-0">Status:</label>
            <select
              id="status-${req.id}"
              class="status-select"
              data-id="${req.id}"
            >${optionsHtml}</select>
            <button class="delete-btn" data-id="${req.id}" title="Delete Request Permanently">
              <i class="bi bi-trash3-fill"></i>
            </button>
          </div>
          ${durationText}
        </div>
        ${clusteredHtml}
        ${timelineHtml}
      </div>
    `;
  }

  function renderRequests(requests) {
    const open       = requests.filter((r) => r.status === "Open");
    const inProgress = requests.filter((r) => r.status === "In Progress");
    const resolved   = requests.filter((r) => r.status === "Resolved");

    // Sort resolved requests: most recently resolved first
    resolved.sort((a, b) => {
      const timeA = (a.timeline || [])
        .filter(t => t.status === "Resolved")
        .map(t => new Date(t.timestamp).getTime())
        .pop() || parseDate(a.createdAt).getTime();
      const timeB = (b.timeline || [])
        .filter(t => t.status === "Resolved")
        .map(t => new Date(t.timestamp).getTime())
        .pop() || parseDate(b.createdAt).getTime();
      return timeB - timeA;
    });

    // ── Update stats bar (using allRequests total) ─────────────
    const fullOpen = allRequests.filter(r => r.status === "Open");
    const fullProgress = allRequests.filter(r => r.status === "In Progress");
    const fullResolved = allRequests.filter(r => r.status === "Resolved");

    statTotal.textContent    = allRequests.length;
    statOpen.textContent     = fullOpen.length;
    statProgress.textContent = fullProgress.length;
    statResolved.textContent = fullResolved.length;

    countOpen.textContent     = open.length;
    countProgress.textContent = inProgress.length;
    countResolved.textContent = resolved.length;

    function fillColumn(container, items) {
      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-column">
            <i class="bi bi-inbox fs-4 d-block mb-2"></i>No matching requests
          </div>`;
      } else {
        container.innerHTML = items.map(buildCard).join("");
      }
    }

    fillColumn(colOpen,     open);
    fillColumn(colProgress, inProgress);
    fillColumn(colResolved, resolved);

    // Click event handler to expand/collapse resolved compact cards
    document.querySelectorAll(".resolved-compact-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (
          e.target.closest("select") || 
          e.target.closest("button") || 
          e.target.closest("a") || 
          e.target.closest("option") ||
          e.target.closest(".collapse") ||
          e.target.closest(".timeline-container") ||
          e.target.closest(".clustered-reports-list")
        ) {
          return;
        }
        const requestId = card.id.replace("card-", "");
        if (card.classList.contains("expanded")) {
          card.classList.remove("expanded");
          expandedRequestIds.delete(requestId);
        } else {
          card.classList.add("expanded");
          expandedRequestIds.add(requestId);
        }
      });
    });

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const requestId = e.target.dataset.id;
        const newStatus = e.target.value;
        await updateStatus(requestId, newStatus);
      });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const button = e.target.closest(".delete-btn");
        if (!button) return;
        const requestId = button.dataset.id;
        if (confirm("Are you sure you want to delete this request permanently from the database?")) {
          await deleteRequest(requestId);
        }
      });
    });

    const clearResolvedBtn = document.getElementById("clear-resolved-btn");
    if (clearResolvedBtn) {
      clearResolvedBtn.style.display = resolved.length > 0 ? "inline-flex" : "none";
    }
  }

  function applyFilters() {
    let filtered = allRequests;

    if (activeCategory !== "All") {
      filtered = filtered.filter(r => r.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        (r.description && r.description.toLowerCase().includes(query)) ||
        (r.address && r.address.toLowerCase().includes(query)) ||
        (r.victimPhone && r.victimPhone.toLowerCase().includes(query)) ||
        (r.zone && r.zone.toLowerCase().includes(query)) ||
        (r.category && r.category.toLowerCase().includes(query)) ||
        (r.matchedVolunteer && r.matchedVolunteer.name && r.matchedVolunteer.name.toLowerCase().includes(query)) ||
        (r.clusteredReports && r.clusteredReports.some(c => 
          (c.description && c.description.toLowerCase().includes(query)) ||
          (c.address && c.address.toLowerCase().includes(query)) ||
          (c.victimPhone && c.victimPhone.toLowerCase().includes(query))
        ))
      );
    }

    renderRequests(filtered);

    if (currentView === "map") {
      updateMapMarkers(filtered);
    }
  }

  function updateInventoryUI(inventory) {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody) return;

    let html = "";
    let totalFood = 0;
    let totalMedical = 0;
    let totalShelter = 0;
    let totalLifeJackets = 0;

    if (inventory && typeof inventory === "object" && !inventory.hasOwnProperty("Food Packets")) {
      for (const [zone, stock] of Object.entries(inventory)) {
        const food = stock["Food Packets"] || 0;
        const lifeJackets = stock["Life Jackets"] || 0;
        const medical = stock["Medical Kits"] || 0;
        const shelter = stock["Shelter Kits"] || 0;

        totalFood += food;
        totalLifeJackets += lifeJackets;
        totalMedical += medical;
        totalShelter += shelter;

        html += `
          <tr>
            <td><strong>${zone}</strong></td>
            <td><span class="fw-bold ${food === 0 ? 'text-danger' : food < 10 ? 'text-warning' : 'text-success'}">${food}</span></td>
            <td><span class="fw-bold ${lifeJackets === 0 ? 'text-danger' : lifeJackets < 5 ? 'text-warning' : 'text-success'}">${lifeJackets}</span></td>
            <td><span class="fw-bold ${medical === 0 ? 'text-danger' : medical < 10 ? 'text-warning' : 'text-success'}">${medical}</span></td>
            <td><span class="fw-bold ${shelter === 0 ? 'text-danger' : shelter < 5 ? 'text-warning' : 'text-success'}">${shelter}</span></td>
          </tr>
        `;
      }
    } else {
      html = `<tr><td colspan="5" class="text-center text-muted">No zone-based stock found.</td></tr>`;
    }
    tbody.innerHTML = html;

    // Update the Overview widgets directly
    const ovFood = document.getElementById("ov-food");
    const ovMedical = document.getElementById("ov-medical");
    const ovShelter = document.getElementById("ov-shelter");
    const ovLifeJackets = document.getElementById("ov-lifejackets");
    if (ovFood) ovFood.textContent = totalFood;
    if (ovMedical) ovMedical.textContent = totalMedical;
    if (ovShelter) ovShelter.textContent = totalShelter;
    if (ovLifeJackets) ovLifeJackets.textContent = totalLifeJackets;

    // Update the Supplies top bar widgets directly
    const invFoodCount = document.getElementById("inv-Food-count");
    const invMedicalCount = document.getElementById("inv-Medical-count");
    const invShelterCount = document.getElementById("inv-Shelter-count");
    const invLifeJacketsCount = document.getElementById("inv-LifeJackets-count");
    if (invFoodCount) invFoodCount.textContent = totalFood;
    if (invMedicalCount) invMedicalCount.textContent = totalMedical;
    if (invShelterCount) invShelterCount.textContent = totalShelter;
    if (invLifeJacketsCount) invLifeJacketsCount.textContent = totalLifeJackets;
  }

  async function loadInventory() {
    try {
      const res = await fetch(`${API_BASE}/api/inventory`);
      if (res.ok) {
        const data = await res.json();
        updateInventoryUI(data.inventory);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
    }
  }

  // ── AI Insights Button Handler ──────────────────────────────
  const generateInsightsBtn = document.getElementById("generate-insights-btn");
  const aiInsightsContent = document.getElementById("ai-insights-content");
  
  if (generateInsightsBtn && aiInsightsContent) {
    generateInsightsBtn.addEventListener("click", async () => {
      generateInsightsBtn.disabled = true;
      const originalHtml = generateInsightsBtn.innerHTML;
      generateInsightsBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Analyzing...`;
      
      try {
        const res = await fetch(`${API_BASE}/api/insights`, {
          method: "POST"
        });
        if (res.ok) {
          const data = await res.json();
          aiInsightsContent.innerHTML = `<div class="ai-report-markdown text-dark p-2" style="line-height: 1.6;">${parseMarkdown(data.report)}</div>`;
        } else {
          showToast("Failed to generate AI insights", "danger");
        }
      } catch (err) {
        console.error("AI Insights request failed:", err);
        showToast("Error communicating with AI services.", "danger");
      } finally {
        generateInsightsBtn.disabled = false;
        generateInsightsBtn.innerHTML = originalHtml;
      }
    });
  }

  function parseMarkdown(md) {
    if (!md) return "";
    return md
      .replace(/^### (.*$)/gim, '<h6 class="fw-bold text-dark mt-3 mb-2"><i class="bi bi-chevron-right text-primary me-1"></i>$1</h6>')
      .replace(/^## (.*$)/gim, '<h5 class="fw-bold text-primary mt-4 mb-2">$1</h5>')
      .replace(/^# (.*$)/gim, '<h4 class="fw-extrabold text-success mt-4 mb-3">$1</h4>')
      .replace(/^\* (.*$)/gim, '<li class="ms-3 mb-1">$1</li>')
      .replace(/^\- (.*$)/gim, '<li class="ms-3 mb-1">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre class="bg-light p-2 rounded my-2" style="font-size:0.8rem;"><code>$1</code></pre>')
      .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  async function loadVolunteers() {
    try {
      const res = await fetch(`${API_BASE}/api/volunteers`);
      if (res.ok) {
        const data = await res.json();
        allVolunteers = data.volunteers || [];
        applyVolunteerFilters();
      }
    } catch (err) {
      console.error("Error loading volunteers:", err);
    }
  }

  async function loadRequests() {
    if (unsubscribeFirestore) {
      // If live updates are active, just reload volunteers and inventory via HTTP
      await Promise.all([loadVolunteers(), loadInventory()]);
      return;
    }

    loadingState.classList.remove("d-none");
    kanbanBoard.classList.add("d-none");
    mapViewContainer.classList.add("d-none");
    errorState.classList.add("d-none");

    try {
      // Fetch requests and volunteers in parallel for real-time consistency
      const [reqRes, volRes] = await Promise.all([
        fetch(`${API_BASE}/api/requests`),
        fetch(`${API_BASE}/api/volunteers`)
      ]);

      if (!reqRes.ok) {
        throw new Error(`Server returned ${reqRes.status}`);
      }

      const reqData = await reqRes.json();
      allRequests = reqData.requests || [];
      applyFilters();

      if (volRes.ok) {
        const volData = await volRes.json();
        allVolunteers = volData.volunteers || [];
        applyVolunteerFilters();
      }

      await loadInventory();

      loadingState.classList.add("d-none");
      if (currentView === "board") {
        kanbanBoard.classList.remove("d-none");
      } else if (currentView === "map") {
        mapViewContainer.classList.remove("d-none");
        initMap();
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
            applyFilters();
          }
        }, 100);
      } else if (currentView === "blockchain") {
        if (blockchainViewContainer) {
          blockchainViewContainer.classList.remove("d-none");
        }
      }
    } catch (err) {
      loadingState.classList.add("d-none");
      errorState.classList.remove("d-none");
      errorMessage.textContent = `Could not load requests: ${err.message}. Is the server running?`;
    }
  }

  function renderVolunteers(volunteers) {
    if (!volunteersList) return;

    if (volunteers.length === 0) {
      volunteersList.innerHTML = `
        <div class="empty-column py-4" style="border-style: dashed;">
          <i class="bi bi-people fs-4 d-block mb-1"></i>No volunteers found
        </div>`;
      return;
    }

    volunteersList.innerHTML = volunteers
      .map((vol) => {
        const statusClass = vol.available ? "available" : "busy";
        const statusLabel = vol.available ? "Available" : "Busy";
        
        const skillsBadges = vol.skills
          .map(s => `<span class="roster-skill-badge">${s}</span>`)
          .join("");

        const ratingVal = vol.averageRating ? vol.averageRating.toFixed(1) : "5.0";
        const reviewsCount = vol.ratingCount || 0;
        const ratingHtml = `
          <div class="roster-meta" style="color: #d97706 !important; font-weight: 600; display: flex; align-items: center; gap: 4px;">
            <i class="bi bi-star-fill" style="color: #d97706 !important;"></i>Rating: <strong style="color: #d97706 !important;">${ratingVal}</strong> (${reviewsCount} review${reviewsCount === 1 ? '' : 's'})
            ${reviewsCount > 0 ? `<button class="btn btn-link btn-sm p-0 ms-2 view-reviews-btn" data-id="${vol.id}" style="color: #047857 !important; font-size: 0.72rem; font-weight: 700; text-decoration: underline; cursor: pointer; border: none; background: transparent;">View Feedbacks</button>` : ''}
          </div>
        `;

        const walletLabel = vol.walletAddress ? `${vol.walletAddress.substring(0, 8)}...${vol.walletAddress.substring(34)}` : 'No wallet';
        const walletHtml = `
          <div class="roster-meta text-white-50 font-monospace" style="font-size:0.75rem; word-break: break-all;" title="${vol.walletAddress || ''}">
            <i class="bi bi-wallet2 me-1"></i>Address: <span>${walletLabel}</span>
          </div>
        `;

        return `
          <div class="roster-card">
            <div class="roster-header">
              <span class="status-dot ${statusClass}" title="${statusLabel}"></span>
              <h4 class="roster-name" title="${vol.name}">${vol.name}</h4>
              <span class="roster-status-badge ${statusClass}">${statusLabel}</span>
              <button class="delete-vol-btn" data-id="${vol.id}" title="Remove Volunteer" style="background: transparent; border: none; color: var(--danger); font-size: 0.82rem; opacity: 0.5; transition: all 0.2s ease; cursor: pointer; padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center; margin-left: 0.35rem; border-radius: 4px;">
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
            <div class="roster-meta">
              <i class="bi bi-geo-alt-fill text-danger"></i>${vol.zone}
            </div>
            <div class="roster-meta">
              <i class="bi bi-telephone-fill text-success"></i>
              <a href="tel:${vol.phone}">${vol.phone}</a>
            </div>
            ${walletHtml}
            ${ratingHtml}
            <div class="roster-skills mt-2">
              <div class="roster-skills-badges">${skillsBadges}</div>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach click events for deleting volunteers
    document.querySelectorAll(".delete-vol-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const volId = btn.dataset.id;
        const volCard = btn.closest(".roster-card");
        const volName = volCard ? volCard.querySelector(".roster-name").textContent : "this volunteer";
        
        if (confirm(`Are you sure you want to remove volunteer "${volName}" permanently from the database?`)) {
          await deleteVolunteer(volId);
        }
      });
    });

    // Attach click events for viewing feedbacks
    document.querySelectorAll(".view-reviews-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const volId = btn.dataset.id;
        showVolunteerFeedbacks(volId);
      });
    });
  }

  function showVolunteerFeedbacks(volId) {
    const vol = allVolunteers.find(v => v.id === volId);
    if (!vol) return;

    // Gather feedbacks
    let volunteerFeedbacks = [];
    if (vol.feedbacks && Array.isArray(vol.feedbacks)) {
      volunteerFeedbacks = [...vol.feedbacks];
    }

    // Also pull dynamically from client-side requests list to make sure we get real-time ratings
    allRequests.forEach(r => {
      if (r.matchedVolunteer && r.matchedVolunteer.id === volId && r.rating !== undefined && r.rating !== null) {
        const exists = volunteerFeedbacks.some(f => f.requestId === r.id);
        if (!exists) {
          volunteerFeedbacks.push({
            requestId: r.id,
            rating: r.rating,
            comment: r.feedback || "No comment left.",
            timestamp: r.timeline && r.timeline.length > 0 ? r.timeline[r.timeline.length - 1].timestamp : null
          });
        }
      }
    });

    const modalBody = document.getElementById("feedbacks-modal-body");
    const modalTitle = document.getElementById("feedbacksModalLabel");
    if (!modalBody || !modalTitle) return;

    modalTitle.innerHTML = `<i class="bi bi-chat-text-fill me-2" style="color: #d97706 !important;"></i>Feedbacks for ${vol.name}`;

    if (volunteerFeedbacks.length === 0) {
      modalBody.innerHTML = `<div class="text-center text-muted py-4">No feedback comments recorded yet.</div>`;
    } else {
      // Sort feedbacks by timestamp (newest first)
      const sortedFeedbacks = volunteerFeedbacks.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      modalBody.innerHTML = sortedFeedbacks.map(f => {
        const stars = Array.from({ length: 5 }, (_, i) => {
          return i < f.rating 
            ? `<i class="bi bi-star-fill text-[#d97706]"></i>` 
            : `<i class="bi bi-star text-slate-300"></i>`;
        }).join('');

        const dateStr = f.timestamp 
          ? new Date(f.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
          : "Recently";

        return `
          <div class="p-3 mb-3 border-2 border-black bg-surface shadow-neu-sm">
            <div class="flex items-center justify-between mb-2">
              <div class="flex gap-1">${stars}</div>
              <span class="text-on-surface-variant font-bold" style="font-size: 0.72rem;">${dateStr}</span>
            </div>
            <p class="mb-0 text-on-surface font-bold" style="font-size: 0.82rem; font-style: italic;">"${f.comment}"</p>
          </div>
        `;
      }).join('');
    }

    const feedbacksModal = new bootstrap.Modal(document.getElementById("feedbacks-modal"));
    feedbacksModal.show();
  }

  function applyVolunteerFilters() {
    let filtered = allVolunteers;

    if (volunteerSearchQuery) {
      const query = volunteerSearchQuery.toLowerCase();
      filtered = filtered.filter(vol =>
        vol.name.toLowerCase().includes(query) ||
        vol.zone.toLowerCase().includes(query) ||
        vol.skills.some(skill => skill.toLowerCase().includes(query))
      );
    }

    renderVolunteers(filtered);
  }

  async function updateStatus(id, status) {
    try {
      const response = await fetch(`${API_BASE}/api/requests/${id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status.");
      }

      await loadRequests();
      
      const smsSenderPhoneInput = document.getElementById("sms-sender-phone");
      if (smsSenderPhoneInput && smsSenderPhoneInput.value && typeof loadSmsHistory === 'function') {
        await loadSmsHistory(smsSenderPhoneInput.value.trim());
      }
      
      if (status === "Resolved") {
        if (window.confetti) {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.5 }
          });
        }
        showToast("Request successfully resolved!", "success");
      } else {
        showToast(`Status updated to "${status}"`, "info");
      }
    } catch (err) {
      showToast(`Error updating status: ${err.message}`, "danger");
    }
  }

  async function deleteRequest(id) {
    try {
      const response = await fetch(`${API_BASE}/api/requests/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete request.");
      }

      await loadRequests();
      showToast("Request permanently deleted from system.", "warning");
    } catch (err) {
      showToast(`Error deleting request: ${err.message}`, "danger");
    }
  }

  async function deleteVolunteer(id) {
    try {
      const response = await fetch(`${API_BASE}/api/volunteers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete volunteer.");
      }

      await loadRequests();
      showToast("Volunteer removed successfully.", "warning");
    } catch (err) {
      showToast(`Error removing volunteer: ${err.message}`, "danger");
    }
  }

  searchFilterInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    applyFilters();
  });

  if (volunteerSearchInput) {
    volunteerSearchInput.addEventListener("input", (e) => {
      volunteerSearchQuery = e.target.value.trim();
      applyVolunteerFilters();
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.category;
      applyFilters();
    });
  });

  // ── Restock Form Submitter ──────────────────────────────────
  const restockForm = document.getElementById("restock-form");
  if (restockForm) {
    restockForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const zone = document.getElementById("restock-zone").value;
      const category = document.getElementById("restock-category").value;
      const quantity = parseInt(document.getElementById("restock-qty").value, 10);
      
      try {
        const res = await fetch(`${API_BASE}/api/inventory/restock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zone, category, quantity })
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Trigger a full page reload of the inventory table
          await loadInventory();
          
          // Hide Bootstrap Modal
          const modalEl = document.getElementById("restock-modal");
          if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
              modal.hide();
            } else {
              // Trigger close button click as fallback
              const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
              if (closeBtn) closeBtn.click();
            }
          }
          restockForm.reset();
          showToast(`Successfully restocked ${quantity} ${category} in ${zone}!`, "success");
        } else {
          const err = await res.json();
          showToast("Error restocking: " + err.error, "danger");
        }
      } catch (err) {
        console.error("Restock request failed:", err);
        showToast("Restock request failed to send.", "danger");
      }
    });
  }

  // ── Add Volunteer Form Submitter ─────────────────────────────
  const addVolunteerForm = document.getElementById("add-volunteer-form");
  if (addVolunteerForm) {
    addVolunteerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const name = document.getElementById("vol-name").value.trim();
      const phone = document.getElementById("vol-phone").value.trim();
      const zone = document.getElementById("vol-zone").value;
      const walletAddress = document.getElementById("vol-wallet").value.trim();
      
      // Collect selected skills
      const skillCheckboxes = document.querySelectorAll(".vol-skill-checkbox:checked");
      const skills = Array.from(skillCheckboxes).map(cb => cb.value);
      
      const errorEl = document.getElementById("skills-error");
      if (skills.length === 0) {
        if (errorEl) errorEl.classList.remove("d-none");
        return;
      } else {
        if (errorEl) errorEl.classList.add("d-none");
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/volunteers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, zone, skills, walletAddress })
        });
        
        if (res.ok) {
          const data = await res.json();
          showToast(`Volunteer ${data.volunteer.name} added successfully!`, "success");
          
          // Hide Bootstrap Modal
          const modalEl = document.getElementById("add-volunteer-modal");
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          } else {
            const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
            if (closeBtn) closeBtn.click();
          }
          
          addVolunteerForm.reset();
          
          // Refresh requests & roster dynamically
          await loadRequests();
        } else {
          const err = await res.json();
          showToast("Error adding volunteer: " + (err.error || "Unknown error"), "danger");
        }
      } catch (err) {
        console.error("Add volunteer request failed:", err);
        showToast("Error adding volunteer. Check network connection.", "danger");
      }
    });
  }

  refreshBtn.addEventListener("click", () => {
    shouldFitMapBounds = true;
    loadRequests();
  });

  const clearResolvedBtn = document.getElementById("clear-resolved-btn");
  if (clearResolvedBtn) {
    clearResolvedBtn.addEventListener("click", async () => {
      const count = parseInt(statResolved.textContent, 10) || 0;
      if (count === 0) return;
      
      if (confirm(`Are you sure you want to delete all ${count} resolved requests permanently from the database?`)) {
        try {
          const response = await fetch(`${API_BASE}/api/requests/resolved`, {
            method: "DELETE",
          });
          
          if (!response.ok) {
            throw new Error("Failed to delete resolved requests.");
          }
          
          await loadRequests();
          showToast("Resolved requests cleared successfully.", "success");
        } catch (err) {
          showToast(`Error clearing requests: ${err.message}`, "danger");
        }
      }
    });
  }

  // ── Leaflet Map View Functions ──
  function parseCoordinates(req) {
    if (req.address) {
      const gpsRegex = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = req.address.match(gpsRegex);
      if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
      }
    }
    
    // Fallback coordinates based on zone
    const zoneCoords = {
      "Vasind": [19.4038, 73.2642],
      "Kalyan": [19.2403, 73.1305],
      "Thane": [19.2183, 72.9781],
      "Mumbai Central": [18.9696, 72.8193]
    };
    
    const center = zoneCoords[req.zone] || [19.2183, 72.9781];
    
    // Generate deterministic scatter/jitter based on Request ID
    let hash = 0;
    const idStr = req.id || "";
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pseudoRandomLat = ((hash & 0xFF) / 255 - 0.5) * 0.012;
    const pseudoRandomLng = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.012;
    
    return [center[0] + pseudoRandomLat, center[1] + pseudoRandomLng];
  }

  function initMap() {
    if (map) return;
    
    // Center initially around Thane/Kalyan
    map = L.map("map-element").setView([19.23, 73.05], 11);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Dynamic listener for dropdown changes in popup
    map.on('popupopen', (e) => {
      const selectEl = e.popup.getElement().querySelector('.map-status-select');
      if (selectEl) {
        selectEl.addEventListener('change', async (event) => {
          const id = event.target.dataset.id;
          const status = event.target.value;
          await updateStatus(id, status);
        });
      }
    });
  }

  window.deleteFromMap = async function(id) {
    if (confirm("Are you sure you want to delete this request permanently?")) {
      await deleteRequest(id);
    }
  };

  function updateMapMarkers(requests) {
    if (!map) return;
    
    // Remove old markers
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];
    
    // Filter out resolved requests - only display Open and In Progress
    const activeRequests = requests.filter(r => r.status !== "Resolved");
    
    if (activeRequests.length === 0) return;
    
    const bounds = [];
    
    activeRequests.forEach(req => {
      const coords = parseCoordinates(req);
      bounds.push(coords);
      
      const statusClass = req.status.toLowerCase().replace(/\s+/g, '-');
      const markerHtml = `
        <div class="map-marker urgency-${req.urgency} status-${statusClass}">
          <div class="marker-pulse"></div>
          <div class="marker-dot"></div>
        </div>
      `;
      
      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      const marker = L.marker(coords, { icon: icon });
      
      const createdDate = parseDate(req.createdAt);
      const timeStr = createdDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      
      const sourceBadge = req.source === "SMS" 
        ? `<span class="badge bg-secondary text-white ms-1" style="font-size:0.65rem; padding: 0.15rem 0.35rem; vertical-align:middle;">📟 SMS</span>` 
        : `<span class="badge bg-primary text-white ms-1" style="font-size:0.65rem; padding: 0.15rem 0.35rem; vertical-align:middle;">🌐 Web</span>`;
         
      const urgencyLabels = { 1: "Low", 2: "Minor", 3: "Moderate", 4: "High", 5: "Critical" };
      const urgencyBadge = `<span class="badge bg-danger ms-1" style="font-size:0.65rem; padding: 0.15rem 0.35rem; vertical-align:middle;">⚡ ${urgencyLabels[req.urgency] || req.urgency}</span>`;
      const categoryWithIcon = getCategoryWithIcon(req.category);
      
      let volunteerText = "None assigned";
      if (req.matchedVolunteer) {
        volunteerText = `${req.matchedVolunteer.name} (<a href="tel:${req.matchedVolunteer.phone}" style="color:var(--brand-primary); text-decoration:none;">${req.matchedVolunteer.phone}</a>)`;
      }
      
      let translationText = "";
      if (req.detectedLanguage && req.detectedLanguage.toLowerCase() !== "english" && req.translatedDescription) {
        translationText = `
          <div style="font-size:0.75rem; color:#a5b4fc; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-left:3px solid var(--brand-primary); padding:6px; border-radius:6px; margin:6px 0;">
            <i class="bi bi-translate"></i> Translated (${req.detectedLanguage}): "${req.translatedDescription}"
          </div>
        `;
      }
      
      const addressHtml = req.address || "N/A";
      
      const popupHtml = `
        <div style="min-width: 210px; color: #fff;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong style="font-size: 0.95rem; color: #fff;">${categoryWithIcon}</strong>
            <div>${sourceBadge}${urgencyBadge}</div>
          </div>
          <div class="text-muted" style="font-size: 0.7rem; margin-bottom: 6px;">Reported: ${timeStr}</div>
          <p style="margin: 4px 0 8px 0; font-size: 0.82rem; color: #e2e8f0; line-height: 1.4;">${req.description}</p>
          ${translationText}
          <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:4px;"><i class="bi bi-geo-alt-fill text-danger me-1"></i><strong>Address:</strong> ${addressHtml}</div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:4px;"><i class="bi bi-telephone-fill text-success me-1"></i><strong>Contact:</strong> <a href="tel:${req.victimPhone}" style="color:var(--brand-primary); text-decoration:none;">${req.victimPhone}</a></div>
          <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:8px;"><i class="bi bi-person-check-fill text-primary me-1"></i><strong>Volunteer:</strong> ${volunteerText}</div>
          
          <div class="d-flex align-items-center gap-2 mt-2 pt-2 border-top border-secondary">
            <label style="font-size:0.72rem; color:#94a3b8; margin-bottom:0;">Status:</label>
            <select class="map-status-select" data-id="${req.id}">
              <option value="Open" ${req.status === "Open" ? "selected" : ""}>Open</option>
              <option value="In Progress" ${req.status === "In Progress" ? "selected" : ""}>In Progress</option>
              <option value="Resolved" ${req.status === "Resolved" ? "selected" : ""}>Resolved</option>
            </select>
            <button class="btn btn-link text-danger p-0 border-0 ms-auto" onclick="deleteFromMap('${req.id}')" title="Delete request" style="text-decoration:none;"><i class="bi bi-trash-fill"></i></button>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupHtml);
      marker.addTo(map);
      mapMarkers.push(marker);
    });
    
    if (shouldFitMapBounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
      shouldFitMapBounds = false;
    }
  }

  // ── Blockchain Explorer Logic ──
  async function loadBlockchainStats() {
    try {
      const [statsRes, blocksRes, sbtsRes] = await Promise.all([
        fetch(`${API_BASE}/api/blockchain/explorer/stats`),
        fetch(`${API_BASE}/api/blockchain/explorer/blocks`),
        fetch(`${API_BASE}/api/blockchain/explorer/sbts`)
      ]);

      if (statsRes.ok && blocksRes.ok && sbtsRes.ok) {
        const statsData = await statsRes.json();
        const blocksData = await blocksRes.json();
        const sbtsData = await sbtsRes.json();

        const stats = statsData.stats;
        document.getElementById("blockchain-net-name").textContent = stats.networkName;
        document.getElementById("blockchain-block-height").textContent = stats.blockHeight;
        document.getElementById("blockchain-total-sbts").textContent = stats.totalSBTs;
        document.getElementById("blockchain-contract-addr").textContent = stats.contractAddress;

        // Render Ledger Blocks & Transactions
        const ledgerBody = document.getElementById("blockchain-ledger-body");
        const ledgerEmpty = document.getElementById("blockchain-ledger-empty");
        const blocks = blocksData.blocks || [];
        
        // Extract transactions from blocks
        const txs = [];
        blocks.forEach(block => {
          (block.transactions || []).forEach(t => {
            txs.push({
              ...t,
              blockNumber: block.number,
              timestamp: block.timestamp,
              confirmations: stats.blockHeight - block.number + 1
            });
          });
        });

        if (txs.length === 0) {
          ledgerBody.innerHTML = "";
          ledgerEmpty.classList.remove("d-none");
        } else {
          ledgerEmpty.classList.add("d-none");
          const NGO_ADMIN_WALLET = "0x4fe63000000000000000000000000000000091ad";
          ledgerBody.innerHTML = txs.map(tx => {
            const shortHash = `${tx.hash.substring(0, 10)}...${tx.hash.substring(56)}`;
            
            let methodBadge = "";
            let description = "";
            
            if (tx.method === "mintSBT") {
              methodBadge = `<span class="px-2 py-0.5 border-2 border-black bg-tertiary-container text-on-tertiary-container font-bold text-[10px] uppercase">MintSBT</span>`;
              description = `Mint SBT #${tx.payload.tokenId} to ${tx.payload.volunteerName}`;
            } else if (tx.method === "mintSupply") {
              methodBadge = `<span class="px-2 py-0.5 border-2 border-black bg-primary-container text-on-primary-container font-bold text-[10px] uppercase">MintSupply</span>`;
              description = `Mint ${tx.payload.amount} ${tx.payload.category} tokens`;
            } else if (tx.method === "transferSupply") {
              methodBadge = `<span class="px-2 py-0.5 border-2 border-black bg-secondary-container text-on-secondary-container font-bold text-[10px] uppercase">TransferSupply</span>`;
              const fromName = tx.payload.from === NGO_ADMIN_WALLET ? "NGO Admin" : `Vol...${tx.payload.from.substring(38)}`;
              const toName = tx.payload.to === NGO_ADMIN_WALLET ? "NGO Admin" : (tx.payload.to.startsWith("0x") ? `Victim...${tx.payload.to.substring(38)}` : tx.payload.to);
              description = `Transfer ${tx.payload.amount} ${tx.payload.category} from ${fromName} to ${toName}`;
            } else {
              methodBadge = `<span class="px-2 py-0.5 border-2 border-black bg-white text-black font-bold text-[10px] uppercase">RecordRescue</span>`;
              description = `Resolve Request: ${tx.payload.requestId.substring(0,8)}...`;
            }
            
            return `
              <tr>
                <td><span class="text-black font-extrabold font-mono">#${tx.blockNumber}</span></td>
                <td>${methodBadge}</td>
                <td>
                  <a href="#" class="font-monospace text-secondary font-bold underline verify-tx-hash" data-hash="${tx.hash}" style="font-size:0.75rem;">${shortHash}</a>
                </td>
                <td><span class="text-on-surface-variant font-bold text-xs">${tx.gasUsed}</span></td>
                <td>
                  <span class="text-on-surface font-semibold text-xs text-truncate d-inline-block" style="max-width: 180px;">
                    ${description}
                  </span>
                </td>
              </tr>
            `;
          }).join("");

          // Click handler to verify tx
          ledgerBody.querySelectorAll(".verify-tx-hash").forEach(link => {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              const hash = link.dataset.hash;
              const txObj = txs.find(t => t.hash === hash);
              if (txObj) showTxReceipt(txObj);
            });
          });
        }

        // Render SBT list
        const sbtList = document.getElementById("blockchain-sbt-list");
        const sbts = sbtsData.sbts || [];
        if (sbts.length === 0) {
          sbtList.innerHTML = `
            <div class="empty-column py-5 text-center border-4 border-dashed border-black bg-surface-container-low font-bold">
              <i class="bi bi-shield-slash fs-3 d-block mb-2 text-warning"></i>
              No Soulbound Credentials minted yet
            </div>
          `;
        } else {
          sbtList.innerHTML = sbts.map(s => {
            const shortWallet = `${s.volunteerAddress.substring(0, 10)}...${s.volunteerAddress.substring(34)}`;
            const stars = Array(s.rating).fill('<i class="bi bi-star-fill text-warning me-0.5"></i>').join("") +
                          Array(5 - s.rating).fill('<i class="bi bi-star text-secondary me-0.5"></i>').join("");
            
            return `
              <div class="p-3 border-2 border-black bg-white shadow-neu-sm mb-4 flex flex-col gap-2">
                <div class="d-flex justify-content-between align-items-center pb-2 border-b-2 border-black border-dashed flex-wrap">
                  <h5 class="fs-6 font-bold text-black mb-0"><i class="bi bi-patch-check-fill text-success me-1"></i>Token ID #${s.tokenId}</h5>
                  <span class="px-2 py-0.5 border-2 border-black bg-[#00ff66] text-[#002107] font-bold text-[10px] uppercase">Verified SBT</span>
                </div>
                <div class="text-xs space-y-1">
                  <div class="grid grid-cols-2">
                    <span class="font-bold text-on-surface-variant uppercase text-[10px]">Volunteer:</span>
                    <span class="font-extrabold text-black">${s.volunteerName}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="font-bold text-on-surface-variant uppercase text-[10px]">Wallet:</span>
                    <span class="font-monospace font-bold text-secondary text-[10px] truncate">${shortWallet}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="font-bold text-on-surface-variant uppercase text-[10px]">Skills/Cat:</span>
                    <span class="font-extrabold text-black">${getCategoryWithIcon(s.category)}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="font-bold text-on-surface-variant uppercase text-[10px]">Hours Logged:</span>
                    <span class="font-extrabold text-black">${s.hoursWorked} hrs</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="font-bold text-on-surface-variant uppercase text-[10px]">Rating:</span>
                    <span class="d-inline-flex">${stars}</span>
                  </div>
                </div>
                <div class="p-2 border-2 border-black bg-surface text-on-surface text-xs font-medium italic">
                  "${s.feedback}"
                </div>
                <button class="w-100 py-1.5 border-2 border-black bg-tertiary-container text-on-tertiary-container font-bold uppercase text-xs shadow-neu-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all verify-sbt-btn" data-hash="${s.txHash}">
                  🛡️ Verify On-Chain
                </button>
              </div>
            `;
          }).join("");

          // Click handler for verified SBT link
          sbtList.querySelectorAll(".verify-sbt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const hash = btn.dataset.hash;
              const txObj = txs.find(t => t.hash === hash) || {
                hash: hash,
                method: "mintSBT",
                from: "0x4fe63...91ad",
                to: stats.contractAddress,
                blockNumber: sbts.find(s => s.txHash === hash)?.blockNumber || stats.blockHeight,
                timestamp: sbts.find(s => s.txHash === hash)?.timestamp || Date.now(),
                gasUsed: 89403,
                payload: sbts.find(s => s.txHash === hash)
              };
              showTxReceipt(txObj);
            });
          });
        }
      }
    } catch (err) {
      console.error("Error loading L2 blockchain data:", err);
    }
  }

  function showTxReceipt(tx) {
    const modalEl = document.getElementById("tx-receipt-modal");
    if (!modalEl) return;
    
    document.getElementById("receipt-tx-hash").textContent = tx.hash;
    document.getElementById("receipt-block-num").textContent = `#${tx.blockNumber}`;
    document.getElementById("receipt-timestamp").textContent = new Date(tx.timestamp).toLocaleString();
    document.getElementById("receipt-from").textContent = tx.from;
    document.getElementById("receipt-to").textContent = tx.to;
    document.getElementById("receipt-gas").textContent = `${tx.gasUsed} gas`;
    document.getElementById("receipt-payload").textContent = JSON.stringify(tx.payload, null, 2);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  // ── View Toggle Events ──
  if (btnViewBoard && btnViewMap && btnViewBlockchain) {
    btnViewBoard.addEventListener("click", () => {
      if (currentView === "board") return;
      currentView = "board";
      btnViewBoard.classList.add("active");
      btnViewMap.classList.remove("active");
      btnViewBlockchain.classList.remove("active");
      mapViewContainer.classList.add("d-none");
      blockchainViewContainer.classList.add("d-none");
      kanbanBoard.classList.remove("d-none");
      applyFilters();
    });

    btnViewMap.addEventListener("click", () => {
      if (currentView === "map") return;
      currentView = "map";
      btnViewMap.classList.add("active");
      btnViewBoard.classList.remove("active");
      btnViewBlockchain.classList.remove("active");
      kanbanBoard.classList.add("d-none");
      blockchainViewContainer.classList.add("d-none");
      mapViewContainer.classList.remove("d-none");
      
      shouldFitMapBounds = true;
      initMap();
      setTimeout(() => {
        map.invalidateSize();
        applyFilters();
      }, 100);
    });

    btnViewBlockchain.addEventListener("click", () => {
      if (currentView === "blockchain") return;
      currentView = "blockchain";
      btnViewBlockchain.classList.add("active");
      btnViewBoard.classList.remove("active");
      btnViewMap.classList.remove("active");
      kanbanBoard.classList.add("d-none");
      mapViewContainer.classList.add("d-none");
      blockchainViewContainer.classList.remove("d-none");
      
      loadBlockchainStats();
    });

    // Check URL parameters for direct view routing
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    const txParam = urlParams.get("tx");
    
    if (viewParam === "blockchain") {
      setTimeout(() => {
        btnViewBlockchain.click();
        if (txParam) {
          let checkInterval = setInterval(() => {
            const txLink = document.querySelector(`.verify-tx-hash[data-hash="${txParam}"]`);
            if (txLink) {
              txLink.click();
              clearInterval(checkInterval);
            }
          }, 300);
          setTimeout(() => clearInterval(checkInterval), 5000);
        }
      }, 500);
    }
  }

  // Initial load
  startLiveListener();
  loadRequests();
  loadBlockchainStats();

  // Expose loadRequests globally so SMS gateway can trigger refresh
  window.loadRequests = loadRequests;

  // Periodic rendering loop (every 30 seconds) to update timers and SLA checks in real-time,
  // and poll via REST API if Firestore listener is not active
  setInterval(() => {
    if (allRequests.length > 0) {
      applyFilters();
    }
    if (!unsubscribeFirestore) {
      loadRequests();
    }
    // Always load blockchain stats to keep dashboard Overview metrics updated
    loadBlockchainStats();
  }, 30000);
}

// ── Global: SMS Gateway Simulator Logic ──────────────────────
const smsForm = document.getElementById("sms-simulator-form");
if (smsForm) {
  const smsComposer = document.getElementById("sms-composer");
  const smsSenderPhone = document.getElementById("sms-sender-phone");
  const smsChatBody = document.getElementById("sms-chat-body");
  const smsConsoleContainer = document.getElementById("sms-console-container");
  const smsConsoleLog = document.getElementById("sms-console-log");
  const smsSendBtn = document.getElementById("sms-send-btn");
  const smsTrackContainer = document.getElementById("sms-track-container");
  const clearSmsBtn = document.getElementById("clear-sms-btn");

  if (clearSmsBtn) {
    clearSmsBtn.addEventListener("click", async () => {
      const phone = smsSenderPhone ? smsSenderPhone.value.trim() : "";
      if (!phone) {
        showToast("No phone number selected to clear history.", "warning");
        return;
      }
      
      const originalHtml = clearSmsBtn.innerHTML;
      clearSmsBtn.disabled = true;
      clearSmsBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="width:0.75rem; height:0.75rem;"></span>`;
      
      try {
        const res = await fetch(`/api/requests/by-phone/${encodeURIComponent(phone)}`, {
          method: "DELETE"
        });
        if (res.ok) {
          smsChatBody.innerHTML = `
            <div class="sms-message received">
              <div class="sms-text">SYSTEM: Gateway online. Compose your SMS emergency text below. You can use English, Hindi, Marathi, Hinglish, etc.</div>
            </div>
          `;
          if (smsConsoleLog) smsConsoleLog.innerHTML = "";
          if (smsConsoleContainer) smsConsoleContainer.classList.add("d-none");
          if (smsTrackContainer) {
            smsTrackContainer.classList.add("d-none");
            smsTrackContainer.innerHTML = "";
          }
          showToast("Chat history cleared successfully!", "success");
          
          if (typeof window.loadRequests === "function") {
            await window.loadRequests();
          }
        } else {
          showToast("Failed to clear chat history on server.", "danger");
        }
      } catch (err) {
        console.error("Error clearing SMS history:", err);
        showToast("Error clearing chat history.", "danger");
      } finally {
        clearSmsBtn.disabled = false;
        clearSmsBtn.innerHTML = originalHtml;
      }
    });
  }

  function logConsole(message, type = "info") {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logLine = document.createElement("div");
    logLine.className = `console-line ${type}`;
    logLine.innerHTML = `[${time}] ${message}`;
    smsConsoleLog.appendChild(logLine);
    smsConsoleLog.scrollTop = smsConsoleLog.scrollHeight;
  }

  function appendChatMessage(text, type = "received") {
    const msgDiv = document.createElement("div");
    msgDiv.className = `sms-message ${type}`;
    msgDiv.innerHTML = `<div class="sms-text">${text}</div>`;
    smsChatBody.appendChild(msgDiv);
    smsChatBody.scrollTop = smsChatBody.scrollHeight;
  }

  smsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const smsText = smsComposer.value.trim();
    const senderPhone = smsSenderPhone.value.trim();

    if (!smsText || !senderPhone) return;

    // Reset UI
    smsComposer.value = "";
    smsSendBtn.disabled = true;
    smsConsoleContainer.classList.remove("d-none");
    smsConsoleLog.innerHTML = "";
    smsTrackContainer.classList.add("d-none");
    smsTrackContainer.innerHTML = "";

    // 1. Show message in chat bubble
    appendChatMessage(smsText, "sent");

    // Helper sleep
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      logConsole("📡 Simulating cellular SMS transmission...", "info");
      await sleep(1000);

      logConsole(`📥 SMS Gateway (+91 80000 12345) received raw text from ${senderPhone}`, "info");
      await sleep(800);

      logConsole("🧠 Routing to Gemini AI parser (gemini-2.5-flash)...", "warning");
      await sleep(1200);

      // Hit API
      const res = await fetch("/api/simulate-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsText, senderPhone })
      });

      if (res.status === 429) {
        // Rate limit hit on the SMS simulator endpoint
        logConsole("🛡️ RATE LIMIT: Too many SMS simulations. Please wait 1 hour before trying again.", "error");
        appendChatMessage("⚠️ Gateway blocked: You have sent too many SMS simulations. Please wait 1 hour.", "received");
        smsSendBtn.disabled = false;
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gateway classification failed.");
      }

      const data = await res.json();

      if (data.isRating) {
        logConsole(`⭐ AI Detected Rating Response!`, "success");
        logConsole(`   - Rating: ${data.rating}/5`, "success");
        logConsole(`   - Feedback: "${data.feedback}"`, "success");
        await sleep(800);
        logConsole(`💾 Saving rating & updating volunteer rating database...`, "info");
        await sleep(600);
        logConsole(`✅ Rating recorded for volunteer ${data.volunteerName}!`, "success");
        
        appendChatMessage(`Gateway Reply: Thank you! Your rating of ${data.rating}/5 for volunteer ${data.volunteerName} has been recorded.`, "received");
        
        if (window.loadRequests) {
          logConsole("🔄 Refreshing NGO dashboard Kanban board...", "info");
          await window.loadRequests();
        }
        return;
      }

      logConsole(`✅ AI Parsing Complete! Language: ${data.detectedLanguage}`, "success");
      logConsole(`   - Category: ${data.category}`, "success");
      logConsole(`   - Urgency: ${data.urgency}/5`, "success");
      logConsole(`   - Zone: ${data.zone}`, "success");
      logConsole(`   - Address: ${data.address}`, "success");
      logConsole(`   - Translated: "${data.translatedDescription}"`, "success");
      await sleep(800);

      logConsole(`💾 Saving request record to Firestore...`, "info");
      await sleep(600);
      logConsole(`✅ Request stored. Document ID: ${data.id}`, "success");

      if (data.matchedVolunteer) {
        logConsole(`🤝 Matched to Volunteer: ${data.matchedVolunteer.name} (${data.matchedVolunteer.phone})`, "success");
      } else {
        logConsole(`⚠️ No local volunteer available in ${data.zone} matching ${data.category}. Routed to NGO coordinator.`, "warning");
      }

      // Add a reply message on the phone chassis
      appendChatMessage(`Gateway Reply: Request received. Urgency: ${data.urgency}/5. Matched Volunteer: ${data.matchedVolunteer ? data.matchedVolunteer.name : 'NGO Team'}. ID: ${data.id}`, "received");

      // Auto-refresh the dashboard if we are on the dashboard page
      if (window.loadRequests) {
        logConsole("🔄 Refreshing NGO dashboard Kanban board...", "info");
        await window.loadRequests();
      } else {
        // If we are on the index page, we can show a quick button in the console to track status
        smsTrackContainer.classList.remove("d-none");
        smsTrackContainer.innerHTML = `
          <button class="btn btn-outline-info btn-xs text-white animate-pulse" style="font-size:0.75rem; border-color:#22d3ee;" onclick="trackSmsRequest('${data.id}')">
            <i class="bi bi-eye-fill me-1"></i> Track Live Status
          </button>
        `;
      }

    } catch (err) {
      logConsole(`❌ Gateway Error: ${err.message}`, "error");
      appendChatMessage(`Gateway System Error: Unable to route request. Please retry.`, "received");
    } finally {
      smsSendBtn.disabled = false;
    }
  });
}

// Load SMS History when modal is opened or phone number changes
async function loadSmsHistory(phone) {
  if (!phone) return;
  const smsChatBody = document.getElementById("sms-chat-body");
  if (!smsChatBody) return;

  try {
    const res = await fetch(`/api/requests/by-phone/${encodeURIComponent(phone)}`);
    if (!res.ok) throw new Error("Failed to fetch history");
    const data = await res.json();

    smsChatBody.innerHTML = `
      <div class="sms-message received">
        <div class="sms-text">SYSTEM: Gateway online. Compose your SMS emergency text below. You can use English, Hindi, Marathi, Hinglish, etc.</div>
      </div>
    `;

    if (data.success && data.requests) {
      data.requests.forEach(req => {
        // 1. Sent SMS message (description)
        const msgDiv1 = document.createElement("div");
        msgDiv1.className = `sms-message sent`;
        msgDiv1.innerHTML = `<div class="sms-text">${req.description}</div>`;
        smsChatBody.appendChild(msgDiv1);

        // 2. Gateway acknowledgement
        const volName = req.matchedVolunteer ? req.matchedVolunteer.name : "NGO Team";
        const msgDiv2 = document.createElement("div");
        msgDiv2.className = `sms-message received`;
        msgDiv2.innerHTML = `<div class="sms-text">Gateway Reply: Request received. Urgency: ${req.urgency}/5. Matched Volunteer: ${volName}. ID: ${req.id}</div>`;
        smsChatBody.appendChild(msgDiv2);

        // 3. Status updates (if In Progress or Resolved)
        if (req.status === "In Progress" && req.matchedVolunteer) {
          const msgDiv3 = document.createElement("div");
          msgDiv3.className = `sms-message received`;
          msgDiv3.innerHTML = `<div class="sms-text">Gateway Alert: Volunteer ${req.matchedVolunteer.name} is en route. Contact: ${req.matchedVolunteer.phone}</div>`;
          smsChatBody.appendChild(msgDiv3);
        } else if (req.status === "Resolved") {
          const msgDiv3 = document.createElement("div");
          msgDiv3.className = `sms-message received`;
          msgDiv3.innerHTML = `<div class="sms-text">Gateway Alert: Your request has been resolved by NGO. Please rate your volunteer by replying (1-5), e.g. "5 Priya was very helpful".</div>`;
          smsChatBody.appendChild(msgDiv3);
          
          // 4. Rating reply if already rated
          if (req.rating !== undefined && req.rating !== null) {
            const feedbackText = req.feedback ? ` - ${req.feedback}` : "";
            const msgDiv4 = document.createElement("div");
            msgDiv4.className = `sms-message sent`;
            msgDiv4.innerHTML = `<div class="sms-text">${req.rating}${feedbackText}</div>`;
            smsChatBody.appendChild(msgDiv4);

            const msgDiv5 = document.createElement("div");
            msgDiv5.className = `sms-message received`;
            msgDiv5.innerHTML = `<div class="sms-text">Gateway Reply: Thank you! Your rating of ${req.rating}/5 for volunteer ${volName} has been recorded.</div>`;
            smsChatBody.appendChild(msgDiv5);
          }
        }
      });
      smsChatBody.scrollTop = smsChatBody.scrollHeight;
    }
  } catch (err) {
    console.error("Error loading SMS history:", err);
  }
}

// Load history on input change
const smsSenderPhone = document.getElementById("sms-sender-phone");
if (smsSenderPhone) {
  smsSenderPhone.addEventListener("change", () => {
    loadSmsHistory(smsSenderPhone.value.trim());
  });
}

// Load history on modal open
const smsModalEl = document.getElementById("sms-modal");
if (smsModalEl) {
  smsModalEl.addEventListener("shown.bs.modal", () => {
    const phoneInput = document.getElementById("sms-sender-phone");
    if (phoneInput) {
      loadSmsHistory(phoneInput.value.trim());
    }
  });
}

// Global helper for tracking simulated SMS request
window.trackSmsRequest = (id) => {
  // Close the SMS simulator modal
  const smsModalEl = document.getElementById("sms-modal");
  const modal = bootstrap.Modal.getInstance(smsModalEl);
  if (modal) modal.hide();

  // Redirect to tracking page
  window.location.href = `tracking.html?id=${id}`;
};

// ── History Logs Logic ──────────────────────────────────────────
let currentLogsFilter = "all";
let lastArchivedAtCursor = null;
let hasMoreLogs = true;
const LOGS_LIMIT = 50;

function initHistoryLogs() {
  const viewLogsBtn = document.getElementById("view-logs-btn");
  const logsModalContainer = document.getElementById("logs-modal-container");
  const logsCloseBtn = document.getElementById("logs-close-btn");
  const logsLoadMoreBtn = document.getElementById("logs-load-more-btn");
  const logsTableBody = document.getElementById("logs-table-body");
  const logsEmptyMsg = document.getElementById("logs-empty-msg");
  const filterTabs = document.querySelectorAll(".log-filter-tab");

  if (!viewLogsBtn || !logsModalContainer) return;

  // Show Modal
  viewLogsBtn.addEventListener("click", () => {
    logsModalContainer.classList.remove("d-none");
    fetchLogs(true);
  });

  // Close Modal
  const closeModal = () => {
    logsModalContainer.classList.add("d-none");
  };
  logsCloseBtn.addEventListener("click", closeModal);
  logsModalContainer.addEventListener("click", (e) => {
    if (e.target === logsModalContainer) closeModal();
  });

  // Filter tabs click
  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentLogsFilter = tab.dataset.filter;
      fetchLogs(true);
    });
  });

  // Load More click
  logsLoadMoreBtn.addEventListener("click", () => {
    if (hasMoreLogs) {
      fetchLogs(false);
    }
  });

  async function fetchLogs(reset = false) {
    if (reset) {
      lastArchivedAtCursor = null;
      hasMoreLogs = true;
      logsTableBody.innerHTML = "";
      logsEmptyMsg.classList.add("d-none");
      logsLoadMoreBtn.disabled = false;
      logsLoadMoreBtn.innerHTML = `<i class="bi bi-arrow-down-circle me-1"></i>Load More`;
    }

    try {
      logsLoadMoreBtn.disabled = true;
      logsLoadMoreBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Loading...`;

      let url = `/api/logs?limit=${LOGS_LIMIT}&filter=${currentLogsFilter}`;
      if (lastArchivedAtCursor) {
        url += `&lastArchivedAt=${encodeURIComponent(lastArchivedAtCursor)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        renderLogs(data.logs, reset);
        lastArchivedAtCursor = data.nextCursor;
        hasMoreLogs = data.hasMore;

        if (reset && data.logs.length === 0) {
          logsEmptyMsg.classList.remove("d-none");
          logsLoadMoreBtn.classList.add("d-none");
        } else if (!hasMoreLogs) {
          logsLoadMoreBtn.innerHTML = `No More Logs`;
          logsLoadMoreBtn.disabled = true;
          logsLoadMoreBtn.classList.remove("d-none");
        } else {
          logsLoadMoreBtn.innerHTML = `<i class="bi bi-arrow-down-circle me-1"></i>Load More`;
          logsLoadMoreBtn.disabled = false;
          logsLoadMoreBtn.classList.remove("d-none");
        }
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      if (typeof showToast === "function") {
        showToast("Could not load history logs.", "danger");
      }
      logsLoadMoreBtn.innerHTML = `Error Loading Logs`;
    }
  }

  function renderLogs(logs, reset) {
    const rows = logs.map(log => {
      const archivedDate = new Date(log.archivedAt);
      const dateStr = archivedDate.toLocaleDateString([], { month: "short", day: "numeric" });
      const timeStr = archivedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const formattedTime = `${dateStr}, ${timeStr}`;

      const volunteerName = log.matchedVolunteer ? log.matchedVolunteer.name : "Unassigned";
      
      let statusClass = "resolved";
      let statusLabel = "Resolved";
      if (log.deleted) {
        if (log.status === "Resolved") {
          statusClass = "resolved-deleted";
          statusLabel = "Resolved (Deleted)";
        } else if (log.status === "In Progress") {
          statusClass = "inprogress-deleted";
          statusLabel = "In Progress (Deleted)";
        } else {
          statusClass = "open-deleted";
          statusLabel = "Open (Deleted)";
        }
      }

      return `
        <tr class="clickable" data-log-id="${log.id}">
          <td>
            <div class="fw-semibold">${log.description}</div>
            <div class="small text-muted" style="font-size:0.75rem;">${log.address || log.zone}</div>
          </td>
          <td><span class="badge bg-secondary-subtle text-light-emphasis border border-secondary-subtle px-2 py-1" style="font-size:0.72rem;">${log.category || 'Other'}</span></td>
          <td><span class="text-muted small"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${log.zone}</span></td>
          <td><span class="text-muted small"><i class="bi bi-person-fill me-1"></i>${volunteerName}</span></td>
          <td><span class="badge-log-status ${statusClass}">${statusLabel}</span></td>
          <td><span class="text-muted small">${formattedTime}</span></td>
        </tr>
      `;
    }).join("");

    if (reset) {
      logsTableBody.innerHTML = rows;
    } else {
      logsTableBody.insertAdjacentHTML("beforeend", rows);
    }

    // Add expansion click handlers
    document.querySelectorAll("#logs-table-body tr.clickable").forEach(row => {
      if (row.dataset.listenerAdded) return;
      row.dataset.listenerAdded = "true";

      row.addEventListener("click", () => {
        const logId = row.dataset.logId;
        const nextRow = row.nextElementSibling;
        
        if (nextRow && nextRow.classList.contains("expanded-details-row")) {
          nextRow.remove();
          row.classList.remove("expanded");
        } else {
          const logObj = logs.find(l => l.id === logId);
          if (!logObj) return;

          row.classList.add("expanded");
          const detailsHtml = buildLogDetailsHtml(logObj);
          row.insertAdjacentHTML("afterend", `
            <tr class="expanded-details-row">
              <td colspan="6">
                <div class="log-details-container" style="animation: slideDownFade 0.2s ease-out;">
                  ${detailsHtml}
                </div>
              </td>
            </tr>
          `);
        }
      });
    });
  }

  function buildLogDetailsHtml(log) {
    const volName = log.matchedVolunteer ? log.matchedVolunteer.name : "None";
    const volPhone = log.matchedVolunteer ? log.matchedVolunteer.phone : "N/A";
    const createdDate = log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A";
    const archivedDate = new Date(log.archivedAt).toLocaleString();

    const timelineHtml = log.timeline && log.timeline.length > 0
      ? `<div class="timeline-container p-2 mt-2" style="font-size:0.75rem; border-left:2px solid #cbd5e1; padding-left:1rem !important;">
           ${log.timeline.map(t => {
             const time = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
             const date = new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
             return `
               <div class="mb-1" style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.25rem;">
                 <span class="text-primary fw-semibold" style="font-size:0.72rem;">[${date} ${time}]</span>
                 <span class="text-secondary ms-1" style="font-size:0.75rem; color: #475569;">${t.note}</span>
               </div>
             `;
           }).join("")}
         </div>`
      : "<span class='text-muted'>No timeline actions logged.</span>";

    return `
      <div class="log-details-grid">
        <div class="log-details-section">
          <div class="log-details-label">Incident Information</div>
          <div><strong>Description:</strong> ${log.description}</div>
          <div class="mt-1"><strong>Translation:</strong> ${log.translatedDescription || 'N/A'} (Language: ${log.detectedLanguage})</div>
          <div class="mt-1"><strong>Urgency Level:</strong> ${log.urgency}/5</div>
          <div class="mt-1"><strong>Victim Contact:</strong> ${log.victimPhone || 'N/A'}</div>
        </div>
        <div class="log-details-section">
          <div class="log-details-label">Assignment & Location</div>
          <div><strong>Assigned Volunteer:</strong> ${volName}</div>
          <div class="mt-1"><strong>Volunteer Phone:</strong> ${volPhone}</div>
          <div class="mt-1"><strong>Zone:</strong> ${log.zone}</div>
          <div class="mt-1"><strong>Address:</strong> ${log.address || 'N/A'}</div>
        </div>
        <div class="log-details-section">
          <div class="log-details-label">Dates & System Stats</div>
          <div><strong>Created At:</strong> ${createdDate}</div>
          <div class="mt-1"><strong>Archived At:</strong> ${archivedDate}</div>
          <div class="mt-1"><strong>Archive Method:</strong> ${log.deleted ? 'Deleted/Removed' : 'Resolved Status Only'}</div>
        </div>
      </div>
      <div class="log-details-section mt-2">
        <div class="log-details-label">Request Action Timeline</div>
        ${timelineHtml}
      </div>
    `;
  }

  // ── Custom Collapse Toggle Controller (app.js level) ──
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest('[data-bs-toggle="collapse"]');
    if (!toggle) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const targetId = toggle.getAttribute("href")?.substring(1) || toggle.getAttribute("data-bs-target")?.substring(1);
    if (!targetId) return;
    
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    
    const isHidden = window.getComputedStyle(targetEl).display === "none";
    if (isHidden) {
      targetEl.style.setProperty("display", "block", "important");
    } else {
      targetEl.style.setProperty("display", "none", "important");
    }
  });
}

// Call on load
document.addEventListener("DOMContentLoaded", () => {
  initHistoryLogs();
});

