// ============================================================
// server.js — Smart Resource Allocation Backend
// ============================================================
// This is our main backend file. It does three things:
//   1. Serves our HTML/CSS/JS files from the /public folder
//   2. Takes a text description from the user and asks Gemini AI
//      to classify it (category + urgency)
//   3. Saves that classified request to Firestore, then matches
//      it to the best available volunteer
// ============================================================

// Load environment variables from our .env file
require("dotenv").config();

const express = require("express");
const path = require("path");

// Google Gemini AI SDK
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Firebase Admin SDK (for server-side Firestore access)
const admin = require("firebase-admin");

// ── App Setup ────────────────────────────────────────────────
const app = express();

// Allow our server to read JSON request bodies
app.use(express.json());

// Serve everything inside the /public folder as static files
// e.g. GET /index.html → returns public/index.html
app.use(express.static(path.join(__dirname, "public")));

// ── Firebase Initialization ───────────────────────────────────
// We parse the service account key from the environment variable.
// This keeps secret credentials out of our source code.
let db; // Will hold our Firestore database reference

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  // Only initialize Firebase if it hasn't been initialized already.
  // This is important for Vercel serverless — functions can be reused.
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
  console.log("✅ Firebase connected successfully.");
} catch (err) {
  console.error("❌ Firebase init error:", err.message);
  console.warn("⚠️  Running without Firebase. Firestore calls will fail.");
}

// ── Gemini AI Setup ───────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use the gemini-2.5-flash model — it's fast and free-tier friendly
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ── Sample Volunteer Data ─────────────────────────────────────
// In a real app this would live in a database.
// For the MVP we hardcode a list so we can demo matching right away.
const volunteers = [
  {
    id: "v001",
    name: "Priya Sharma",
    skills: ["Medical", "First Aid"],
    zone: "Vasind",
    available: true,
    phone: "+91 98765 43210",
  },
  {
    id: "v002",
    name: "Rohan Mehta",
    skills: ["Food", "Logistics"],
    zone: "Kalyan",
    available: true,
    phone: "+91 87654 32109",
  },
  {
    id: "v003",
    name: "Anita Desai",
    skills: ["Shelter", "Construction"],
    zone: "Thane",
    available: false, // Currently busy
    phone: "+91 76543 21098",
  },
  {
    id: "v004",
    name: "Kunal Verma",
    skills: ["Medical", "Shelter"],
    zone: "Mumbai Central",
    available: true,
    phone: "+91 65432 10987",
  },
  {
    id: "v005",
    name: "Simran Kaur",
    skills: ["Food", "Medical"],
    zone: "Vasind",
    available: true,
    phone: "+91 54321 09876",
  },
  {
    id: "v006",
    name: "Aarav Patel",
    skills: ["Medical", "First Aid"],
    zone: "Thane",
    available: true,
    phone: "+91 91234 56789",
  },
  {
    id: "v007",
    name: "Diya Shah",
    skills: ["Medical", "First Aid"],
    zone: "Kalyan",
    available: true,
    phone: "+91 92345 67890",
  },
  {
    id: "v008",
    name: "Kabir Singh",
    skills: ["Food", "Logistics"],
    zone: "Thane",
    available: true,
    phone: "+91 93456 78901",
  },
  {
    id: "v009",
    name: "Neha Gupta",
    skills: ["Shelter", "Construction"],
    zone: "Kalyan",
    available: true,
    phone: "+91 94567 89012",
  },
];

// ── Volunteer Matching Function ───────────────────────────────
/**
 * matchVolunteer
 *
 * Loops through our volunteer list and gives each volunteer a score
 * based on how well they match the request's category and zone.
 *
 * Scoring rules:
 *   +2 points  → volunteer's skills include the request category
 *   +1 point   → volunteer is in the same zone as the requester
 *   Unavailable volunteers are automatically skipped.
 *
 * @param {string} category - e.g. "Medical", "Food", "Shelter"
 * @param {string} zone     - e.g. "North", "South"
 * @returns {object|null}   - The best matched volunteer, or null if none
 */
function matchVolunteer(category, zone) {
  let bestMatch = null;
  let highestScore = -1;

  for (const volunteer of volunteers) {
    // Skip volunteers who are already busy
    if (!volunteer.available) continue;

    let score = 0;

    // +2 if the volunteer knows how to help with this category
    if (volunteer.skills.includes(category)) {
      score += 2;
    }

    // +1 if the volunteer is already in the same area
    if (volunteer.zone === zone) {
      score += 1;
    }

    // Keep track of whoever has the highest score so far
    if (score > highestScore) {
      highestScore = score;
      bestMatch = volunteer;
    }
  }

  return bestMatch; // Could be null if all volunteers are unavailable
}

// ── Route: POST /api/submit ───────────────────────────────────
/**
 * This is the main route called when a user submits a community need.
 *
 * Flow:
 *  1. Receive { description, zone } from the frontend form
 *  2. Send description to Gemini → get back { category, urgency }
 *  3. Run matchVolunteer() to find the best volunteer
 *  4. Save everything to Firestore
 *  5. Send the full result back to the frontend
 */
app.post("/api/submit", async (req, res) => {
  const { description, zone, address, victimPhone } = req.body;

  // Basic validation — make sure we got something to work with
  if (!description || !zone || !address || !victimPhone) {
    return res
      .status(400)
      .json({ error: "Please provide description, zone, address, and your contact phone number." });
  }

  try {
    // ── Step 1: Ask Gemini to classify and translate the request ──────────
    // We use a very strict system prompt to force Gemini to reply
    // ONLY with valid JSON. This handles classification, urgency, language detection, and translation.
    const systemPrompt = `
You are a strict JSON-only classification and translation API for a disaster relief system.
Your job is to read a community need description (which may be in English, Hindi, Marathi, Hinglish, or other regional languages), classify it, detect its language, and translate it to English.

Rules:
- Return ONLY a raw JSON object. No markdown, no explanation, no extra text.
- The JSON must have exactly four keys: "category", "urgency", "detectedLanguage", and "translatedDescription".
- "category" must be exactly ONE of: "Food", "Medical", "Shelter", "Other".
- "urgency" must be an integer between 1 and 5, where 1 = low and 5 = critical.
- "detectedLanguage" should be the name of the language the request was written in (e.g. "English", "Hindi", "Marathi", "Hinglish", etc.).
- "translatedDescription" must be the complete, accurate English translation of the description. If the original description is already in English, "translatedDescription" must match the original description exactly.

Example output:
{"category": "Medical", "urgency": 5, "detectedLanguage": "Hindi", "translatedDescription": "An elderly man in our building has run out of insulin and cannot reach a hospital."}
    `.trim();

    const fullPrompt = `${systemPrompt}\n\nDescription: "${description}"`;

    const geminiResult = await geminiModel.generateContent(fullPrompt);
    const rawText = geminiResult.response.text().trim();

    // Try to parse the JSON Gemini returned
    // Remove potential markdown code fences just in case
    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    const classified = JSON.parse(cleanedText);

    const { category, urgency, detectedLanguage, translatedDescription } = classified;

    // ── Step 2: Match a volunteer ────────────────────────────
    const matchedVolunteer = matchVolunteer(category, zone);

    // ── Step 3: Build the full record to save ────────────────
    const requestRecord = {
      description,
      zone,
      address,
      victimPhone,
      category,
      urgency: Number(urgency),
      detectedLanguage: detectedLanguage || "English",
      translatedDescription: translatedDescription || description,
      matchedVolunteer: matchedVolunteer
        ? {
            id: matchedVolunteer.id,
            name: matchedVolunteer.name,
            skills: matchedVolunteer.skills,
            zone: matchedVolunteer.zone,
            phone: matchedVolunteer.phone,
          }
        : null,
      status: "Open", // All new requests start as "Open"
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // ── Step 4: Save to Firestore ────────────────────────────
    const docRef = await db.collection("requests").add(requestRecord);
    console.log(`✅ Request saved to Firestore with ID: ${docRef.id}`);

    // ── Step 5: Send back the result ─────────────────────────
    return res.status(201).json({
      success: true,
      id: docRef.id,
      ...requestRecord,
      // serverTimestamp isn't serializable, so we replace it for the response
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Error in /api/submit:", err.message);
    return res
      .status(500)
      .json({ error: "Something went wrong. Check the server logs." });
  }
});

// ── Route: GET /api/requests/:id ─────────────────────────────
/**
 * Fetches the details/status of a single request.
 * Useful for the victim-side tracking page to get live updates.
 */
app.get("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await db.collection("requests").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Request not found." });
    }
    return res.json({ success: true, request: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("❌ Error fetching request status:", err.message);
    return res.status(500).json({ error: "Could not fetch status." });
  }
});

// ── Route: GET /api/volunteers ────────────────────────────────
/**
 * Exposes the mock volunteer database so the NGO dashboard
 * can display a real-time list of volunteers, their status,
 * locations, and skills.
 */
app.get("/api/volunteers", (req, res) => {
  return res.json({ success: true, volunteers });
});

// ── Route: GET /api/requests ──────────────────────────────────
/**
 * The dashboard calls this route to load all community requests.
 * Results are sorted by urgency (highest first) so NGOs see
 * the most critical needs at the top.
 */
app.get("/api/requests", async (req, res) => {
  try {
    const snapshot = await db
      .collection("requests")
      .orderBy("urgency", "desc")
      .get();

    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ success: true, requests });
  } catch (err) {
    console.error("❌ Error in /api/requests:", err.message);
    return res
      .status(500)
      .json({ error: "Could not fetch requests from Firestore." });
  }
});

// ── Route: PATCH /api/requests/:id/status ────────────────────
/**
 * Lets the NGO dashboard update the status of a request
 * e.g. from "Open" → "In Progress" → "Resolved"
 */
app.patch("/api/requests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Open", "In Progress", "Resolved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use one of: ${validStatuses.join(", ")}` });
  }

  try {
    await db.collection("requests").doc(id).update({ status });
    return res.json({ success: true, id, status });
  } catch (err) {
    console.error("❌ Error updating status:", err.message);
    return res.status(500).json({ error: "Could not update status." });
  }
});

// ── Start Server (local dev only) ────────────────────────────
// We only call app.listen when running locally (not on Vercel).
// Vercel imports `module.exports = app` and handles listening itself.
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// ── Export for Vercel Serverless ──────────────────────────────
// Vercel needs this export to treat server.js as a serverless function.
module.exports = app;
