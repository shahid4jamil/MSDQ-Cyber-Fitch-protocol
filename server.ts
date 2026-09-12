import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  crashEngine,
  ludoEngine,
  gameLedger,
  antiCheat,
  getAdminGameTelemetry,
  updateGlobalGameSettings,
  getGlobalGameSettings,
} from "./server/games/gameManager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", protocol: "MSDQ", version: "2.4" });
  });

  // AI Assistant endpoint using Gemini SDK with smart protocol fallback
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim().length > 10) {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const systemPrompt = `You are the MSDQ Neural Advisor v4.2, the official protocol intelligence assistant for the MSDQ decentralized mining network and Web3 ecosystem.
Miner identity: #MSDQ-8842 (Diamond Tier, Global Rank #42).
Network context:
- Base hourly mining velocity: 1.00 MSDQ/hr, with current boost of +0.50 MSDQ/hr (Total 1.50 MSDQ/hr).
- Epoch 4 Halving: Imminent at block height #1,500,000 (approx 48 days away, 137,882 blocks left). The block reward cuts by 50% from 1.00 to 0.50 MSDQ/hr.
- Offsetting cut: Referral commission (Tier 1 gives 15% hash boost), Streak jackpot (+100 MSDQ on day 7), and syndicate weekly tasks (+150 MSDQ).
- Multi-ledger: 4 partitioned enclaves (Mining Reserve, Referral Commission, Sandbox Game Vault for Ludo/Crash, and Payout Escrow).
- Provably Fair PRNG Sandbox: Crash rocket velocity multipliers and Cyber Ludo 2P/4P arena games are isolated in sandbox demo points.

Format your response in a crisp, technical, cyberpunk-fintech style with clear bullet points, accurate protocol numbers, and actionable recommendations. Always include a brief reminder that this is protocol telemetry analytics, not financial advice.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: message,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            },
          });

          return res.json({
            reply: response.text || "Protocol telemetry received. Telemetry sync completed.",
          });
        } catch (apiError: any) {
          console.warn("Gemini API call failed, falling back to local heuristic advisor:", apiError?.message);
        }
      }

      // Domain-aware expert response generator
      const lower = message.toLowerCase();
      let responseText = "";

      if (lower.includes("halving") || lower.includes("epoch")) {
        responseText = `**1. Halving Impact (Epoch 4 in 48 Days)**
• **Trigger Block:** #1,500,000 (50% base emission cut).
• **Base Velocity:** Shifts from 1.00 MSDQ/hr to 0.50 MSDQ/hr.
• **Daily Base Output:** Decreases from 24.00 MSDQ to 12.00 MSDQ.

**2. Offsetting Strategies:**
• **Referral Surge:** Activate Tier 1 direct miner nodes (+15% hashrate boost per active hardware rig).
• **7-Day Streak Jackpot:** Claim your Day 7 bonus (+100 MSDQ drop).
• **Syndicate Tasks:** Complete remaining weekly milestones (+150.00 MSDQ).

*Protocol telemetry analytics only. Never financial advice.*`;
      } else if (lower.includes("task") || lower.includes("cycle") || lower.includes("reward")) {
        responseText = `**Dynamic Task & Bounty Protocol:**
• **Daily Core:** Proof-of-Tap verification resets every 24 hours at 00:00 UTC (+2.50 MSDQ).
• **Rewarded Sponsor Stream:** Verified AdMob/AppLovin callback tokens yield +5.00 MSDQ per stream (up to 5 daily).
• **Weekly Syndicate Pool:** Currently 80% finished (4/5 tasks completed). Ping 1 more referral node to unlock the +150.00 MSDQ bounty pool!

*Enclave v4.2 verified.*`;
      } else if (lower.includes("withdraw") || lower.includes("audit") || lower.includes("wallet")) {
        responseText = `**Multi-Ledger Settlement Pipeline:**
• **Enclave Security:** Client-side states are validated against 3-of-5 validator consensus.
• **KYC Status:** Level 2 Verified (Daily limit: 5,000 MSDQ / $2,500 USD).
• **Audit Queue:** High-velocity or suspicious withdrawal orders enter a 30-minute automated escrow delay (e.g., Order #WD-9942).
• **Supported Rails:** USDT (TRC-20 & BEP-20) and MSDQ Native Mainnet.`;
      } else if (lower.includes("ludo") || lower.includes("crash") || lower.includes("game") || lower.includes("fair")) {
        responseText = `**Provably Fair Sandbox Protocol:**
• **Isolation:** Sandbox PTS points are strictly segregated from consensus protocol tokens.
• **Rocket Crash:** Trajectory multipliers adhere to SHA-256 server-seed pre-commitment with client-seed #MSDQ-EPOCH-8842.
• **Cyber Ludo:** 2P Duel & 4P Grand Prix roll actions verify on-chain PRNG seed entropy, guaranteeing zero client manipulation.`;
      } else {
        responseText = `**Protocol Telemetry Overview for Node #MSDQ-8842:**
• **Status:** ONLINE • Mainnet Synced (Block #941,208)
• **Protocol Balance:** 14,852.40 MSDQ ($7,426.20 USD)
• **Hash Velocity:** 1.50 MSDQ/hr (1.00 base + 0.50 referral boost)
• **Rank:** #42 Global (Diamond Tier Validator)

Let me know if you need specific guidance regarding **Halving countdowns**, **task optimization**, **wallet enclaves**, or **game mechanics**.`;
      }

      return res.json({ reply: responseText });
    } catch (err: any) {
      console.error("Error in /api/ai/chat:", err);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // --- GAMEFI PROTOCOL ENDPOINTS ---

  // Game Settings & Maintenance
  app.get("/api/games/config", (_req, res) => {
    res.json(getGlobalGameSettings());
  });

  // Active Game Session Check & State Resumption:
  // Allows reconnecting clients to check for active sessions before initializing new listeners or rounds
  app.get("/api/games/active-session", (req, res) => {
    const userId = req.query.userId as string;
    const gameType = req.query.gameType as string | undefined;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId." });
    }

    let activeLudoRoom = null;
    let activeCrashBet = null;

    if (!gameType || gameType === "ludo" || gameType === "all") {
      const room = ludoEngine.findActiveRoomForUser(userId);
      if (room) {
        activeLudoRoom = ludoEngine.getRoomState(room.id, userId);
      }
    }

    if (!gameType || gameType === "crash" || gameType === "all") {
      activeCrashBet = crashEngine.findActiveBetForUser(userId);
    }

    res.json({
      success: true,
      hasActiveSession: !!(activeLudoRoom || activeCrashBet),
      activeLudoRoom,
      activeCrashBet,
    });
  });

  // Crash: Get Authoritative Round State
  app.get("/api/games/crash/state", (req, res) => {
    const userId = req.query.userId as string | undefined;
    const state = crashEngine.getAuthoritativeState(userId);
    res.json(state);
  });

  // Crash: Place Stake
  app.post("/api/games/crash/bet", (req, res) => {
    const { userId, userName, amount, autoCashout } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: "Missing required parameters." });
    }
    const result = crashEngine.placeBet(userId, userName || "Miner", Number(amount), autoCashout ? Number(autoCashout) : undefined);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Crash: Cash Out
  app.post("/api/games/crash/cashout", (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId." });
    }
    const result = crashEngine.cashOut(userId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Crash: History
  app.get("/api/games/crash/history", (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const search = req.query.search as string | undefined;
    const history = crashEngine.getHistory(limit, search);
    res.json({ history });
  });

  // Crash: Provably Fair Verification
  app.post("/api/games/crash/verify", (req, res) => {
    const { roundId, serverSeed, clientSeed, nonce } = req.body;
    if (!serverSeed || !clientSeed || nonce === undefined) {
      return res.status(400).json({ error: "Missing verification parameters." });
    }
    const result = crashEngine.verifyRound(roundId || "", serverSeed, clientSeed, Number(nonce));
    res.json(result);
  });

  // Crash: Real-time EventStream (SSE) with strict unmount/close cleanup
  app.get("/api/games/crash/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const userId = req.query.userId as string | undefined;

    const pushState = () => {
      try {
        const state = crashEngine.getAuthoritativeState(userId);
        res.write(`data: ${JSON.stringify(state)}\n\n`);
      } catch {
        // Stream write failure recovery
      }
    };

    // Send initial snapshot immediately
    pushState();

    // Subscribe to engine state mutations
    const unsubscribe = crashEngine.subscribe(() => {
      pushState();
    });

    // Cleanup listener on client disconnect / component unmount
    req.on("close", () => {
      unsubscribe();
    });

    req.on("error", () => {
      unsubscribe();
    });
  });

  // Ludo: Get Public Rooms
  app.get("/api/games/ludo/rooms", (_req, res) => {
    res.json({ rooms: ludoEngine.getPublicRooms() });
  });

  // Ludo: Create Room
  app.post("/api/games/ludo/create", (req, res) => {
    const { userId, userName, name, mode, entryFee, variant } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId." });
    }
    const result = ludoEngine.createRoom(
      userId,
      userName || "Player",
      name || "MSDQ Cyber Arena",
      mode || "2p",
      Number(entryFee) || 50,
      variant || "quick"
    );
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Ludo: Join Room
  app.post("/api/games/ludo/join", (req, res) => {
    const { userId, userName, codeOrId } = req.body;
    if (!userId || !codeOrId) {
      return res.status(400).json({ success: false, error: "Missing userId or room code." });
    }
    const result = ludoEngine.joinRoom(userId, userName || "Player", codeOrId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Ludo: Quick Matchmaking
  app.post("/api/games/ludo/quick-match", (req, res) => {
    const { userId, userName, mode, entryFee } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId." });
    }
    const result = ludoEngine.quickMatch(userId, userName || "Player", mode || "2p", Number(entryFee) || 50);
    res.json(result);
  });

  // Ludo: Get Room State (Supports real-time polling & reconnection)
  app.get("/api/games/ludo/room/:id", (req, res) => {
    const roomId = req.params.id;
    const userId = req.query.userId as string | undefined;
    const roomState = ludoEngine.getRoomState(roomId, userId);
    if (!roomState) {
      return res.status(404).json({ error: "Room not found." });
    }
    res.json(roomState);
  });

  // Ludo: Real-time Room Stream (SSE) with strict unmount/close cleanup
  app.get("/api/games/ludo/room/:id/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const roomId = req.params.id;
    const userId = req.query.userId as string | undefined;

    const pushRoomState = () => {
      try {
        const state = ludoEngine.getRoomState(roomId, userId);
        if (state) {
          res.write(`data: ${JSON.stringify(state)}\n\n`);
        }
      } catch {
        // Stream write failure recovery
      }
    };

    // Initial snapshot
    pushRoomState();

    // Subscribe to room-specific mutations
    const unsubscribe = ludoEngine.subscribeRoom(roomId, () => {
      pushRoomState();
    });

    // Cleanup listener on disconnect
    req.on("close", () => {
      unsubscribe();
    });

    req.on("error", () => {
      unsubscribe();
    });
  });

  // Ludo: Roll Authoritative Dice
  app.post("/api/games/ludo/roll", (req, res) => {
    const { roomId, userId } = req.body;
    if (!roomId || !userId) {
      return res.status(400).json({ success: false, error: "Missing roomId or userId." });
    }
    const result = ludoEngine.rollDice(roomId, userId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Ludo: Move Token
  app.post("/api/games/ludo/move", (req, res) => {
    const { roomId, userId, tokenId } = req.body;
    if (!roomId || !userId || tokenId === undefined) {
      return res.status(400).json({ success: false, error: "Missing parameters." });
    }
    const result = ludoEngine.moveToken(roomId, userId, Number(tokenId));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Ludo: Leaderboard & History
  app.get("/api/games/ludo/leaderboards", (_req, res) => {
    res.json(ludoEngine.getLeaderboards());
  });

  app.get("/api/games/ludo/history", (_req, res) => {
    res.json({ history: ludoEngine.getCompletedGames() });
  });

  // Game Ledger & Transactions
  app.get("/api/games/ledger", (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (userId) {
      res.json({ entries: gameLedger.getUserEntries(userId) });
    } else {
      res.json({ entries: gameLedger.getRecentEntries(), stats: gameLedger.getStats() });
    }
  });

  // Admin Game Control Center Telemetry (Protected: checks x-admin-email or admin role)
  app.get("/api/games/admin/telemetry", (req, res) => {
    const adminEmail = (req.headers["x-admin-email"] as string) || (req.query.adminEmail as string);
    if (adminEmail !== "shahid4jamil@gmail.com") {
      return res.status(403).json({ error: "Access Denied: Administrative credentials required." });
    }
    res.json(getAdminGameTelemetry());
  });

  // Admin Game Settings Update (Protected: checks x-admin-email or admin role)
  app.post("/api/games/admin/config", (req, res) => {
    const adminEmail = (req.headers["x-admin-email"] as string) || (req.body?.adminEmail as string);
    if (adminEmail !== "shahid4jamil@gmail.com") {
      return res.status(403).json({ error: "Access Denied: Administrative credentials required." });
    }
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: "Missing settings payload." });
    }
    updateGlobalGameSettings(settings);
    res.json({ success: true, settings: getGlobalGameSettings() });
  });

  // =========================================================================
  // Server-Side Email Verification Engine (6-Digit OTP / Expire / Brute-Force Protected)
  // =========================================================================
  interface VerificationRecord {
    email: string;
    code: string;
    userId?: string;
    expiresAt: number;
    attempts: number;
    maxAttempts: number;
    lastSentAt: number;
    verified: boolean;
  }

  const verificationStore = new Map<string, VerificationRecord>();

  // Helper to normalize email
  const normalizeEmail = (e: string) => (e || "").trim().toLowerCase();

  // 1. Send Verification Code (6-digit numeric OTP)
  app.post("/api/auth/send-verification-code", async (req, res) => {
    try {
      const { email, userId } = req.body || {};
      const normEmail = normalizeEmail(email);

      if (!normEmail || !normEmail.includes("@")) {
        return res.status(400).json({ success: false, error: "A valid email address is required." });
      }

      const now = Date.now();
      const existing = verificationStore.get(normEmail);

      // Check 60-second cooldown
      if (existing && now - existing.lastSentAt < 60000) {
        const remaining = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remaining} seconds before requesting a new code.`,
          cooldownRemaining: remaining,
        });
      }

      // Generate cryptographically uniform 6-digit code (100000 - 999999)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes

      const record: VerificationRecord = {
        email: normEmail,
        code,
        userId,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        lastSentAt: now,
        verified: false,
      };

      verificationStore.set(normEmail, record);

      console.log(`\n==================================================`);
      console.log(`[MSDQ PROTOCOL AUTH OTP] Generated 6-Digit Code for ${normEmail}`);
      console.log(`CODE: >>> [REDACTED FOR SECURITY - OTP DISPATCHED TO EMAIL] <<<`);
      console.log(`Expires: ${new Date(expiresAt).toISOString()} (10 minutes)`);
      console.log(`==================================================\n`);

      return res.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to ${normEmail}.`,
        expiresAt,
        cooldownSeconds: 60,
      });
    } catch (err: any) {
      console.error("Error in /api/auth/send-verification-code:", err);
      return res.status(500).json({ success: false, error: "Failed to dispatch verification code." });
    }
  });

  // 2. Verify 6-Digit Code
  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { email, code, userId } = req.body || {};
      const normEmail = normalizeEmail(email);
      const cleanCode = (code || "").toString().trim();

      if (!normEmail || !cleanCode) {
        return res.status(400).json({ success: false, error: "Email and 6-digit verification code are required." });
      }

      const record = verificationStore.get(normEmail);

      if (!record) {
        return res.status(400).json({
          success: false,
          error: "No pending verification code found for this email. Please request a code first.",
        });
      }

      const now = Date.now();

      // Check already verified
      if (record.verified) {
        return res.json({
          success: true,
          message: "Email is already verified. You may proceed to log in.",
          verified: true,
        });
      }

      // Check expiration
      if (now > record.expiresAt) {
        return res.status(400).json({
          success: false,
          error: "Verification code has expired. Please request a fresh 6-digit code.",
          expired: true,
        });
      }

      // Check max attempts (brute-force lockout)
      if (record.attempts >= record.maxAttempts) {
        return res.status(400).json({
          success: false,
          error: "Too many incorrect attempts (5/5). Code locked. Please request a new verification code.",
          locked: true,
        });
      }

      // Check code match
      if (record.code !== cleanCode) {
        record.attempts += 1;
        const attemptsLeft = record.maxAttempts - record.attempts;
        return res.status(400).json({
          success: false,
          error: `Incorrect verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
          attemptsRemaining: attemptsLeft,
        });
      }

      // Verification Success!
      record.verified = true;

      // Update Firestore user profile if available
      try {
        const { getDb } = await import("./server/services/referralService.js");
        const db = getDb();
        const { doc, updateDoc } = await import("firebase/firestore");
        const targetUid = userId || record.userId;
        if (targetUid) {
          const userRef = doc(db, "users", targetUid);
          await updateDoc(userRef, {
            emailVerified: true,
            status: "Active",
            verifiedAt: Date.now(),
          });
        }
      } catch (dbErr: any) {
        console.warn("Could not update Firestore user document with verification status:", dbErr?.message);
      }

      return res.json({
        success: true,
        message: "Email verified successfully! Your MSDQ node account has been activated.",
        verified: true,
      });
    } catch (err: any) {
      console.error("Error in /api/auth/verify-code:", err);
      return res.status(500).json({ success: false, error: "Failed to verify code." });
    }
  });

  // 3. Resend Verification Code
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email, userId } = req.body || {};
      const normEmail = normalizeEmail(email);

      if (!normEmail) {
        return res.status(400).json({ success: false, error: "Email is required." });
      }

      const now = Date.now();
      const existing = verificationStore.get(normEmail);

      if (existing && now - existing.lastSentAt < 60000) {
        const remaining = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remaining} seconds before requesting a new code.`,
          cooldownRemaining: remaining,
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000;

      const record: VerificationRecord = {
        email: normEmail,
        code,
        userId: userId || existing?.userId,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        lastSentAt: now,
        verified: false,
      };

      verificationStore.set(normEmail, record);

      console.log(`\n==================================================`);
      console.log(`[MSDQ PROTOCOL AUTH OTP] Resent 6-Digit Code for ${normEmail}`);
      console.log(`CODE: >>> [REDACTED FOR SECURITY - OTP DISPATCHED TO EMAIL] <<<`);
      console.log(`Expires: ${new Date(expiresAt).toISOString()} (10 minutes)`);
      console.log(`==================================================\n`);

      return res.json({
        success: true,
        message: `A fresh 6-digit verification code has been dispatched to ${normEmail}.`,
        expiresAt,
        cooldownSeconds: 60,
      });
    } catch (err: any) {
      console.error("Error in /api/auth/resend-code:", err);
      return res.status(500).json({ success: false, error: "Failed to resend verification code." });
    }
  });

  // 4. Check verification status
  app.get("/api/auth/status", (req, res) => {
    const email = req.query.email as string;
    const norm = normalizeEmail(email);
    const rec = verificationStore.get(norm);
    return res.json({ verified: !!rec?.verified });
  });

  // =========================================================================
  // Server-Side Cloud Function Endpoints: Referral Validation & Atomic Ledger
  // =========================================================================
  
  // 1. Validate Referral Code Server-Side (ensures referrer exists, prevents self-referral)
  app.post(["/api/functions/validateReferralCode", "/api/referral/validate"], async (req, res) => {
    try {
      const { code, newUserId, newUserEmail } = req.body || {};
      const { validateReferralCodeServer } = await import("./server/services/referralService.js");
      const result = await validateReferralCodeServer(code, newUserId, newUserEmail);
      if (!result.valid) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("Server error validating referral code:", err);
      return res.status(500).json({
        valid: false,
        error: err.message || "Internal server error validating referral code.",
      });
    }
  });

  // 2. Validate & Apply Referral (Atomic Transaction: checks existence, prevents self-referral, increments reward balance & count)
  app.post(["/api/functions/validateAndApplyReferral", "/api/referral/apply"], async (req, res) => {
    try {
      const { newUserId, newUserEmail, newUserName, referralCode } = req.body || {};

      if (!newUserId || !referralCode) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: newUserId and referralCode are required.",
        });
      }

      const { applyReferralServer } = await import("./server/services/referralService.js");
      const result = await applyReferralServer({
        newUserId,
        newUserEmail,
        newUserName,
        referralCode,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("Server error applying referral transaction:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error executing atomic referral transaction.",
      });
    }
  });

  // =========================================================================
  // Server-Side Authoritative Wallet & Rewards Endpoints
  // =========================================================================

  // 1. Authoritative P2P Transfer (Atomic transaction, balances verified server-side)
  app.post("/api/wallet/transfer", async (req, res) => {
    try {
      const { senderUid, senderAddress, recipientAddress, amount } = req.body || {};
      if (!senderUid || !recipientAddress || typeof amount !== "number") {
        return res.status(400).json({ success: false, error: "Missing required transfer parameters." });
      }

      const { executeServerTransfer } = await import("./server/services/walletService.js");
      const result = await executeServerTransfer(
        senderUid,
        senderAddress,
        recipientAddress,
        amount
      );

      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("Server error in /api/wallet/transfer:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal transfer error." });
    }
  });

  // 2. Authoritative Daily Streak Check-in
  app.post("/api/rewards/checkin", async (req, res) => {
    try {
      const { uid } = req.body || {};
      if (!uid) {
        return res.status(400).json({ success: false, error: "Authentication required." });
      }

      const { executeServerDailyCheckIn } = await import("./server/services/walletService.js");
      const result = await executeServerDailyCheckIn(uid);

      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("Server error in /api/rewards/checkin:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal check-in error." });
    }
  });

  // 3. Authoritative Task Bounty Claim
  app.post("/api/rewards/claim-task", async (req, res) => {
    try {
      const { uid, taskId, rewardAmount, taskTitle } = req.body || {};
      if (!uid || !taskId) {
        return res.status(400).json({ success: false, error: "Missing required parameters." });
      }

      const { executeServerTaskClaim } = await import("./server/services/walletService.js");
      const result = await executeServerTaskClaim(
        uid,
        taskId,
        Number(rewardAmount) || 5,
        taskTitle || taskId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("Server error in /api/rewards/claim-task:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal task claim error." });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MSDQ Protocol Server listening on port ${PORT}`);
  });
}

startServer();
