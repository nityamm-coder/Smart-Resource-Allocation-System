# 🚀 Smart Resource Allocation System

[![Hackathon Project](https://img.shields.io/badge/Hackathon-Project-blueviolet.svg)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-Node%20%7C%20Express%20%7C%20Firebase%20%7C%20Gemini-orange.svg)](#)
[![Aesthetics](https://img.shields.io/badge/Design-Glassmorphic%20Dark-ff69b4.svg)](#)

A real-time, AI-driven disaster response and relief coordination system designed to connect disaster victims with nearby, skilled volunteers and manage resources efficiently during emergencies. 

---

## 🌐 Live Demo & Deployed Link

* **Deployed Web URL:** https://smart-resource-allocation-six.vercel.app/  
  *(Ready for Vercel deployment with configuration provided in `vercel.json`)*

---

## 📌 Table of Contents
1. [📖 Problem & Use Case](#-problem--use-case)
2. [💡 Short Description](#-short-description)
3. [🛠️ Tech Stack](#️-tech-stack)
4. [🌟 Key Features](#-key-features)
5. [🎛️ Architecture & How It Works](#️-architecture--how-it-works)
6. [⚙️ Local Setup & Installation](#️-local-setup--installation)
7. [📊 Volunteer Matching Algorithm](#-volunteer-matching-algorithm)
8. [🔮 Future Scope](#-future-scope)
9. [📁 Directory Structure](#-directory-structure)

---

## 📖 Problem & Use Case

During natural or man-made disasters (e.g., floods, earthquakes, industrial accidents), relief efforts are often plagued by:
- **Chaotic Communication:** Victims send pleas for help across disparate platforms or in multiple local languages (Hindi, Marathi, English, Hinglish).
- **Inefficient Volunteer Allocation:** Volunteers are dispatched without matching their specific skills (e.g., medical expertise, logistics coordination) or location zones, causing delays and resource waste.
- **Tracking Gaps:** Disaster coordinators (NGOs and local authorities) lack real-time visibility into the status of rescue requests (Open, In Progress, Resolved) and relief inventory levels.
- **Low Connectivity Barriers:** Traditional web-forms fail in zones where internet speeds drop, making offline SMS gateway integration vital.

**Smart Resource Allocation System** solves these challenges by combining **Google Gemini AI** and **Firebase Firestore** to automate sorting, translating, prioritizing, and assigning resources instantly.

---

## 💡 Short Description

**Smart Resource Allocation** is an AI-powered MVP that automates the collection, translation, classification, and volunteer-matching of disaster requests. It accepts web requests or simulated offline SMS messages, leveraging Google Gemini 2.5 Flash to determine urgency (1-5), translate multi-lingual text, and generate custom life-saving safety instructions. Victims can monitor their rescue in real-time via a Live Tracking Portal and provide post-resolution star ratings. For coordinators, the platform provides a real-time Kanban Dashboard with inventory tracking, duplicate request clustering, and push notifications for critical emergencies.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express.js | Fast, minimalist backend server handling APIs and logic. |
| **Database** | Firebase Firestore | Real-time NoSQL cloud database for active requests, inventory, and logs. |
| **AI / LLM** | Google Gemini 2.5 Flash | Free-tier friendly, lightning-fast LLM handling categorization, translation, and urgency analysis. |
| **Frontend UI** | HTML5, CSS3, JavaScript (ES6+), Leaflet.js | Vanilla web pages using glassmorphic styling, responsive layout, and interactive map widgets. |
| **CSS Framework** | Bootstrap 5 + Icons | Grid layouts and premium UI components. |
| **Security** | Express Rate Limit | Anti-spam and request throttling (General API, SMS Gateway, Form Submit limiters). |
| **Dev Tools** | nodemon, dotenv | Fast development and local environment configuration. |

---

## 🌟 Key Features

1. **AI-Powered Multi-Lingual Ingestion:** Victims submit details in any regional language (Hindi, Marathi, Hinglish, English). Gemini AI automatically detects the language, translates it to English, extracts the core category (`Food`, `Medical`, `Shelter`, `Other`), and assigns an urgency score from `1` (Low) to `5` (Critical).
2. **Dynamic Volunteer Matching:** Assigns the best volunteer dynamically. Calculates suitability points based on skills (+2) and proximity zone (+1) while automatically skipping busy volunteers.
3. **Interactive NGO Kanban Board:** Organized into *Open*, *In Progress*, and *Resolved* columns. Status updates automatically log timestamps and system actions to a visual tracking timeline.
4. **Urgent Request Visual Indicators:** Urgency level `5` requests pulse in red when open, signaling critical status to coordinators.
5. **Relief Supply Inventory Panel:** Allows NGOs to view stock levels for critical rescue packs (Food, Medical, Shelter) and restock via modal triggers.
6. **Offline SMS Simulator:** Integrates an SMS parser that uses Gemini to translate and map raw text SMS inputs into structured requests.
7. **Rate Limiting & Client-Side Counter:** Prevents API abuse and flood submissions. When rate limits are reached, clients see an active countdown warning banner showing when they can submit again.
8. **WhatsApp Quick-Connect:** One-click button allows coordinators to start a pre-filled WhatsApp conversation directly with matched volunteers.
9. **One-Click GPS Geolocation & Geocoding:** Victims can share their real-time coordinates using their device's GPS. The system automatically performs a reverse-geocoding lookup to translate raw numbers into a human-readable city/state/locality string (e.g. `Shahapur, Maharashtra`), with a silent offline fallback to raw coordinates.
10. **Interactive Dark Mode Map View:** Toggle seamlessly between the Kanban Board and a live interactive map powered by Leaflet.js and CartoDB Dark Matter. It automatically plots all active requests as custom pulsating markers colored by status (Purple for Open, Amber/Orange for In Progress). Higher urgency requests pulse at faster intervals to highlight critical areas.
11. **Map-Based Status Updates:** Click on any marker on the map to inspect full details, contact details, assigned volunteer status, and change request status directly from the map popup.
12. **Dynamic Hero Section:** A split grid landing layout featuring a custom blinking typewriter text effect cycling through critical resource types ("Food Packs", "Medical Aid", "Emergency Shelter", "Critical Supplies") and an animated CSS emergency radar beacon with rotating sweeps and pulsating coordinate nodes.
13. **Fully Responsive Layout:** Fully styled for optimal layout rendering on desktop, tablets, and smartphones.
14. **Custom Volunteer Management:** An integrated dashboard module allowing NGO coordinators to directly add and manage custom volunteers, assigning them specific skills and operating zones on the fly.
15. **Live Victim Tracking Portal:** A dedicated portal for victims to track their request status (Submitted, Assigned, In Progress, Resolved) and view live timeline logs.
16. **AI Life-Saving Instructions:** Generates real-time, situation-specific safety tips via Gemini AI to guide victims while they wait for help.
17. **Volunteer Star Rating & Feedback:** A post-resolution feedback loop allowing victims to rate their rescue experience (1-5 stars) and leave comments, updating volunteer performance metrics.
18. **Duplicate Request Clustering:** Automatically detects and groups similar incident reports in the same zone to prevent spam and duplicate volunteer dispatch.
19. **Critical Push Notifications:** NGO Dashboard triggers an audio chime and browser push notifications whenever a critical (Urgency 5) request is received.

---

## 🎛️ Architecture & How It Works

```
                        ┌───────────────────┐
                        │   Disaster Victim │
                        └─────────┬─────────┘
                                  │ (Submit Form / SMS Simulator)
                                  ▼
                        ┌───────────────────┐
                        │  Express Backend  │ ◄─── [Rate Limiter Check]
                        └─────────┬─────────┘
                                  │
                                  ├──────────────────────────────┐
                                  ▼                              ▼
                       ┌─────────────────────┐        ┌─────────────────────┐
                       │ Google Gemini Flash │        │ Volunteer Registry  │
                       │   (Classifies,      │        │ (Reads status from  │
                       │ Translate & Rates)  │        │   active requests)  │
                       └──────────┬──────────┘        └──────────┬──────────┘
                                  │                              │
                                  └──────────────┬───────────────┘
                                                 ▼
                                     ┌───────────────────────┐
                                     │  Matching Algorithm   │
                                     │ (Skills & Zone Score) │
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │  Firebase Firestore   │
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │ NGO Dashboard (Board) │
                                     └───────────────────────┘
```

---

## ⚙️ Local Setup & Installation

### Prerequisites
* **Node.js** (v18.x or higher recommended)
* **npm** (comes with Node)
* A **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))
* A **Firebase Project** with Firestore Database enabled.

### 1. Clone the Repository
```bash
git clone https://github.com/nityamm-coder/Smart-Resource-Allocation.git
cd Smart-Resource-Allocation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a file named `.env` in the root of the project and fill in your keys:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here

# Paste your complete Firebase Service Account JSON as a single-line string:
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "your-project", "private_key_id": "...", "private_key": "...", "client_email": "...", ...}'
```

### 4. Running the Project
* **Development Mode (with auto-reload):**
  ```bash
  npm run dev
  ```
* **Production Mode:**
  ```bash
  npm start
  ```

Once started, open [http://localhost:3000](http://localhost:3000) in your web browser. 
* To access the Victim Form: [http://localhost:3000/index.html](http://localhost:3000/index.html)
* To access the NGO Control Dashboard: [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)

---

## 📊 Volunteer Matching Algorithm

The backend calculates volunteer matching dynamically on each submission:

1. **Availability Check:**
   The database queries all current requests with `status == "Open"` or `"In Progress"`. Any volunteer ID linked to these active requests is flagged as **Busy (available = false)** to prevent double allocation.
   
2. **Suitor Scoring:**
   Every available volunteer is scored against the new request parameters:
   - **Category Match (+2 Points):** If the volunteer's skills array contains the AI-extracted request category (e.g., a volunteer has skill "Medical" and request is classified as "Medical").
   - **Zone Proximity Match (+1 Point):** If the volunteer resides in the same geographical zone as the disaster site (e.g., Thane, Kalyan, Vasind).

3. **Fallback Resolution:**
   - The volunteer with the highest total score is matched and assigned.
   - If multiple volunteers have the same score, the system picks the first match.
   - If no volunteers are available or match the criteria, the request is marked `No volunteer matched` and sits in the `Open` column for manual admin resolution.

---

## 🔮 Future Scope

- **Real-world SMS Gateway:** Integrating Twilio SMS or Africa's Talking API so people without smart devices can text requests to a designated toll-free number.
- **Geo-Route Optimization:** Integration of Mapbox / Google Maps API to chart shortest routes for rescue teams.
- **Push & SMS Notifications:** Automated WhatsApp/SMS alerts dispatched to volunteers when they are matched to a crisis.
- **Offline Sync Capabilities:** Using PWA technologies to cache database updates client-side and automatically push changes once internet connection is restored.
- **Predictive Analytics:** An AI module monitoring resource request frequency to predict restocking patterns for critical zones.
- **Multi-Tenant NGO Hubs:** Logical partitioning of the platform allowing regional NGO branches (e.g., Vasind, Kalyan, Thane) to manage their respective local data and volunteers securely and independently.
- **IVR Implementation:** An Interactive Voice Response system for victims to call a designated number and report emergencies using keypad inputs or voice commands.

---

## 📁 Directory Structure

```
smart-resource-allocation/
├── public/
│   ├── index.html        # Victim Submission Form
│   ├── dashboard.html    # NGO Kanban Board, Interactive Dark Map, and Control Center
│   ├── tracking.html     # Live Tracking Portal for victims (Status stepper, AI safety tips, Ratings)
│   ├── app.js            # Frontend JavaScript (Realtime feeds, Leaflet map overlays, timeline actions, UI updates)
│   └── style.css         # Custom CSS (Sleek dark theme, pulsating status markers, glassmorphic styling, responsive layout)
├── server.js             # Express Backend Server (Gemini integration, matching algorithm, API endpoints)
├── package.json          # Node project manifest
├── vercel.json           # Vercel Serverless hosting configurations
└── .env                  # Project Configuration variables (Ignored in git)
```


<br>




# **Coding Today! Engineering Tomorrow!** <br>
Contributions are welcome! Please feel free to submit a Pull Request. <br>
Made By- Nityam Mishra <br>
Email: nityamm2005@gmail.com <br>
GitHub: [nityamm-coder](https://github.com/nityamm-coder)