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
const rateLimit = require("express-rate-limit");

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

// ── Rate Limiters (Spam Control) ──────────────────────────────
// These middleware functions block users who send too many requests
// in a short time window — a strong signal of bot/spam activity.

/**
 * General API limiter — applied to ALL /api/* routes.
 * Allows 100 requests per 15 minutes per IP address.
 * This is a safety net to prevent any kind of API abuse.
 */
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: 100,                  // Max 100 requests per window per IP
  standardHeaders: true,     // Send RateLimit-* headers so clients know their limits
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP. Please wait 15 minutes and try again.",
    retryAfter: "15 minutes",
  },
});

/**
 * Strict submit limiter — applied ONLY to POST /api/submit.
 * Each submission triggers Gemini AI + Firestore write — these are expensive.
 * We allow only 5 submissions per 15 minutes per IP to prevent spam flooding.
 */
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 5,                   // Max 5 form submissions per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You have submitted too many requests. Please wait 15 minutes before trying again. This limit prevents spam and ensures resources reach genuine victims.",
    retryAfter: "15 minutes",
  },
});

/**
 * SMS simulation limiter — applied to POST /api/simulate-sms.
 * Allows 10 SMS simulations per hour per IP.
 */
const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour window
  max: 10,                   // Max 10 SMS simulations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many SMS simulation requests. Please wait an hour before trying again.",
    retryAfter: "1 hour",
  },
});

// Apply the general limiter to every /api/* route globally.
// The stricter per-route limiters below add an extra layer on top of this.
app.use("/api/", generalApiLimiter);
console.log("🛡️  Rate limiting enabled: General(100/15min), Submit(5/15min), SMS(10/hr)");

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
    available: true,
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

// ── Helper: Seed Volunteers To Firestore ──────────────────────
/**
 * Seeds the default mock volunteers list to Firestore if the collection is empty.
 */
async function seedVolunteersToDb() {
  try {
    const batch = db.batch();
    for (const v of volunteers) {
      const docRef = db.collection("volunteers").doc(v.id);
      batch.set(docRef, {
        name: v.name,
        skills: v.skills,
        zone: v.zone,
        phone: v.phone
      });
    }
    await batch.commit();
    console.log("🌱 Seeded mock volunteers to Firestore 'volunteers' collection.");
  } catch (err) {
    console.error("⚠️ Error seeding volunteers to Firestore:", err.message);
  }
}

// ── Helper: Get Dynamic Volunteers ─────────────────────────────
/**
 * Calculates volunteer availability dynamically based on active requests in Firestore.
 * If a volunteer is assigned to an active ("Open" or "In Progress") request,
 * they are marked as busy (available = false).
 */
async function getDynamicVolunteers() {
  try {
    const snapshot = await db.collection("requests")
      .where("status", "in", ["Open", "In Progress"])
      .get();
    
    const busyVolunteerIds = new Set();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.matchedVolunteer && data.matchedVolunteer.id) {
        busyVolunteerIds.add(data.matchedVolunteer.id);
      }
    });

    let currentVolunteers = [];
    if (db) {
      const volSnapshot = await db.collection("volunteers").get();
      if (volSnapshot.empty) {
        await seedVolunteersToDb();
        currentVolunteers = volunteers;
      } else {
        volSnapshot.forEach((doc) => {
          currentVolunteers.push({ id: doc.id, ...doc.data() });
        });
      }
    } else {
      currentVolunteers = volunteers;
    }

    return currentVolunteers.map((v) => {
      const isBusy = busyVolunteerIds.has(v.id);
      return {
        ...v,
        available: !isBusy,
      };
    });
  } catch (err) {
    console.error("⚠️ Error calculating dynamic volunteers:", err.message);
    return volunteers; // Fallback to hardcoded list
  }
}

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
 * @param {Array} dynamicVolunteersList - Optional list of volunteers with dynamic availability
 * @returns {object|null}   - The best matched volunteer, or null if none
 */
function matchVolunteer(category, zone, dynamicVolunteersList = volunteers) {
  let bestMatch = null;
  let highestScore = -1;

  for (const volunteer of dynamicVolunteersList) {
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
app.post("/api/submit", submitLimiter, async (req, res) => {
  const { description, zone, address, victimPhone } = req.body;
  const finalAddress = (address && address.trim()) ? address.trim() : "Location details to be verified via call";

  // Basic validation — make sure we got something to work with (address is optional now)
  if (!description || !zone || !victimPhone) {
    return res
      .status(400)
      .json({ error: "Please provide description, zone, and your contact phone number." });
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
    const dynamicVolunteersList = await getDynamicVolunteers();
    const matchedVolunteer = matchVolunteer(category, zone, dynamicVolunteersList);

    // ── Step 3: Build the full record to save ────────────────
    const timestamp = new Date().toISOString();
    const requestRecord = {
      description,
      zone,
      address: finalAddress,
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
      timeline: [
        {
          status: "Open",
          timestamp,
          note: `Request reported in ${detectedLanguage || "English"}. AI Urgency: ${urgency}/5.` +
                (matchedVolunteer ? ` Automatically matched to volunteer ${matchedVolunteer.name}.` : " No volunteer matched.")
        }
      ]
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

// ── Route: POST /api/simulate-sms ─────────────────────────────
/**
 * Simulates receiving an offline SMS request.
 * Takes { smsText, senderPhone }. Uses Gemini to parse and extract information.
 */
app.post("/api/simulate-sms", smsLimiter, async (req, res) => {
  const { smsText, senderPhone } = req.body;
  if (!smsText || !senderPhone) {
    return res.status(400).json({ error: "Please provide smsText and senderPhone." });
  }

  try {
    const systemPrompt = `
You are a strict JSON-only parser and translation API for a disaster relief SMS gateway.
Your job is to read a single raw SMS message from a victim (which may contain spelling errors, shorthand text, Hinglish, Hindi, Marathi, or English), extract the key details, classify it, and translate it to English.

Rules:
1. Return ONLY a raw JSON object. No markdown, no explanation, no extra text.
2. The JSON must have exactly these keys: "name", "phone", "zone", "address", "description", "category", "urgency", "detectedLanguage".
3. For keys:
   - "name": Extracted name of the person needing help (e.g. "Amit Patil"). If not mentioned in the message, set this to "Unknown Victim".
   - "phone": Extracted contact phone number from the message text. If no phone number is found in the text, set this to the sender's phone number: "${senderPhone}".
   - "zone": Locate which of these hubs/zones is mentioned or is the closest match for the location: "Vasind", "Kalyan", "Thane", "Mumbai Central". If none matches and you can't guess, default to "Thane".
   - "address": The specific address, landmarks, or street mentioned in the message.
   - "description": Translate the request details into clean English. This should describe the specific need.
   - "category": Must be exactly ONE of: "Food", "Medical", "Shelter", "Other".
   - "urgency": An integer from 1 to 5, where 1 = low and 5 = critical.
   - "detectedLanguage": The language the original text was written in (e.g. "English", "Hindi", "Marathi", "Hinglish").

Example raw SMS:
"Vasind area: need medical kit urgently for Amit, phone 9898989898, near station"
Response:
{"name": "Amit", "phone": "9898989898", "zone": "Vasind", "address": "near station", "description": "Need medical kit urgently", "category": "Medical", "urgency": 4, "detectedLanguage": "English"}

Example raw SMS:
"mumbai central, bhook lagi h khana bhejo door no 4"
Response:
{"name": "Unknown Victim", "phone": "${senderPhone}", "zone": "Mumbai Central", "address": "door no 4", "description": "Hungry, send food", "category": "Food", "urgency": 3, "detectedLanguage": "Hinglish"}
    `.trim();

    const fullPrompt = `${systemPrompt}\n\nSMS Message: "${smsText}"`;
    const geminiResult = await geminiModel.generateContent(fullPrompt);
    const rawText = geminiResult.response.text().trim();

    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    const { name, phone, zone, address, description, category, urgency, detectedLanguage } = parsed;

    // Match a volunteer
    const dynamicVolunteersList = await getDynamicVolunteers();
    const matchedVolunteer = matchVolunteer(category, zone, dynamicVolunteersList);

    const timestamp = new Date().toISOString();
    const requestRecord = {
      description: smsText,
      zone: zone || "Thane",
      address: address || "N/A",
      victimPhone: phone || senderPhone,
      category: category || "Other",
      urgency: Number(urgency) || 3,
      detectedLanguage: detectedLanguage || "English",
      translatedDescription: description || smsText,
      matchedVolunteer: matchedVolunteer
        ? {
            id: matchedVolunteer.id,
            name: matchedVolunteer.name,
            skills: matchedVolunteer.skills,
            zone: matchedVolunteer.zone,
            phone: matchedVolunteer.phone,
          }
        : null,
      status: "Open",
      source: "SMS",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timeline: [
        {
          status: "Open",
          timestamp,
          note: `Request received via SMS Gateway (Simulated). Sender Phone: ${senderPhone}. AI extracted contact: ${phone || senderPhone}, name: ${name || "Unknown"}, language: ${detectedLanguage}. AI Urgency: ${urgency}/5.` +
                (matchedVolunteer ? ` Automatically matched to volunteer ${matchedVolunteer.name}.` : " No volunteer matched.")
        }
      ]
    };

    // Save to Firestore
    const docRef = await db.collection("requests").add(requestRecord);
    console.log(`✅ SMS request saved to Firestore with ID: ${docRef.id}`);

    return res.status(201).json({
      success: true,
      id: docRef.id,
      ...requestRecord,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Error in /api/simulate-sms:", err.message);
    return res.status(500).json({ error: "Something went wrong processing SMS. Check server logs." });
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

// ── Route: GET /api/inventory ─────────────────────────────────
/**
 * Retrieves the current relief supply inventory counts.
 * Seeds default values if the inventory doesn't exist yet.
 */
app.get("/api/inventory", async (req, res) => {
  try {
    const docRef = db.collection("inventory").doc("current");
    const doc = await docRef.get();
    if (!doc.exists) {
      const defaultInventory = { Food: 50, Medical: 30, Shelter: 20, Other: 100 };
      await docRef.set(defaultInventory);
      return res.json({ success: true, inventory: defaultInventory });
    }
    return res.json({ success: true, inventory: doc.data() });
  } catch (err) {
    console.error("❌ Error fetching inventory:", err.message);
    return res.status(500).json({ error: "Could not fetch inventory." });
  }
});

// ── Route: POST /api/inventory/restock ────────────────────────
/**
 * Restocks relief supply items.
 * Expects { category, quantity } in body.
 */
app.post("/api/inventory/restock", async (req, res) => {
  const { category, quantity } = req.body;
  
  const validCategories = ["Food", "Medical", "Shelter", "Other"];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Use one of: ${validCategories.join(", ")}` });
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) {
    return res.status(400).json({ error: "Quantity must be a positive number." });
  }

  try {
    const docRef = db.collection("inventory").doc("current");
    let updatedInv = {};
    
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const currentInv = doc.exists ? doc.data() : { Food: 50, Medical: 30, Shelter: 20, Other: 100 };
      const currentVal = currentInv[category] !== undefined ? currentInv[category] : 0;
      const newVal = currentVal + numQty;
      
      updatedInv = { ...currentInv, [category]: newVal };
      transaction.set(docRef, updatedInv);
    });

    return res.json({ success: true, inventory: updatedInv });
  } catch (err) {
    console.error("❌ Error restocking inventory:", err.message);
    return res.status(500).json({ error: "Could not restock inventory." });
  }
});

// ── Route: GET /api/volunteers ────────────────────────────────
/**
 * Exposes the mock volunteer database so the NGO dashboard
 * can display a real-time list of volunteers, their status,
 * locations, and skills.
 */
app.get("/api/volunteers", async (req, res) => {
  const dynamicVolunteersList = await getDynamicVolunteers();
  return res.json({ success: true, volunteers: dynamicVolunteersList });
});

// ── Route: POST /api/volunteers ───────────────────────────────
/**
 * Registers a new volunteer. Saves to Firestore if connected,
 * otherwise appends to in-memory volunteers array.
 */
app.post("/api/volunteers", async (req, res) => {
  const { name, skills, zone, phone } = req.body;

  if (!name || !skills || !zone || !phone) {
    return res.status(400).json({ error: "Please provide all required volunteer details (name, skills, zone, phone)." });
  }

  if (!Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: "Skills must be a non-empty list." });
  }

  try {
    const newVol = {
      name,
      skills,
      zone,
      phone,
    };

    if (db) {
      const docRef = await db.collection("volunteers").add(newVol);
      const addedVol = { id: docRef.id, ...newVol, available: true };
      console.log(`✅ Volunteer registered in Firestore with ID: ${docRef.id}`);
      return res.status(201).json({ success: true, volunteer: addedVol });
    } else {
      // In-memory fallback
      const id = "v" + (volunteers.length + 1).toString().padStart(3, "0");
      const addedVol = { id, ...newVol, available: true };
      volunteers.push(addedVol);
      console.log(`✅ Volunteer registered in-memory with ID: ${id}`);
      return res.status(201).json({ success: true, volunteer: addedVol });
    }
  } catch (err) {
    console.error("❌ Error registering volunteer:", err.message);
    return res.status(500).json({ error: "Could not register volunteer. Check server logs." });
  }
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
 * Also logs the status change event in the request's timeline,
 * and increments or decrements the category inventory as needed.
 */
app.patch("/api/requests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Open", "In Progress", "Resolved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use one of: ${validStatuses.join(", ")}` });
  }

  try {
    const docRef = db.collection("requests").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Request not found." });
    }

    const currentData = doc.data();
    const oldStatus = currentData.status;

    if (oldStatus === status) {
      return res.json({ success: true, id, status });
    }

    const timestamp = new Date().toISOString();
    let timelineNote = `Status updated from ${oldStatus} to ${status}.`;
    const inventoryRef = db.collection("inventory").doc("current");
    const category = currentData.category || "Other";

    await db.runTransaction(async (transaction) => {
      // 1. Calculate inventory changes
      if (status === "Resolved" && oldStatus !== "Resolved") {
        const invDoc = await transaction.get(inventoryRef);
        const currentInv = invDoc.exists ? invDoc.data() : { Food: 50, Medical: 30, Shelter: 20, Other: 100 };
        const count = currentInv[category] !== undefined ? currentInv[category] : 10;
        const newCount = Math.max(0, count - 1);
        
        transaction.set(inventoryRef, { [category]: newCount }, { merge: true });
        timelineNote += ` 1 ${category} package deducted from inventory (Remaining: ${newCount}).`;
      } else if (oldStatus === "Resolved" && status !== "Resolved") {
        const invDoc = await transaction.get(inventoryRef);
        const currentInv = invDoc.exists ? invDoc.data() : { Food: 50, Medical: 30, Shelter: 20, Other: 100 };
        const count = currentInv[category] !== undefined ? currentInv[category] : 10;
        const newCount = count + 1;
        
        transaction.set(inventoryRef, { [category]: newCount }, { merge: true });
        timelineNote += ` 1 ${category} package returned to inventory (New Total: ${newCount}).`;
      }

      // 2. Build new timeline
      const newTimelineEntry = {
        status,
        timestamp,
        note: timelineNote
      };
      const updatedTimeline = [...(currentData.timeline || []), newTimelineEntry];

      // 3. Commit status and timeline updates
      transaction.update(docRef, { status, timeline: updatedTimeline });
    });

    return res.json({ success: true, id, status });
  } catch (err) {
    console.error("❌ Error updating status:", err.message);
    return res.status(500).json({ error: "Could not update status." });
  }
});

// ── Route: DELETE /api/requests/resolved ──────────────────────
/**
 * Bulk deletes all requests with status "Resolved".
 */
app.delete("/api/requests/resolved", async (req, res) => {
  try {
    const snapshot = await db.collection("requests").where("status", "==", "Resolved").get();
    if (snapshot.empty) {
      return res.json({ success: true, message: "No resolved requests to delete." });
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`🗑️ Bulk deleted ${snapshot.size} resolved requests.`);
    return res.json({ success: true, message: `Successfully deleted ${snapshot.size} resolved requests.` });
  } catch (err) {
    console.error("❌ Error bulk-deleting resolved requests:", err.message);
    return res.status(500).json({ error: "Could not delete resolved requests." });
  }
});

// ── Route: DELETE /api/requests/:id ───────────────────────────
/**
 * Deletes a single request by ID.
 */
app.delete("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection("requests").doc(id).delete();
    console.log(`🗑️ Request deleted: ${id}`);
    return res.json({ success: true, message: "Request deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting request:", err.message);
    return res.status(500).json({ error: "Could not delete request." });
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
