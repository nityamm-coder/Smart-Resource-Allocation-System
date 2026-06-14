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

  function startStatusTracking(requestId) {
    if (statusInterval) clearInterval(statusInterval);
    const stepAssigned = document.getElementById("step-assigned");
    const stepResolved = document.getElementById("step-resolved");

    statusInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/requests/${requestId}`);
        if (res.ok) {
          const data = await res.json();
          const status = data.request.status;
          const hasVolunteer = !!data.request.matchedVolunteer;

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

      resultBanner.classList.add("alert", "alert-success");
      resultBanner.innerHTML = `
        <h5 class="mb-2"><i class="bi bi-check-circle-fill me-2"></i>Request Submitted!</h5>
        <p class="mb-1">
          <strong>Category:</strong> ${getCategoryWithIcon(data.category)} &nbsp;|&nbsp;
          <strong>Urgency:</strong> ${data.urgency}/5
        </p>
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
      `;

      startStatusTracking(data.id);
    } else {
      resultBanner.classList.add("alert", "alert-danger");
      resultBanner.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <strong>Error:</strong> ${data}
      `;
    }
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
    if (!address) {
      showResult(false, "Please enter your exact location address.");
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

  function buildCard(req) {
    const urgencyClass = `u${req.urgency}`;

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

    return `
      <div class="request-card urgency-${req.urgency}" id="card-${req.id}">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <span class="badge-category">${getCategoryWithIcon(req.category)}</span>
          <span class="badge-urgency ${urgencyClass}">
            ⚡ ${urgencyLabel(req.urgency)}
          </span>
        </div>
        <p class="description mb-2">${req.description}</p>
        <div class="meta mb-1">
          <i class="bi bi-geo-alt-fill text-danger me-1"></i><strong>Address:</strong> ${req.address || "N/A"}
        </div>
        <div class="meta mb-1">
          <i class="bi bi-telephone-fill text-primary me-1"></i><strong>Contact:</strong> <a href="tel:${req.victimPhone}">${req.victimPhone || "N/A"}</a>
        </div>
        <div class="meta mb-2">
          <i class="bi bi-map me-1"></i>Hub: ${req.zone}
        </div>
        ${volunteerHtml}
        <div class="d-flex align-items-center gap-2 mt-2">
          <label for="status-${req.id}" class="meta mb-0">Status:</label>
          <select
            id="status-${req.id}"
            class="status-select"
            data-id="${req.id}"
          >${optionsHtml}</select>
        </div>
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
            </div>
            <div class="roster-meta">
              <i class="bi bi-geo-alt-fill text-danger"></i>${vol.zone}
            </div>
            <div class="roster-meta">
              <i class="bi bi-telephone-fill text-success"></i>
              <a href="tel:${vol.phone}">${vol.phone}</a>
            </div>
            <div class="roster-skills mt-1">
              ${skillsBadges}
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

  refreshBtn.addEventListener("click", loadRequests);

  loadRequests();
}
