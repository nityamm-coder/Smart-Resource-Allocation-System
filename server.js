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

// Blockchain trust layer service
const blockchain = require("./blockchainService");

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
    walletAddress: "0x261e0a053e1a067a122fd7a2875b9b3d01e46e6a"
  },
  {
    id: "v002",
    name: "Rohan Mehta",
    skills: ["Food", "Logistics"],
    zone: "Kalyan",
    available: true,
    phone: "+91 87654 32109",
    walletAddress: "0xf9a32c1b423871d3a51bc9b201a0f9b3e1f32cb4"
  },
  {
    id: "v003",
    name: "Anita Desai",
    skills: ["Shelter", "Construction"],
    zone: "Thane",
    available: true,
    phone: "+91 76543 21098",
    walletAddress: "0x32a1f9e2b10a53b2188e6289b7a43501a1a1234c"
  },
  {
    id: "v004",
    name: "Kunal Verma",
    skills: ["Medical", "Shelter"],
    zone: "Mumbai Central",
    available: true,
    phone: "+91 65432 10987",
    walletAddress: "0x4fe63bc91addfa2875b9b3d01e46e6af98b8dc20"
  },
  {
    id: "v005",
    name: "Simran Kaur",
    skills: ["Food", "Medical"],
    zone: "Vasind",
    available: true,
    phone: "+91 54321 09876",
    walletAddress: "0x5a1b3c91dfb28e6289d7a43501ab1a1234e1234f"
  },
  {
    id: "v006",
    name: "Aarav Patel",
    skills: ["Medical", "First Aid"],
    zone: "Thane",
    available: true,
    phone: "+91 91234 56789",
    walletAddress: "0x6fba32c1b42387d3a51bc9b201a0f9b3e1f32cb4a"
  },
  {
    id: "v007",
    name: "Diya Shah",
    skills: ["Medical", "First Aid"],
    zone: "Kalyan",
    available: true,
    phone: "+91 92345 67890",
    walletAddress: "0x7cda32c1b42387d3a51bc9b201a0f9b3e1f32cb4b"
  },
  {
    id: "v008",
    name: "Kabir Singh",
    skills: ["Food", "Logistics"],
    zone: "Thane",
    available: true,
    phone: "+91 93456 78901",
    walletAddress: "0x8dba32c1b42387d3a51bc9b201a0f9b3e1f32cb4c"
  },
  {
    id: "v009",
    name: "Neha Gupta",
    skills: ["Shelter", "Construction"],
    zone: "Kalyan",
    available: true,
    phone: "+91 94567 89012",
    walletAddress: "0x9eba32c1b42387d3a51bc9b201a0f9b3e1f32cb4d"
  }
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
        phone: v.phone,
        walletAddress: v.walletAddress
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
          const data = doc.data();
          currentVolunteers.push({ 
            id: doc.id, 
            ...data,
            walletAddress: data.walletAddress || blockchain.getDeterministicWalletAddress(doc.id)
          });
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
        walletAddress: v.walletAddress || blockchain.getDeterministicWalletAddress(v.id)
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

/**
 * Checks if two descriptions are similar based on keyword overlap.
 * Uses lowercase comparison, stripping special characters, and matches at least 1 keyword (length > 2).
 * Skip common English stop words.
 */
function areDescriptionsSimilar(desc1, desc2) {
  if (!desc1 || !desc2) return false;
  
  const stopWords = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at", 
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could", 
    "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for", "from", "further", 
    "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here", "heres", 
    "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", 
    "is", "isnt", "it", "its", "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", 
    "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", 
    "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that", 
    "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they", "theyd", 
    "theyll", "theyre", "theyve", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", 
    "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens", "where", "wheres", 
    "which", "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would", "wouldnt", "you", "youd", 
    "youll", "youre", "youve", "your", "yours", "yourself", "yourselves", "need", "needs", "want", "wants", "please",
    "request", "requests", "help", "emergency", "urgently", "urgent"
  ]);

  const clean = (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  };

  const words1 = new Set(clean(desc1));
  const words2 = clean(desc2);
  
  for (const word of words2) {
    if (words1.has(word)) {
      return true; // Match found
    }
  }
  return false;
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
Your job is to read a community need description (which may be in English, Hindi, Marathi, Hinglish, or other regional languages), classify it, detect its language, translate it to English, and generate actionable safety instructions.

Rules:
- Return ONLY a raw JSON object. No markdown, no explanation, no extra text.
- The JSON must have exactly five keys: "category", "urgency", "detectedLanguage", "translatedDescription", and "safetyTips".
- "category" must be exactly ONE of: "Food", "Medical", "Shelter", "Other".
- "urgency" must be an integer between 1 and 5, where 1 = low and 5 = critical.
- "detectedLanguage" should be the name of the language the request was written in (e.g. "English", "Hindi", "Marathi", "Hinglish", etc.).
- "translatedDescription" must be the complete, accurate English translation of the description. If the original description is already in English, "translatedDescription" must match the original description exactly.
- "safetyTips" must be a JSON array of strings containing 4-5 extremely relevant, specific, actionable, and life-saving safety tips or instructions tailored to this specific scenario and its urgency level (e.g., immediate first aid tips if medical, emergency evacuation or water safety advice if flooding, etc.). These safetyTips MUST be written in the SAME LANGUAGE as the user's description (detectedLanguage). For example, if the description is in Hindi, safetyTips must be in Hindi. If in Hinglish (Hindi written in English alphabet/script), safetyTips must be in Hinglish. If in Marathi, safetyTips must be in Marathi. If in English, safetyTips must be in English. Keep the tips concise, clear, and easy to read.

Example output:
{"category": "Medical", "urgency": 5, "detectedLanguage": "Hindi", "translatedDescription": "An elderly man in our building has run out of insulin and cannot reach a hospital.", "safetyTips": ["Keep the patient calm, resting, and hydrated.", "Do not administer insulin if you do not know the correct dose.", "Try to contact local pharmacy or emergency services immediately.", "Prepare a medical history summary for when help arrives."]}
    `.trim();

    const fullPrompt = `${systemPrompt}\n\nDescription: "${description}"`;

    const geminiResult = await geminiModel.generateContent(fullPrompt);
    const rawText = geminiResult.response.text().trim();

    // Try to parse the JSON Gemini returned
    // Remove potential markdown code fences just in case
    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    const classified = JSON.parse(cleanedText);

    const { category, urgency, detectedLanguage, translatedDescription, safetyTips } = classified;

    // ── Step 1.5: Check for duplicate active requests to cluster ──────────
    let matchedRequestDoc = null;
    let currentUrgency = Number(urgency);

    if (db) {
      try {
        const activeRequestsSnapshot = await db.collection("requests")
          .where("status", "in", ["Open", "In Progress"])
          .where("zone", "==", zone)
          .where("category", "==", category)
          .get();
        
        for (const doc of activeRequestsSnapshot.docs) {
          const data = doc.data();
          // Match using translated descriptions to support multi-language clustering
          if (areDescriptionsSimilar(translatedDescription, data.translatedDescription)) {
            matchedRequestDoc = doc;
            break;
          }
        }
      } catch (err) {
        console.error("⚠️ Error checking duplicate requests:", err.message);
      }
    }

    if (matchedRequestDoc) {
      // ── Step 2a: Update existing request (Cluster Append) ──────────────
      const docId = matchedRequestDoc.id;
      const data = matchedRequestDoc.data();
      const updatedUrgency = Math.min(5, data.urgency + 1);
      const newTimestamp = new Date().toISOString();

      const newReport = {
        description,
        address: finalAddress,
        victimPhone,
        createdAt: newTimestamp,
        detectedLanguage: detectedLanguage || "English",
        translatedDescription: translatedDescription || description
      };

      const updatedClusteredReports = data.clusteredReports ? [...data.clusteredReports, newReport] : [newReport];
      
      const updatedTimeline = [
        ...(data.timeline || []),
        {
          status: data.status,
          timestamp: newTimestamp,
          note: `Clustered report added from ${victimPhone} (${detectedLanguage || "English"}). Urgency bumped to ${updatedUrgency}/5.`
        }
      ];

      const updateData = {
        urgency: updatedUrgency,
        clusteredReports: updatedClusteredReports,
        timeline: updatedTimeline
      };

      await db.collection("requests").doc(docId).update(updateData);
      console.log(`✅ Request clustered into existing document: ${docId}`);

      return res.status(200).json({
        success: true,
        id: docId,
        description: data.description,
        zone: data.zone,
        address: data.address,
        victimPhone: data.victimPhone,
        category: data.category,
        urgency: updatedUrgency,
        detectedLanguage: data.detectedLanguage,
        translatedDescription: data.translatedDescription,
        matchedVolunteer: data.matchedVolunteer
          ? {
              id: data.matchedVolunteer.id,
              name: data.matchedVolunteer.name,
              skills: data.matchedVolunteer.skills,
              zone: data.matchedVolunteer.zone,
              phone: data.matchedVolunteer.phone,
            }
          : null,
        status: data.status,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : newTimestamp,
        clusteredReports: updatedClusteredReports,
        timeline: updatedTimeline
      });
    }

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
      safetyTips: safetyTips || [],
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
      clusteredReports: [], // Initialise empty clustered reports array
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

// ── Route: GET /api/requests/by-phone/:phone ─────────────────────────
app.get("/api/requests/by-phone/:phone", async (req, res) => {
  const { phone } = req.params;
  if (!db) {
    return res.status(500).json({ error: "Database not connected" });
  }
  
  try {
    const snapshot = await db.collection("requests").where("victimPhone", "==", phone).get();
    const requests = [];
    snapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    
    const archivedSnapshot = await db.collection("archived_requests").where("victimPhone", "==", phone).get();
    archivedSnapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    
    requests.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ success: true, requests });
  } catch (err) {
    console.error("Error fetching requests by phone:", err);
    res.status(500).json({ error: "Failed to fetch history" });
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
    // ── Check if there is an unrated resolved request for this phone number ──
    let unratedResolvedRequest = null;
    if (db) {
      try {
        const resolvedSnapshot = await db.collection("requests")
          .where("victimPhone", "==", senderPhone)
          .where("status", "==", "Resolved")
          .get();
        
        for (const doc of resolvedSnapshot.docs) {
          const data = doc.data();
          if (data.rating === undefined || data.rating === null) {
            unratedResolvedRequest = { id: doc.id, ...data };
            break;
          }
        }

        if (!unratedResolvedRequest) {
          const archivedSnapshot = await db.collection("archived_requests")
            .where("victimPhone", "==", senderPhone)
            .where("status", "==", "Resolved")
            .get();
          
          for (const doc of archivedSnapshot.docs) {
            const data = doc.data();
            if (data.rating === undefined || data.rating === null) {
              unratedResolvedRequest = { id: doc.id, ...data };
              break;
            }
          }
        }
      } catch (err) {
        console.error("⚠️ Error checking unrated resolved requests:", err.message);
      }
    }

    const hasResolved = !!unratedResolvedRequest;
    const systemPrompt = `
You are a strict JSON-only parser and translation API for a disaster relief SMS gateway.
Your job is to read a single raw SMS message from a victim (which may contain spelling errors, shorthand text, Hinglish, Hindi, Marathi, or English).

${hasResolved ? `
We have a recently resolved rescue request matching this phone number.
Please determine if the message is:
1. A rating/feedback reply to the volunteer who helped them (e.g. "5", "4 stars", " Priya was amazing 5", "very bad 1").
2. A new emergency request (e.g. "need food", "water in house").

If it is a rating reply:
- Return ONLY a raw JSON object with these keys: "isRating", "rating", "feedback".
- "isRating" must be true.
- "rating" must be an integer between 1 and 5.
- "feedback" should be the translated English text of any comments they provided.

If it is NOT a rating reply (it is a new emergency request):
` : `
This is a new emergency request.
`}
- Return ONLY a raw JSON object with these keys: "isRating", "name", "phone", "zone", "address", "description", "category", "urgency", "detectedLanguage", "safetyTips".
- "isRating" must be false.
- "name": Extracted name of the person needing help (e.g. "Amit Patil"). If not mentioned in the message, set this to "Unknown Victim".
- "phone": Extracted contact phone number from the message text. If no phone number is found in the text, set this to the sender's phone number: "${senderPhone}".
- "zone": Locate which of these hubs/zones is mentioned or is the closest match for the location: "Vasind", "Kalyan", "Thane", "Mumbai Central". If none matches and you can't guess, default to "Thane".
- "address": The specific address, landmarks, or street mentioned in the message.
- "description": Translate the request details into clean English. This should describe the specific need.
- "category": Must be exactly ONE of: "Food", "Medical", "Shelter", "Other".
- "urgency": An integer from 1 to 5, where 1 = low and 5 = critical.
- "detectedLanguage": The language the original text was written in (e.g. "English", "Hindi", "Marathi", "Hinglish").
- "safetyTips": A JSON array of 4-5 extremely relevant, specific, and actionable life-saving safety tips or instructions tailored to this specific scenario and its urgency level. These safetyTips MUST be written in the SAME LANGUAGE as the user's SMS text. For example, if the SMS is in Hindi, safetyTips must be in Hindi. If in Hinglish (Hindi written in English alphabet/script), safetyTips must be in Hinglish. If in Marathi, safetyTips must be in Marathi. If in English, safetyTips must be in English. Keep the tips concise, clear, and easy to read.

Example output if rating:
{"isRating": true, "rating": 5, "feedback": "Priya was very helpful and arrived quickly."}

Example output if new request:
{"isRating": false, "name": "Unknown Victim", "phone": "${senderPhone}", "zone": "Mumbai Central", "address": "door no 4", "description": "Hungry, send food", "category": "Food", "urgency": 3, "detectedLanguage": "Hinglish", "safetyTips": ["If food is scarce, ration existing supplies.", "Keep food in clean, dry, sealed containers to prevent contamination.", "Avoid eating food that has come into contact with floodwater.", "Boil or purify any drinking water before consumption."]}
    `.trim();

    const fullPrompt = `${systemPrompt}\n\nSMS Message: "${smsText}"`;
    const geminiResult = await geminiModel.generateContent(fullPrompt);
    const rawText = geminiResult.response.text().trim();

    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    if (parsed.isRating) {
      const rating = Number(parsed.rating) || 5;
      const feedback = parsed.feedback || "";
      const requestId = unratedResolvedRequest.id;

      const ratingUpdate = {
        rating,
        feedback,
        timeline: [
          ...(unratedResolvedRequest.timeline || []),
          {
            status: "Resolved",
            timestamp: new Date().toISOString(),
            note: `Victim rated volunteer via SMS: ${rating}/5. Feedback: "${feedback}"`
          }
        ]
      };

      if (db) {
        await db.collection("requests").doc(requestId).update(ratingUpdate);
        const archiveRef = db.collection("archived_requests").doc(requestId);
        const archiveDoc = await archiveRef.get();
        if (archiveDoc.exists) {
          await archiveRef.update(ratingUpdate);
        }
      }

      // Update volunteer rating
      const volunteer = unratedResolvedRequest.matchedVolunteer;
      if (volunteer && volunteer.id) {
        if (db) {
          const volRef = db.collection("volunteers").doc(volunteer.id);
          const volDoc = await volRef.get();
          if (volDoc.exists) {
            const volData = volDoc.data();
            const ratings = volData.ratings || [];
            ratings.push(rating);
            const ratingCount = ratings.length;
            const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratingCount;

            await volRef.update({
              ratings,
              ratingCount,
              averageRating
            });
          }
        } else {
          // Fallback in-memory
          const vol = volunteers.find(v => v.id === volunteer.id);
          if (vol) {
            if (!vol.ratings) vol.ratings = [];
            vol.ratings.push(rating);
            vol.ratingCount = vol.ratings.length;
            vol.averageRating = vol.ratings.reduce((sum, r) => sum + r, 0) / vol.ratings.length;
          }
        }
      }

      console.log(`✅ Rating received via SMS for request ${requestId}: ${rating}/5`);
      return res.status(200).json({
        success: true,
        isRating: true,
        requestId,
        rating,
        feedback,
        volunteerName: volunteer ? volunteer.name : "Volunteer"
      });
    }

    const { name, phone, zone, address, description, category, urgency, detectedLanguage, safetyTips } = parsed;

    // ── Step 1.5: Check for duplicate active requests to cluster ──────────
    let matchedRequestDoc = null;
    const finalAddress = address || "N/A";
    const finalDescription = description || smsText;

    if (db) {
      try {
        const activeRequestsSnapshot = await db.collection("requests")
          .where("status", "in", ["Open", "In Progress"])
          .where("zone", "==", zone || "Thane")
          .where("category", "==", category || "Other")
          .get();
        
        for (const doc of activeRequestsSnapshot.docs) {
          const data = doc.data();
          if (areDescriptionsSimilar(finalDescription, data.translatedDescription)) {
            matchedRequestDoc = doc;
            break;
          }
        }
      } catch (err) {
        console.error("⚠️ Error checking duplicate SMS requests:", err.message);
      }
    }

    if (matchedRequestDoc) {
      // ── Step 2a: Update existing request (Cluster Append) ──────────────
      const docId = matchedRequestDoc.id;
      const data = matchedRequestDoc.data();
      const updatedUrgency = Math.min(5, data.urgency + 1);
      const newTimestamp = new Date().toISOString();

      const newReport = {
        description: smsText,
        address: finalAddress,
        victimPhone: phone || senderPhone,
        createdAt: newTimestamp,
        detectedLanguage: detectedLanguage || "English",
        translatedDescription: finalDescription
      };

      const updatedClusteredReports = data.clusteredReports ? [...data.clusteredReports, newReport] : [newReport];
      
      const updatedTimeline = [
        ...(data.timeline || []),
        {
          status: data.status,
          timestamp: newTimestamp,
          note: `Clustered SMS report added from ${phone || senderPhone} (${detectedLanguage || "English"}). Urgency bumped to ${updatedUrgency}/5.`
        }
      ];

      const updateData = {
        urgency: updatedUrgency,
        clusteredReports: updatedClusteredReports,
        timeline: updatedTimeline
      };

      await db.collection("requests").doc(docId).update(updateData);
      console.log(`✅ SMS Request clustered into existing document: ${docId}`);

      return res.status(200).json({
        success: true,
        id: docId,
        description: data.description,
        zone: data.zone,
        address: data.address,
        victimPhone: data.victimPhone,
        category: data.category,
        urgency: updatedUrgency,
        detectedLanguage: data.detectedLanguage,
        translatedDescription: data.translatedDescription,
        matchedVolunteer: data.matchedVolunteer
          ? {
              id: data.matchedVolunteer.id,
              name: data.matchedVolunteer.name,
              skills: data.matchedVolunteer.skills,
              zone: data.matchedVolunteer.zone,
              phone: data.matchedVolunteer.phone,
            }
          : null,
        status: data.status,
        source: data.source || "Web",
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : newTimestamp,
        clusteredReports: updatedClusteredReports,
        timeline: updatedTimeline
      });
    }

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
      safetyTips: safetyTips || [],
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
      clusteredReports: [],
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
// ── Route: GET /api/requests/stats ────────────────────────────
/**
 * Retrieves the total count of resolved requests from both active
 * and archived request databases.
 */
app.get("/api/requests/stats", async (req, res) => {
  try {
    if (!db) {
      return res.json({ success: true, resolvedCount: 0 });
    }

    const activeResolvedSnapshot = await db.collection("requests")
      .where("status", "==", "Resolved")
      .get();

    const archivedResolvedSnapshot = await db.collection("archived_requests")
      .where("status", "==", "Resolved")
      .get();

    const totalResolved = activeResolvedSnapshot.size + archivedResolvedSnapshot.size;

    return res.json({
      success: true,
      resolvedCount: totalResolved
    });
  } catch (err) {
    console.error("❌ Error fetching request stats:", err.message);
    return res.status(500).json({ error: "Could not fetch request statistics." });
  }
});


// ── Route: GET /api/requests/:id ─────────────────────────────
/**
 * Fetches the details/status of a single request.
 * Useful for the victim-side tracking page to get live updates.
 * Falls back to the archived_requests collection if not found in active requests.
 */
app.get("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  try {
    let doc = await db.collection("requests").doc(id).get();
    let requestData = null;
    
    if (doc.exists) {
      requestData = { id: doc.id, ...doc.data() };
    } else {
      const archivedDoc = await db.collection("archived_requests").doc(id).get();
      if (archivedDoc.exists) {
        requestData = { id: archivedDoc.id, ...archivedDoc.data() };
      }
    }

    if (!requestData) {
      return res.status(404).json({ error: "Request not found." });
    }
    
    return res.json({ success: true, request: requestData });
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

    // ── On-chain Trust Layer Supply Minting ──────────────────────
    let mintTxHash = null;
    let mintBlock = null;
    try {
      const mintResult = await blockchain.mintSupply(category, numQty);
      if (mintResult.success) {
        mintTxHash = mintResult.txHash;
        mintBlock = mintResult.blockNumber;
        console.log(`⛓️ Blockchain Supply Minted: ${numQty} ${category} -> Tx ${mintTxHash}`);
      }
    } catch (bcErr) {
      console.error("⚠️ Blockchain supply minting failed:", bcErr.message);
    }

    return res.json({ success: true, inventory: updatedInv, blockchainTx: mintTxHash, blockchainBlock: mintBlock });
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
  const volunteersWithWallet = dynamicVolunteersList.map(v => ({
    ...v,
    walletAddress: v.walletAddress || blockchain.getDeterministicWalletAddress(v.id)
  }));
  return res.json({ success: true, volunteers: volunteersWithWallet });
});

// ── Route: POST /api/volunteers ───────────────────────────────
/**
 * Registers a new volunteer. Saves to Firestore if connected,
 * otherwise appends to in-memory volunteers array.
 */
app.post("/api/volunteers", async (req, res) => {
  const { name, skills, zone, phone, walletAddress } = req.body;

  if (!name || !skills || !zone || !phone) {
    return res.status(400).json({ error: "Please provide all required volunteer details (name, skills, zone, phone)." });
  }

  if (!Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: "Skills must be a non-empty list." });
  }

  try {
    const determinedAddress = walletAddress || blockchain.getDeterministicWalletAddress(name + phone);
    const newVol = {
      name,
      skills,
      zone,
      phone,
      walletAddress: determinedAddress
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


// ── Route: DELETE /api/volunteers/:id ─────────────────────────
/**
 * Deletes a volunteer by ID.
 */
app.delete("/api/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (db) {
      await db.collection("volunteers").doc(id).delete();
      console.log(`🗑️ Volunteer deleted from Firestore: ${id}`);
      return res.json({ success: true, message: "Volunteer deleted successfully." });
    } else {
      const idx = volunteers.findIndex((v) => v.id === id);
      if (idx !== -1) {
        volunteers.splice(idx, 1);
        console.log(`🗑️ Volunteer deleted from memory: ${id}`);
        return res.json({ success: true, message: "Volunteer deleted successfully." });
      } else {
        return res.status(404).json({ error: "Volunteer not found." });
      }
    }
  } catch (err) {
    console.error("❌ Error deleting volunteer:", err.message);
    return res.status(500).json({ error: "Could not delete volunteer." });
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

// ── Route: GET /api/logs ──────────────────────────────────────
/**
 * Fetches paginated history logs from the archived_requests collection.
 * Supports cursor pagination via lastArchivedAt, and filtering.
 */
app.get("/api/logs", async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const lastArchivedAt = req.query.lastArchivedAt || null;
  const filter = req.query.filter || "all";

  try {
    let query = db.collection("archived_requests").orderBy("archivedAt", "desc");
    
    let snapshot;
    if (lastArchivedAt) {
      snapshot = await query.startAfter(lastArchivedAt).limit(200).get();
    } else {
      snapshot = await query.limit(200).get();
    }

    let logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    // Apply filtering in memory
    if (filter === "resolved") {
      logs = logs.filter(l => l.status === "Resolved" && !l.deleted);
    } else if (filter === "resolved_deleted") {
      logs = logs.filter(l => l.status === "Resolved" && l.deleted);
    } else if (filter === "inprogress_deleted") {
      logs = logs.filter(l => l.status === "In Progress" && l.deleted);
    } else if (filter === "open_deleted") {
      logs = logs.filter(l => l.status === "Open" && l.deleted);
    }

    const paginatedLogs = logs.slice(0, limit);
    const nextCursor = paginatedLogs.length > 0 ? paginatedLogs[paginatedLogs.length - 1].archivedAt : null;
    const hasMore = logs.length > limit;

    return res.json({
      success: true,
      logs: paginatedLogs,
      nextCursor,
      hasMore
    });
  } catch (err) {
    console.error("❌ Error fetching logs:", err.message);
    return res.status(500).json({ error: "Could not fetch history logs." });
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

      // 4. Archive management
      const archiveRef = db.collection("archived_requests").doc(id);
      if (status === "Resolved") {
        transaction.set(archiveRef, {
          originalId: id,
          description: currentData.description || "",
          zone: currentData.zone || "",
          address: currentData.address || "",
          victimPhone: currentData.victimPhone || "",
          category: category,
          urgency: currentData.urgency || 3,
          status: "Resolved",
          detectedLanguage: currentData.detectedLanguage || "English",
          translatedDescription: currentData.translatedDescription || "",
          matchedVolunteer: currentData.matchedVolunteer || null,
          clusteredReports: currentData.clusteredReports || [],
          timeline: updatedTimeline,
          createdAt: currentData.createdAt || null,
          archivedAt: timestamp,
          deleted: false
        }, { merge: true });
      } else if (oldStatus === "Resolved" && status !== "Resolved") {
        // If moved away from Resolved, delete from active resolved archives
        transaction.delete(archiveRef);
      }
    });

    // ── On-chain Trust Layer Dispatch (Supply Transfer NGO -> Volunteer) ──
    if (status === "In Progress" && oldStatus !== "In Progress") {
      try {
        const volId = currentData.matchedVolunteer ? currentData.matchedVolunteer.id : null;
        if (volId) {
          const bcSupplyResult = await blockchain.transferSupply("NGO_ADMIN", volId, category, 1);
          console.log(`⛓️ Blockchain Supply Dispatched: Request ${id} to Volunteer ${volId} -> Tx ${bcSupplyResult.txHash}`);
          
          const blockchainData = {
            blockchainDispatchTx: bcSupplyResult.txHash,
            blockchainDispatchBlock: bcSupplyResult.blockNumber
          };
          await db.collection("requests").doc(id).update(blockchainData);
        }
      } catch (bcErr) {
        console.error("⚠️ Blockchain supply dispatch failed:", bcErr.message);
      }
    }

    // ── On-chain Trust Layer Resolution Log ─────────────────────
    if (status === "Resolved" && oldStatus !== "Resolved") {
      try {
        const volId = currentData.matchedVolunteer ? currentData.matchedVolunteer.id : "v_unknown";
        const volName = currentData.matchedVolunteer ? currentData.matchedVolunteer.name : "NGO Volunteer";
        
        // Calculate estimated hours worked: In Progress -> Resolved duration
        let hoursWorked = 2; // Default fallback
        const inProgressEvent = (currentData.timeline || []).find(e => e.status === "In Progress");
        if (inProgressEvent && inProgressEvent.timestamp) {
          const durationMs = new Date(timestamp).getTime() - new Date(inProgressEvent.timestamp).getTime();
          hoursWorked = Math.max(1, Math.round(durationMs / 3600000)); // Round to nearest hour, minimum 1 hour
        }

        const bcResult = await blockchain.recordResolution(
          id,
          volId,
          volName,
          category,
          hoursWorked
        );
        
        console.log(`⛓️ Blockchain Resolution Logged: Request ${id} -> Tx ${bcResult.txHash}`);
        
        // Save transaction coordinates to database
        const blockchainData = {
          blockchainResolutionTx: bcResult.txHash,
          blockchainResolutionBlock: bcResult.blockNumber,
          hoursWorked: hoursWorked
        };
        
        await db.collection("requests").doc(id).update(blockchainData);
        await db.collection("archived_requests").doc(id).update(blockchainData);
      } catch (bcErr) {
        console.error("⚠️ Blockchain resolution recording failed:", bcErr.message);
      }
    }

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
      const currentData = doc.data();
      const timestamp = new Date().toISOString();
      const updatedTimeline = [...(currentData.timeline || []), {
        status: "Resolved",
        timestamp,
        note: "Request archived and deleted via bulk action."
      }];

      const archiveRef = db.collection("archived_requests").doc(doc.id);
      batch.set(archiveRef, {
        originalId: doc.id,
        description: currentData.description || "",
        zone: currentData.zone || "",
        address: currentData.address || "",
        victimPhone: currentData.victimPhone || "",
        category: currentData.category || "Other",
        urgency: currentData.urgency || 3,
        status: "Resolved",
        detectedLanguage: currentData.detectedLanguage || "English",
        translatedDescription: currentData.translatedDescription || "",
        matchedVolunteer: currentData.matchedVolunteer || null,
        clusteredReports: currentData.clusteredReports || [],
        timeline: updatedTimeline,
        createdAt: currentData.createdAt || null,
        archivedAt: timestamp,
        deleted: true
      }, { merge: true });

      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`🗑️ Bulk deleted and archived ${snapshot.size} resolved requests.`);
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
    const docRef = db.collection("requests").doc(id);
    const archiveRef = db.collection("archived_requests").doc(id);
    
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (doc.exists) {
        const currentData = doc.data();
        const timestamp = new Date().toISOString();
        const updatedTimeline = [...(currentData.timeline || []), {
          status: currentData.status,
          timestamp,
          note: `Request deleted (Status at deletion: ${currentData.status}).`
        }];
        
        transaction.set(archiveRef, {
          originalId: id,
          description: currentData.description || "",
          zone: currentData.zone || "",
          address: currentData.address || "",
          victimPhone: currentData.victimPhone || "",
          category: currentData.category || "Other",
          urgency: currentData.urgency || 3,
          status: currentData.status || "Open",
          detectedLanguage: currentData.detectedLanguage || "English",
          translatedDescription: currentData.translatedDescription || "",
          matchedVolunteer: currentData.matchedVolunteer || null,
          clusteredReports: currentData.clusteredReports || [],
          timeline: updatedTimeline,
          createdAt: currentData.createdAt || null,
          archivedAt: timestamp,
          deleted: true
        }, { merge: true });
        
        transaction.delete(docRef);
      }
    });

    console.log(`🗑️ Request archived and deleted: ${id}`);
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

// ── Route: GET /api/requests/by-phone/:phone ──────────────────
/**
 * Retrieves all requests (active and archived) matching a contact number.
 * Ordered chronologically by creation timestamp.
 */
app.get("/api/requests/by-phone/:phone", async (req, res) => {
  const { phone } = req.params;
  try {
    const snapshot = await db.collection("requests").where("victimPhone", "==", phone).get();
    const archivedSnapshot = await db.collection("archived_requests").where("victimPhone", "==", phone).get();
    
    const requests = [];
    snapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    archivedSnapshot.forEach(doc => {
      if (!requests.some(r => r.id === doc.id)) {
        requests.push({ id: doc.id, ...doc.data() });
      }
    });

    requests.sort((a, b) => {
      const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().toISOString() : a.createdAt) : "";
      const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toISOString() : b.createdAt) : "";
      return new Date(timeA) - new Date(timeB);
    });

    return res.json({ success: true, requests });
  } catch (err) {
    console.error("❌ Error fetching requests by phone:", err.message);
    return res.status(500).json({ error: "Could not fetch history." });
  }
});

// ── Route: DELETE /api/requests/by-phone/:phone ────────────────
/**
 * Deletes all active and archived requests matching a contact number.
 * Used by the SMS Simulator to clear chat history permanently.
 */
app.delete("/api/requests/by-phone/:phone", async (req, res) => {
  const { phone } = req.params;
  if (!db) {
    return res.status(500).json({ error: "Database not connected" });
  }
  try {
    const snapshot = await db.collection("requests").where("victimPhone", "==", phone).get();
    const archivedSnapshot = await db.collection("archived_requests").where("victimPhone", "==", phone).get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    archivedSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🗑️ Permanently cleared all requests for phone: ${phone}`);
    return res.json({ success: true, message: `Successfully cleared history for ${phone}` });
  } catch (err) {
    console.error("❌ Error deleting requests by phone:", err.message);
    return res.status(500).json({ error: "Could not clear history." });
  }
});

// ── Route: POST /api/requests/:id/rate ────────────────────────
/**
 * Rates the volunteer assigned to a request.
 * Saves the rating/feedback and recalculates the volunteer's average rating.
 */
app.post("/api/requests/:id/rate", async (req, res) => {
  const { id } = req.params;
  const { rating, feedback, confirmSupplies } = req.body;

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Rating must be a number between 1 and 5." });
  }

  try {
    let requestDoc = await db.collection("requests").doc(id).get();
    let isArchived = false;

    if (!requestDoc.exists) {
      requestDoc = await db.collection("archived_requests").doc(id).get();
      isArchived = true;
    }

    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Request not found." });
    }

    const requestData = requestDoc.data();
    const volunteer = requestData.matchedVolunteer;

    if (!volunteer || !volunteer.id) {
      return res.status(400).json({ error: "No volunteer was matched to this request. Cannot submit a rating." });
    }

    const timestamp = new Date().toISOString();
    const updatedTimeline = [
      ...(requestData.timeline || []),
      {
        status: requestData.status,
        timestamp,
        note: `Victim rated volunteer ${rating}/5. Feedback: "${feedback || 'None'}"`
      }
    ];

    const ratingUpdate = {
      rating: numRating,
      feedback: feedback || "",
      timeline: updatedTimeline
    };

    if (isArchived) {
      await db.collection("archived_requests").doc(id).update(ratingUpdate);
    } else {
      await db.collection("requests").doc(id).update(ratingUpdate);
      const archiveRef = db.collection("archived_requests").doc(id);
      const archiveDoc = await archiveRef.get();
      if (archiveDoc.exists) {
        await archiveRef.update(ratingUpdate);
      }
    }

    // Update volunteer average rating
    const volId = volunteer.id;
    const volRef = db.collection("volunteers").doc(volId);
    const volDoc = await volRef.get();

    if (volDoc.exists) {
      const volData = volDoc.data();
      const ratings = volData.ratings || [];
      ratings.push(numRating);
      const ratingCount = ratings.length;
      const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratingCount;

      await volRef.update({
        ratings,
        ratingCount,
        averageRating
      });
      console.log(`⭐ Updated volunteer ${volId} rating to ${averageRating} (${ratingCount} reviews)`);
    }

    // ── On-chain Trust Layer Soulbound Token (SBT) Minting ───────
    let sbtResult = null;
    try {
      const requestDocUpdated = await db.collection("requests").doc(id).get();
      const updatedRequestData = requestDocUpdated.exists ? requestDocUpdated.data() : requestData;
      const hoursWorked = updatedRequestData.hoursWorked || 2;
      
      console.log(`[BACKEND] Minting SBT for Volunteer ${volunteer.name} (Request ID: ${id})`);
      sbtResult = await blockchain.mintVolunteerSBT(
        id,
        volId,
        volunteer.name,
        updatedRequestData.category || "Other",
        numRating,
        feedback || "Service completed successfully.",
        hoursWorked
      );
      
      console.log(`⛓️ On-chain SBT Minted: Token ID ${sbtResult.tokenId} -> Tx ${sbtResult.txHash}`);
      
      const sbtUpdate = {
        blockchainSbtId: sbtResult.tokenId,
        blockchainSbtTx: sbtResult.txHash,
        blockchainSbtBlock: sbtResult.blockNumber
      };
      
      if (isArchived) {
        await db.collection("archived_requests").doc(id).update(sbtUpdate);
      } else {
        await db.collection("requests").doc(id).update(sbtUpdate);
        const archiveRef = db.collection("archived_requests").doc(id);
        const archiveDoc = await archiveRef.get();
        if (archiveDoc.exists) {
          await archiveRef.update(sbtUpdate);
        }
      }
    } catch (bcErr) {
      console.error("⚠️ Blockchain SBT minting failed:", bcErr.message);
    }

    // ── On-chain Trust Layer Supply Delivery (Volunteer -> Victim) ─────
    let supplyTxResult = null;
    if (confirmSupplies) {
      try {
        const category = requestData.category || "Other";
        const victimWallet = requestData.victimPhone || "v_unknown";
        console.log(`[BACKEND] Delivering supply ERC-1155 token from volunteer ${volId} to victim ${victimWallet}`);
        supplyTxResult = await blockchain.transferSupply(
          volId,
          victimWallet,
          category,
          1
        );
        console.log(`⛓️ On-chain Supply Transferred: Tx ${supplyTxResult.txHash}`);
        
        const supplyUpdate = {
          blockchainSupplyTx: supplyTxResult.txHash,
          blockchainSupplyBlock: supplyTxResult.blockNumber,
          confirmSupplies: true
        };
        
        if (isArchived) {
          await db.collection("archived_requests").doc(id).update(supplyUpdate);
        } else {
          await db.collection("requests").doc(id).update(supplyUpdate);
          const archiveRef = db.collection("archived_requests").doc(id);
          const archiveDoc = await archiveRef.get();
          if (archiveDoc.exists) {
            await archiveRef.update(supplyUpdate);
          }
        }
      } catch (bcErr) {
        console.error("⚠️ Blockchain supply delivery tracking failed:", bcErr.message);
      }
    }

    return res.json({ 
      success: true, 
      message: "Rating submitted successfully.",
      tokenId: sbtResult ? sbtResult.tokenId : null,
      txHash: sbtResult ? sbtResult.txHash : null,
      blockNumber: sbtResult ? sbtResult.blockNumber : null,
      supplyTxHash: supplyTxResult ? supplyTxResult.txHash : null,
      supplyBlockNumber: supplyTxResult ? supplyTxResult.blockNumber : null
    });
  } catch (err) {
    console.error("❌ Error rating request:", err.message);
    return res.status(500).json({ error: "Could not submit rating." });
  }
});

// ── Route: GET /api/blockchain/explorer/stats ─────────────────
app.get("/api/blockchain/explorer/stats", async (req, res) => {
  try {
    const stats = await blockchain.getStats();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Route: GET /api/blockchain/explorer/blocks ────────────────
app.get("/api/blockchain/explorer/blocks", async (req, res) => {
  try {
    const blocks = await blockchain.getBlocks();
    return res.json({ success: true, blocks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Route: GET /api/blockchain/explorer/transactions ──────────
app.get("/api/blockchain/explorer/transactions", async (req, res) => {
  try {
    const transactions = await blockchain.getTransactions();
    return res.json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Route: GET /api/blockchain/balances ───────────────────────
app.get("/api/blockchain/balances", async (req, res) => {
  try {
    const balances = await blockchain.getAllBalances();
    return res.json({ success: true, balances });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Route: GET /api/blockchain/explorer/sbts ──────────────────
app.get("/api/blockchain/explorer/sbts", async (req, res) => {
  try {
    const sbts = await blockchain.getSBTs();
    return res.json({ success: true, sbts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Export for Vercel Serverless ──────────────────────────────
// Vercel needs this export to treat server.js as a serverless function. 
module.exports = app;
