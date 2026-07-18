// ============================================================
// blockchainService.js — L2 EVM Blockchain Integration
// ============================================================
// Handles real ethers.js calls if L2 RPC keys are in .env,
// otherwise runs a local persistent in-memory L2 EVM simulator.
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");

// Constant Admin Wallet for NGO Owner
const NGO_ADMIN_WALLET = "0x4fe63000000000000000000000000000000091ad";

// Contract ABI reflecting RescueTrust.sol
const CONTRACT_ABI = [
  "function recordRescueResolution(string calldata _requestId, address _volunteer, string calldata _volunteerName, string calldata _category, uint256 _hoursWorked) external",
  "function mintSBT(address _volunteer, string calldata _volunteerName, string calldata _category, uint8 _rating, uint256 _hoursWorked, string calldata _feedback, string calldata _requestId) external returns (uint256)",
  "function getVolunteerTokenCount(address _volunteer) external view returns (uint256)",
  "function getVolunteerTokens(address _volunteer) external view returns (uint256[] memory)",
  "function getRescueRecord(string calldata _requestId) external view returns (tuple(string requestId, address volunteer, string volunteerName, string category, uint8 rating, uint256 hoursWorked, string feedback, uint256 timestamp))",
  "event RescueResolved(string indexed requestId, address indexed volunteer, string volunteerName, uint256 hoursWorked, uint256 timestamp)",
  "event SBTMinted(uint256 indexed tokenId, address indexed volunteer, string volunteerName, uint8 rating, uint256 hoursWorked, string indexed requestId, uint256 timestamp)",
  "function mintSupply(uint256 _tokenId, uint256 _amount) external",
  "function transferSupply(address _from, address _to, uint256 _tokenId, uint256 _amount) external",
  "function balanceOf(address _account, uint256 _tokenId) external view returns (uint256)",
  "event SupplyMinted(address indexed to, uint256 indexed tokenId, uint256 amount, uint256 timestamp)",
  "event SupplyTransferred(address indexed from, address indexed to, uint256 indexed tokenId, uint256 amount, uint256 timestamp)"
];

// Configuration check
const isRealBlockchain = !!(process.env.BLOCKCHAIN_PROVIDER_URL && process.env.BLOCKCHAIN_PRIVATE_KEY && process.env.BLOCKCHAIN_CONTRACT_ADDRESS);

// ── Deterministic EVM Address Generator for Volunteers ────────
function getDeterministicWalletAddress(id) {
  if (id.startsWith("0x") && id.length === 42) {
    return id; // Already a valid wallet address
  }
  // Generate a deterministic hash based on the ID string
  const hash = crypto.createHash("sha256").update(id).digest("hex");
  return "0x" + hash.substring(0, 40).toLowerCase();
}

// Helper to convert supply category name to ID
function categoryToTokenId(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("food")) return 1;
  if (cat.includes("med")) return 2;
  if (cat.includes("shelter")) return 3;
  return 4; // Other
}

// ── Persistent Simulated L2 Ledger File ───────────────────────
const LEDGER_PATH = path.join(__dirname, ".local_blockchain.json");

function loadSimulatedLedger() {
  try {
    if (fs.existsSync(LEDGER_PATH)) {
      const data = fs.readFileSync(LEDGER_PATH, "utf8");
      const ledger = JSON.parse(data);
      if (!ledger.balances) {
        ledger.balances = {
          [NGO_ADMIN_WALLET]: { "1": 50, "2": 30, "3": 20, "4": 100 }
        };
      }
      return ledger;
    }
  } catch (err) {
    console.error("⚠️ Error reading simulated ledger:", err.message);
  }
  
  // Return default ledger if none exists
  const genesisHash = "0x" + crypto.createHash("sha256").update("SmartResourceAllocationGenesis").digest("hex");
  const genesisBlock = {
    number: 0,
    hash: genesisHash,
    parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    transactions: [],
    timestamp: new Date("2026-06-26T00:00:00Z").getTime(),
    miner: "0x0000000000000000000000000000000000000000",
    gasUsed: 0
  };

  return {
    blocks: [genesisBlock],
    transactions: [],
    sbts: [],
    rescueRecords: {},
    nextTokenId: 1,
    balances: {
      [NGO_ADMIN_WALLET]: { "1": 50, "2": 30, "3": 20, "4": 100 }
    }
  };
}

function saveSimulatedLedger(ledger) {
  try {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf8");
  } catch (err) {
    console.error("⚠️ Error saving simulated ledger:", err.message);
  }
}

// ── EVM Client Setup ──────────────────────────────────────────
let provider, wallet, contract;

if (isRealBlockchain) {
  try {
    provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_PROVIDER_URL);
    wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
    contract = new ethers.Contract(process.env.BLOCKCHAIN_CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    console.log(`⛓️ Connected to real EVM L2 RPC: ${process.env.BLOCKCHAIN_PROVIDER_URL}`);
    console.log(`📜 Smart Contract loaded: ${process.env.BLOCKCHAIN_CONTRACT_ADDRESS}`);
  } catch (err) {
    console.error("❌ Failed to initialize real EVM client:", err.message);
  }
} else {
  console.log("🛠️ Blockchain Service running in SIMULATED L2 TRUST MODE. Ledger saved in .local_blockchain.json");
}

// ── Exported Blockchain Service Functions ─────────────────────

/**
 * Record a rescue resolution on-chain
 */
async function recordResolution(requestId, volunteerId, volunteerName, category, hoursWorked) {
  const volunteerWallet = getDeterministicWalletAddress(volunteerId);
  const qtyHours = Number(hoursWorked) || 2;

  if (isRealBlockchain && contract) {
    try {
      console.log(`[REAL L2] Sending recordRescueResolution tx for Request: ${requestId}`);
      const tx = await contract.recordRescueResolution(
        requestId,
        volunteerWallet,
        volunteerName,
        category,
        qtyHours
      );
      console.log(`[REAL L2] Transaction sent: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`[REAL L2] Transaction confirmed in block: ${receipt.blockNumber}`);
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        isSimulated: false
      };
    } catch (err) {
      console.error("❌ Real L2 Contract execution failed, falling back to simulator:", err.message);
    }
  }

  // Simulator Fallback
  const ledger = loadSimulatedLedger();
  
  // Skip duplicate record logs in simulation
  if (ledger.rescueRecords[requestId]) {
    return {
      success: true,
      txHash: ledger.rescueRecords[requestId].txHash,
      blockNumber: ledger.rescueRecords[requestId].blockNumber,
      isSimulated: true
    };
  }

  const txHash = "0x" + crypto.createHash("sha256").update(requestId + "resolution" + Date.now()).digest("hex");
  const blockNumber = ledger.blocks.length;
  const timestamp = Date.now();

  const tx = {
    hash: txHash,
    method: "recordRescueResolution",
    from: NGO_ADMIN_WALLET,
    to: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "0x7a43f891F891F891F891F891F891F891F891F891",
    blockNumber,
    timestamp,
    gasUsed: 47291,
    payload: {
      requestId,
      volunteerAddress: volunteerWallet,
      volunteerName,
      category,
      hoursWorked: qtyHours
    }
  };

  const parentBlock = ledger.blocks[ledger.blocks.length - 1];
  const blockHash = "0x" + crypto.createHash("sha256").update(parentBlock.hash + txHash + timestamp).digest("hex");

  const newBlock = {
    number: blockNumber,
    hash: blockHash,
    parentHash: parentBlock.hash,
    transactions: [tx],
    timestamp,
    miner: "0x891FaBce29E1A29D4fA589eA3f789C1aB19CDe10",
    gasUsed: 47291
  };

  ledger.rescueRecords[requestId] = {
    requestId,
    volunteerAddress: volunteerWallet,
    volunteerName,
    category,
    rating: 0,
    hoursWorked: qtyHours,
    feedback: "",
    timestamp,
    txHash,
    blockNumber
  };

  ledger.transactions.unshift(tx);
  ledger.blocks.push(newBlock);
  saveSimulatedLedger(ledger);

  console.log(`[SIM L2] Mined Block #${blockNumber} for recordRescueResolution (Tx: ${txHash.substring(0, 10)}...)`);

  return {
    success: true,
    txHash,
    blockNumber,
    isSimulated: true
  };
}

/**
 * Mint a Soulbound Token (SBT) representing volunteer hours and rating
 */
async function mintVolunteerSBT(requestId, volunteerId, volunteerName, category, rating, feedback, hoursWorked) {
  const volunteerWallet = getDeterministicWalletAddress(volunteerId);
  const qtyHours = Number(hoursWorked) || 2;
  const numRating = Number(rating) || 5;
  const safeFeedback = feedback || "Service completed successfully.";

  if (isRealBlockchain && contract) {
    try {
      console.log(`[REAL L2] Sending mintSBT tx for Volunteer: ${volunteerName} (${volunteerWallet})`);
      const tx = await contract.mintSBT(
        volunteerWallet,
        volunteerName,
        category,
        numRating,
        qtyHours,
        safeFeedback,
        requestId
      );
      console.log(`[REAL L2] Transaction sent: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait();
      
      // Parse Token ID from event logs
      let tokenId = 0;
      try {
        const sbtMintedEvent = receipt.logs
          .map(log => {
            try { return contract.interface.parseLog(log); } catch (e) { return null; }
          })
          .find(parsed => parsed && parsed.name === "SBTMinted");
        
        if (sbtMintedEvent) {
          tokenId = Number(sbtMintedEvent.args.tokenId);
        }
      } catch (e) {
        console.warn("Could not parse minted tokenId from receipt logs, using incremental mock.");
      }

      console.log(`[REAL L2] Transaction confirmed in block: ${receipt.blockNumber}, Token ID Minted: ${tokenId}`);
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        tokenId: tokenId || Date.now() % 1000,
        isSimulated: false
      };
    } catch (err) {
      console.error("❌ Real L2 Contract execution failed, falling back to simulator:", err.message);
    }
  }

  // Simulator Fallback
  const ledger = loadSimulatedLedger();
  
  // Skip duplicate SBT mints for this request
  const existingSbt = ledger.sbts.find(s => s.requestId === requestId);
  if (existingSbt) {
    return {
      success: true,
      txHash: existingSbt.txHash,
      blockNumber: existingSbt.blockNumber,
      tokenId: existingSbt.tokenId,
      isSimulated: true
    };
  }

  const tokenId = ledger.nextTokenId++;
  const txHash = "0x" + crypto.createHash("sha256").update(volunteerWallet + tokenId + Date.now()).digest("hex");
  const blockNumber = ledger.blocks.length;
  const timestamp = Date.now();

  const tx = {
    hash: txHash,
    method: "mintSBT",
    from: NGO_ADMIN_WALLET,
    to: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "0x7a43f891F891F891F891F891F891F891F891F891",
    blockNumber,
    timestamp,
    gasUsed: 89403,
    payload: {
      tokenId,
      volunteerAddress: volunteerWallet,
      volunteerName,
      category,
      rating: numRating,
      hoursWorked: qtyHours,
      feedback: safeFeedback,
      requestId
    }
  };

  const sbt = {
    tokenId,
    volunteerAddress: volunteerWallet,
    volunteerName,
    category,
    rating: numRating,
    hoursWorked: qtyHours,
    feedback: safeFeedback,
    timestamp,
    requestId,
    txHash,
    blockNumber
  };

  const parentBlock = ledger.blocks[ledger.blocks.length - 1];
  const blockHash = "0x" + crypto.createHash("sha256").update(parentBlock.hash + txHash + timestamp).digest("hex");

  const newBlock = {
    number: blockNumber,
    hash: blockHash,
    parentHash: parentBlock.hash,
    transactions: [tx],
    timestamp,
    miner: "0x891FaBce29E1A29D4fA589eA3f789C1aB19CDe10",
    gasUsed: 89403
  };

  // Update rescue records feedback
  if (ledger.rescueRecords[requestId]) {
    ledger.rescueRecords[requestId].rating = numRating;
    ledger.rescueRecords[requestId].feedback = safeFeedback;
  }

  ledger.sbts.push(sbt);
  ledger.transactions.unshift(tx);
  ledger.blocks.push(newBlock);
  saveSimulatedLedger(ledger);

  console.log(`[SIM L2] Mined Block #${blockNumber} for mintSBT. Soulbound Token #${tokenId} minted to ${volunteerName}`);

  return {
    success: true,
    txHash,
    blockNumber,
    tokenId,
    isSimulated: true
  };
}

/**
 * Mint supply packs on-chain (ERC-1155)
 */
async function mintSupply(category, amount) {
  const tokenId = categoryToTokenId(category);
  const qty = Number(amount) || 0;
  if (qty <= 0) return { success: false, error: "Zero amount" };

  if (isRealBlockchain && contract) {
    try {
      console.log(`[REAL L2] Sending mintSupply tx for Category: ${category} (ID: ${tokenId}) Amount: ${qty}`);
      const tx = await contract.mintSupply(tokenId, qty);
      console.log(`[REAL L2] Transaction sent: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`[REAL L2] Transaction confirmed in block: ${receipt.blockNumber}`);
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        isSimulated: false
      };
    } catch (err) {
      console.error("❌ Real L2 mintSupply failed, falling back to simulator:", err.message);
    }
  }

  // Simulator Fallback
  const ledger = loadSimulatedLedger();
  const txHash = "0x" + crypto.createHash("sha256").update(category + qty + "mint" + Date.now()).digest("hex");
  const blockNumber = ledger.blocks.length;
  const timestamp = Date.now();

  const tx = {
    hash: txHash,
    method: "mintSupply",
    from: NGO_ADMIN_WALLET,
    to: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "0x7a43f891F891F891F891F891F891F891F891F891",
    blockNumber,
    timestamp,
    gasUsed: 35210,
    payload: {
      tokenId,
      amount: qty,
      category,
      to: NGO_ADMIN_WALLET
    }
  };

  const parentBlock = ledger.blocks[ledger.blocks.length - 1];
  const blockHash = "0x" + crypto.createHash("sha256").update(parentBlock.hash + txHash + timestamp).digest("hex");

  const newBlock = {
    number: blockNumber,
    hash: blockHash,
    parentHash: parentBlock.hash,
    transactions: [tx],
    timestamp,
    miner: "0x891FaBce29E1A29D4fA589eA3f789C1aB19CDe10",
    gasUsed: 35210
  };

  // Update simulator balance
  if (!ledger.balances) ledger.balances = {};
  if (!ledger.balances[NGO_ADMIN_WALLET]) {
    ledger.balances[NGO_ADMIN_WALLET] = { "1": 0, "2": 0, "3": 0, "4": 0 };
  }
  ledger.balances[NGO_ADMIN_WALLET][tokenId] = (ledger.balances[NGO_ADMIN_WALLET][tokenId] || 0) + qty;

  ledger.transactions.unshift(tx);
  ledger.blocks.push(newBlock);
  saveSimulatedLedger(ledger);

  console.log(`[SIM L2] Mined Block #${blockNumber} for mintSupply (Tx: ${txHash.substring(0, 10)}...)`);

  return {
    success: true,
    txHash,
    blockNumber,
    isSimulated: true
  };
}

/**
 * Transfer supply packs on-chain (ERC-1155)
 */
async function transferSupply(fromIdOrAddress, toIdOrAddress, category, amount) {
  const tokenId = categoryToTokenId(category);
  const qty = Number(amount) || 0;
  if (qty <= 0) return { success: false, error: "Zero amount" };

  const fromAddress = fromIdOrAddress === "NGO_ADMIN" ? NGO_ADMIN_WALLET : getDeterministicWalletAddress(fromIdOrAddress);
  const toAddress = toIdOrAddress === "NGO_ADMIN" ? NGO_ADMIN_WALLET : getDeterministicWalletAddress(toIdOrAddress);

  if (isRealBlockchain && contract) {
    try {
      console.log(`[REAL L2] Sending transferSupply tx from ${fromAddress} to ${toAddress} ID: ${tokenId} Qty: ${qty}`);
      const tx = await contract.transferSupply(fromAddress, toAddress, tokenId, qty);
      console.log(`[REAL L2] Transaction sent: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`[REAL L2] Transaction confirmed in block: ${receipt.blockNumber}`);
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        isSimulated: false
      };
    } catch (err) {
      console.error("❌ Real L2 transferSupply failed, falling back to simulator:", err.message);
    }
  }

  // Simulator Fallback
  const ledger = loadSimulatedLedger();
  const txHash = "0x" + crypto.createHash("sha256").update(fromAddress + toAddress + category + qty + Date.now()).digest("hex");
  const blockNumber = ledger.blocks.length;
  const timestamp = Date.now();

  const tx = {
    hash: txHash,
    method: "transferSupply",
    from: NGO_ADMIN_WALLET, // Executed by Admin
    to: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "0x7a43f891F891F891F891F891F891F891F891F891",
    blockNumber,
    timestamp,
    gasUsed: 42103,
    payload: {
      from: fromAddress,
      to: toAddress,
      tokenId,
      amount: qty,
      category
    }
  };

  const parentBlock = ledger.blocks[ledger.blocks.length - 1];
  const blockHash = "0x" + crypto.createHash("sha256").update(parentBlock.hash + txHash + timestamp).digest("hex");

  const newBlock = {
    number: blockNumber,
    hash: blockHash,
    parentHash: parentBlock.hash,
    transactions: [tx],
    timestamp,
    miner: "0x891FaBce29E1A29D4fA589eA3f789C1aB19CDe10",
    gasUsed: 42103
  };

  // Update simulator balance
  if (!ledger.balances) ledger.balances = {};
  if (!ledger.balances[fromAddress]) {
    ledger.balances[fromAddress] = { "1": 0, "2": 0, "3": 0, "4": 0 };
  }
  if (!ledger.balances[toAddress]) {
    ledger.balances[toAddress] = { "1": 0, "2": 0, "3": 0, "4": 0 };
  }

  // Deduct
  const fromBalance = ledger.balances[fromAddress][tokenId] || 0;
  ledger.balances[fromAddress][tokenId] = Math.max(0, fromBalance - qty);
  // Add
  ledger.balances[toAddress][tokenId] = (ledger.balances[toAddress][tokenId] || 0) + qty;

  ledger.transactions.unshift(tx);
  ledger.blocks.push(newBlock);
  saveSimulatedLedger(ledger);

  console.log(`[SIM L2] Mined Block #${blockNumber} for transferSupply (Tx: ${txHash.substring(0, 10)}...)`);

  return {
    success: true,
    txHash,
    blockNumber,
    isSimulated: true
  };
}

/**
 * Get supply balance of an address (real EVM or simulated)
 */
async function getSupplyBalance(addressOrId, category) {
  const address = addressOrId === "NGO_ADMIN" ? NGO_ADMIN_WALLET : getDeterministicWalletAddress(addressOrId);
  const tokenId = categoryToTokenId(category);

  if (isRealBlockchain && contract) {
    try {
      const balance = await contract.balanceOf(address, tokenId);
      return Number(balance);
    } catch (e) {
      console.warn("Failed fetching live blockchain supply balance, falling back to simulated:", e.message);
    }
  }

  const ledger = loadSimulatedLedger();
  if (ledger.balances && ledger.balances[address]) {
    return ledger.balances[address][tokenId] || 0;
  }
  
  // Seed initial NGO balance if checking NGO balance and it doesn't exist
  if (address === NGO_ADMIN_WALLET) {
    return tokenId === 1 ? 50 : tokenId === 2 ? 30 : tokenId === 3 ? 20 : 100;
  }
  return 0;
}

/**
 * Return all balances for UI
 */
async function getAllBalances() {
  const ledger = loadSimulatedLedger();
  const result = {
    ngo: {
      address: NGO_ADMIN_WALLET,
      Food: await getSupplyBalance("NGO_ADMIN", "Food"),
      Medical: await getSupplyBalance("NGO_ADMIN", "Medical"),
      Shelter: await getSupplyBalance("NGO_ADMIN", "Shelter"),
      Other: await getSupplyBalance("NGO_ADMIN", "Other")
    },
    volunteers: {}
  };
  
  // We can also parse volunteer wallets in simulated balances
  if (ledger.balances) {
    for (const addr of Object.keys(ledger.balances)) {
      if (addr !== NGO_ADMIN_WALLET) {
        result.volunteers[addr] = {
          Food: ledger.balances[addr]["1"] || 0,
          Medical: ledger.balances[addr]["2"] || 0,
          Shelter: ledger.balances[addr]["3"] || 0,
          Other: ledger.balances[addr]["4"] || 0
        };
      }
    }
  }
  return result;
}

/**
 * Return current stats
 */
async function getStats() {
  if (isRealBlockchain && contract) {
    try {
      const blockNumber = await provider.getBlockNumber();
      const ledger = loadSimulatedLedger(); // fall back to simulated token counts or cache
      return {
        networkName: process.env.BLOCKCHAIN_NETWORK_NAME || "L2 Trust Network",
        chainId: (await provider.getNetwork()).chainId.toString(),
        contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
        blockHeight: blockNumber,
        totalSBTs: ledger.sbts.length, // Can also query on chain if indexed, simplified here
        isSimulated: false
      };
    } catch (e) {
      console.warn("Failed fetching live blockchain network stats, falling back to simulated:", e.message);
    }
  }

  const ledger = loadSimulatedLedger();
  return {
    networkName: "Arbitrum Sepolia (Simulated L2)",
    chainId: "421614",
    contractAddress: "0x7a43f891F891F891F891F891F891F891F891F891",
    blockHeight: ledger.blocks.length - 1,
    totalSBTs: ledger.sbts.length,
    isSimulated: true
  };
}

/**
 * Return blocks list
 */
async function getBlocks(limit = 10) {
  const ledger = loadSimulatedLedger();
  return ledger.blocks.slice(-limit).reverse();
}

/**
 * Return transactions list
 */
async function getTransactions(limit = 10) {
  const ledger = loadSimulatedLedger();
  return ledger.transactions.slice(0, limit);
}

/**
 * Return minted Soulbound Tokens list
 */
async function getSBTs() {
  const ledger = loadSimulatedLedger();
  return ledger.sbts;
}

/**
 * Return total amount of supplies deployed/transferred
 */
async function getTotalSuppliesDeployed() {
  const ledger = loadSimulatedLedger();
  const transferTxs = (ledger.transactions || []).filter(tx => tx.method === "transferSupply");
  return transferTxs.reduce((sum, tx) => sum + (tx.payload?.amount || 0), 0);
}

module.exports = {
  recordResolution,
  mintVolunteerSBT,
  mintSupply,
  transferSupply,
  getSupplyBalance,
  getAllBalances,
  getStats,
  getBlocks,
  getTransactions,
  getSBTs,
  getTotalSuppliesDeployed,
  getDeterministicWalletAddress,
  NGO_ADMIN_WALLET
};
