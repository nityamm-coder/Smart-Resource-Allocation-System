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
        alert("Geolocation is not supported by your browser. Please type your address manually.");
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
          alert("Unable to retrieve location automatically. Please enter your address manually.");
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

      showResult(true, data);
      form.reset();
    } catch (err) {
      showResult(false, err.message);
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

    const statuses = ["Open", "In Progress", "Resolved"];
    const optionsHtml = statuses
      .map(
        (s) =>
          `<option value="${s}" ${s === req.status ? "selected" : ""}>${s}</option>`
      )
      .join("");

    const timelineHtml = req.timeline && req.timeline.length > 0
      ? `<div class="mt-2 pt-2 border-top border-secondary-subtle">
           <a class="meta d-inline-flex align-items-center" data-bs-toggle="collapse" href="#timeline-${req.id}" role="button" aria-expanded="false" aria-controls="timeline-${req.id}" style="font-size:0.72rem; color: var(--text-muted); text-decoration:none;">
             <i class="bi bi-clock-history me-1"></i>View Action Log (${req.timeline.length})
           </a>
           <div class="collapse mt-2" id="timeline-${req.id}">
             <div class="timeline-container p-0 m-0" style="padding-left:1rem !important; font-size:0.72rem;">
               ${req.timeline.map(t => {
                 const time = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 return `
                   <div class="timeline-event mb-1 pb-1" style="margin-bottom:0.4rem !important; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                     <span class="timeline-event-time" style="font-size:0.68rem; display:inline;">[${time}]</span>
                     <span class="timeline-event-note" style="color:var(--text-muted); font-size:0.72rem;">${t.note}</span>
                   </div>
                 `;
               }).join("")}
             </div>
           </div>
         </div>`
      : "";

    return `
      <div class="request-card urgency-${req.urgency} ${isSlaViolation ? 'sla-violation' : ''}" id="card-${req.id}">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
          <div>
            <span class="badge-category">${getCategoryWithIcon(req.category)}</span>
            ${sourceBadge}
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
        ${volunteerHtml}
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2">
          <div class="d-flex align-items-center gap-2">
            <label for="status-${req.id}" class="meta mb-0">Status:</label>
            <select
              id="status-${req.id}"
              class="status-select"
              data-id="${req.id}"
            >${optionsHtml}</select>
          </div>
          ${durationText}
        </div>
        ${timelineHtml}
      </div>
    `;
  }

  function renderRequests(requests) {
    const open       = requests.filter((r) => r.status === "Open");
    const inProgress = requests.filter((r) => r.status === "In Progress");
    const resolved   = requests.filter((r) => r.status === "Resolved");

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

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const requestId = e.target.dataset.id;
        const newStatus = e.target.value;
        await updateStatus(requestId, newStatus);
      });
    });
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
        (r.matchedVolunteer && r.matchedVolunteer.name && r.matchedVolunteer.name.toLowerCase().includes(query))
      );
    }

    renderRequests(filtered);
  }

  function updateInventoryUI(inventory) {
    const categories = ["Food", "Medical", "Shelter", "Other"];
    categories.forEach(cat => {
      const countEl = document.getElementById(`inv-${cat}-count`);
      const cardEl = document.getElementById(`inv-${cat}-card`);
      if (countEl && cardEl) {
        const count = inventory[cat] !== undefined ? inventory[cat] : 0;
        countEl.textContent = count;
        
        // Reset classes
        cardEl.className = "p-3 rounded border border-secondary d-flex justify-content-between align-items-center";
        countEl.className = "fs-4 fw-extrabold text-white mt-1";
        
        // Check levels
        if (count === 0) {
          cardEl.classList.add("out-of-stock-card");
          countEl.classList.add("out-of-stock-count");
        } else if (count < 10) {
          cardEl.classList.add("low-stock-card");
          countEl.classList.add("low-stock-count");
        }
      }
    });
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

  async function loadRequests() {
    loadingState.classList.remove("d-none");
    kanbanBoard.classList.add("d-none");
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
      kanbanBoard.classList.remove("d-none");
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

        return `
          <div class="roster-card">
            <div class="roster-header">
              <span class="status-dot ${statusClass}" title="${statusLabel}"></span>
              <h4 class="roster-name">${vol.name}</h4>
              <span class="roster-status-badge ${statusClass}">${statusLabel}</span>
            </div>
            <div class="roster-meta">
              <i class="bi bi-geo-alt-fill text-danger"></i>${vol.zone}
            </div>
            <div class="roster-meta">
              <i class="bi bi-telephone-fill text-success"></i>
              <a href="tel:${vol.phone}">${vol.phone}</a>
            </div>
            <div class="roster-skills mt-2">
              <div class="roster-skills-badges">${skillsBadges}</div>
            </div>
          </div>
        `;
      })
      .join("");
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
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
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
      const category = document.getElementById("restock-category").value;
      const quantity = parseInt(document.getElementById("restock-qty").value, 10);
      
      try {
        const res = await fetch(`${API_BASE}/api/inventory/restock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, quantity })
        });
        
        if (res.ok) {
          const data = await res.json();
          updateInventoryUI(data.inventory);
          
          // Hide Bootstrap Modal
          const modalEl = document.getElementById("restock-modal");
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          } else {
            // Trigger close button click as fallback
            const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
            if (closeBtn) closeBtn.click();
          }
          restockForm.reset();
        } else {
          const err = await res.json();
          alert("Error restocking: " + err.error);
        }
      } catch (err) {
        console.error("Restock request failed:", err);
      }
    });
  }

  refreshBtn.addEventListener("click", loadRequests);

  // Initial load
  loadRequests();

  // Expose loadRequests globally so SMS gateway can trigger refresh
  window.loadRequests = loadRequests;

  // Periodic rendering loop (every 10 seconds) to update timers and SLA checks in real-time
  setInterval(() => {
    if (allRequests.length > 0) {
      applyFilters();
    }
  }, 10000);
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

// Global helper for tracking simulated SMS request from the index page
window.trackSmsRequest = (id) => {
  // Close the SMS simulator modal
  const smsModalEl = document.getElementById("sms-modal");
  const modal = bootstrap.Modal.getInstance(smsModalEl);
  if (modal) modal.hide();

  // If we have showResult and status tracking (on index.html), load details
  if (typeof showResult === "function") {
    const placeholderContent = document.getElementById("placeholder-content");
    if (placeholderContent) placeholderContent.classList.add("d-none");
    
    // Fetch and show status
    fetch(`/api/requests/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showResult(true, data.request);
        }
      })
      .catch(err => console.error("Error loading status:", err));
  }
};
