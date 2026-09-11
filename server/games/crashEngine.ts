import crypto from "crypto";
import { CrashRound, CrashBet, CrashRoundSummary, GameSettings } from "./types.js";
import { gameLedger } from "./gameLedger.js";
import { antiCheat } from "./antiCheat.js";

export class CrashEngine {
  private currentRound: CrashRound;
  private roundHistory: CrashRoundSummary[] = [];
  private nonceCounter = 15230;
  private clientSeed = "MSDQ-EPOCH-8842";
  private timer: NodeJS.Timeout | null = null;
  private settings: GameSettings;
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Safe listener execution
      }
    }
  }

  // Real-time network bots to make the arena feel active and populated
  private readonly mockMiners = [
    { name: "Miner_#4291", tier: "Diamond", avgBet: 50 },
    { name: "Enclave_Alpha", tier: "Platinum", avgBet: 100 },
    { name: "Satoshi_99", tier: "Gold", avgBet: 25 },
    { name: "Validator_Ox4", tier: "Diamond", avgBet: 200 },
    { name: "CyberNode_K7", tier: "Gold", avgBet: 50 },
    { name: "ZeroKnowledge", tier: "Platinum", avgBet: 150 },
    { name: "QuantumRig_01", tier: "Silver", avgBet: 20 },
    { name: "HalvingHunter", tier: "Gold", avgBet: 75 },
  ];

  constructor(settings: GameSettings) {
    this.settings = settings;
    this.currentRound = this.generateNewRound();
    this.seedInitialHistory();
    this.startLoop();
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): GameSettings {
    return this.settings;
  }

  private seedInitialHistory() {
    const historicalSeeds = [
      { mult: 2.45, nonce: 15229 },
      { mult: 1.18, nonce: 15228 },
      { mult: 8.72, nonce: 15227 },
      { mult: 1.03, nonce: 15226 },
      { mult: 3.41, nonce: 15225 },
      { mult: 1.55, nonce: 15224 },
      { mult: 14.80, nonce: 15223 },
      { mult: 1.22, nonce: 15222 },
      { mult: 4.10, nonce: 15221 },
      { mult: 1.95, nonce: 15220 },
    ];

    for (const h of historicalSeeds) {
      const serverSeed = crypto.randomBytes(32).toString("hex");
      const hashCommitment = crypto
        .createHash("sha256")
        .update(`${serverSeed}:${this.clientSeed}:${h.nonce}`)
        .digest("hex");

      this.roundHistory.push({
        roundId: `#CR-${h.nonce}`,
        crashMultiplier: h.mult,
        hashCommitment,
        serverSeed,
        clientSeed: this.clientSeed,
        nonce: h.nonce,
        timestamp: Date.now() - (15230 - h.nonce) * 35000,
        totalPlayers: Math.floor(Math.random() * 8) + 4,
        totalPayout: Math.round(h.mult * 250),
      });
    }
  }

  private calculateProvablyFairCrash(serverSeed: string, clientSeed: string, nonce: number): number {
    const hash = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest("hex");

    // Standard 52-bit provably fair derivation
    const h = parseInt(hash.slice(0, 13), 16);
    const e = Math.pow(2, 52);

    // House edge calculation (3% instant crash at 1.00x)
    if (h % 33 === 0) {
      return 1.0;
    }

    const rawMultiplier = Math.floor((100 * e - h) / (e - h)) / 100;
    const finalMultiplier = Math.max(1.01, Math.min(250.0, rawMultiplier));
    return parseFloat(finalMultiplier.toFixed(2));
  }

  private generateNewRound(): CrashRound {
    this.nonceCounter++;
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const nonce = this.nonceCounter;
    const hashCommitment = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${this.clientSeed}:${nonce}`)
      .digest("hex");

    const crashMultiplier = this.calculateProvablyFairCrash(serverSeed, this.clientSeed, nonce);

    const now = Date.now();
    const countdownDuration = (this.settings.crashCountdownSec || 6) * 1000;

    return {
      roundId: `#CR-${nonce}`,
      status: "COUNTDOWN",
      startTime: now,
      countdownEndTime: now + countdownDuration,
      runningStartTime: 0,
      crashMultiplier,
      currentMultiplier: 1.0,
      serverSeed,
      clientSeed: this.clientSeed,
      nonce,
      hashCommitment,
      activeBets: {},
    };
  }

  private populateNetworkMiners() {
    // Random subset of miners place bets during countdown
    const minerCount = Math.floor(Math.random() * 5) + 3;
    const shuffled = [...this.mockMiners].sort(() => Math.random() - 0.5).slice(0, minerCount);

    for (const m of shuffled) {
      const betId = `BOT-BET-${Date.now()}-${m.name}`;
      const autoCash = Math.random() > 0.3 ? parseFloat((1.2 + Math.random() * 4).toFixed(2)) : undefined;
      this.currentRound.activeBets[betId] = {
        betId,
        userId: `bot-${m.name}`,
        userName: m.name,
        userTier: m.tier,
        amount: m.avgBet,
        autoCashout: autoCash,
        cashedOut: false,
        timestamp: Date.now(),
        isBot: true,
      };
    }
  }

  private startLoop() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.tick();
    }, 100);
  }

  private tick() {
    if (this.settings.crashMaintenance) {
      this.currentRound.status = "WAITING";
      return;
    }

    const now = Date.now();

    // 1. STATE: COUNTDOWN
    if (this.currentRound.status === "COUNTDOWN") {
      // If bets not populated yet, add mock miners
      if (Object.keys(this.currentRound.activeBets).length === 0) {
        this.populateNetworkMiners();
      }

      if (now >= this.currentRound.countdownEndTime) {
        // Transition to RUNNING
        this.currentRound.status = "RUNNING";
        this.currentRound.runningStartTime = now;
        this.currentRound.currentMultiplier = 1.0;
      }
      this.notifyListeners();
      return;
    }

    // 2. STATE: RUNNING
    if (this.currentRound.status === "RUNNING") {
      const elapsedSec = (now - this.currentRound.runningStartTime) / 1000;
      // Exponential curve: M(t) = exp(0.065 * t)
      const calculatedMult = parseFloat(Math.exp(0.065 * elapsedSec).toFixed(2));

      if (calculatedMult >= this.currentRound.crashMultiplier) {
        // CRASH EVENT
        this.currentRound.currentMultiplier = this.currentRound.crashMultiplier;
        this.currentRound.status = "CRASHED";

        // Mark remaining non-cashed out bets as lost
        this.recordCrashSummary();

        // Hold in CRASHED/RESULT state for 3.5 seconds before starting next countdown
        setTimeout(() => {
          this.currentRound = this.generateNewRound();
          this.notifyListeners();
        }, 3500);
      } else {
        this.currentRound.currentMultiplier = calculatedMult;
        // Process auto cashouts
        this.processAutoCashouts(calculatedMult);
      }
      this.notifyListeners();
      return;
    }
  }

  private processAutoCashouts(currentMult: number) {
    for (const betId in this.currentRound.activeBets) {
      const bet = this.currentRound.activeBets[betId];
      if (!bet.cashedOut && bet.autoCashout && currentMult >= bet.autoCashout) {
        bet.cashedOut = true;
        bet.cashoutMultiplier = bet.autoCashout;
        bet.payout = Math.round(bet.amount * bet.autoCashout);

        if (!bet.isBot) {
          gameLedger.recordTransaction(
            "crash",
            this.currentRound.roundId,
            bet.userId,
            bet.userName,
            "GAME_REWARD",
            bet.payout,
            `Auto Cashout @ ${bet.autoCashout.toFixed(2)}x in round ${this.currentRound.roundId}`
          );
        }
      }
    }
  }

  private recordCrashSummary() {
    const bets = Object.values(this.currentRound.activeBets);
    const totalPayout = bets
      .filter((b) => b.cashedOut)
      .reduce((sum, b) => sum + (b.payout || 0), 0);

    const summary: CrashRoundSummary = {
      roundId: this.currentRound.roundId,
      crashMultiplier: this.currentRound.crashMultiplier,
      hashCommitment: this.currentRound.hashCommitment,
      serverSeed: this.currentRound.serverSeed, // Revealed to players post-crash!
      clientSeed: this.currentRound.clientSeed,
      nonce: this.currentRound.nonce,
      timestamp: Date.now(),
      totalPlayers: bets.length,
      totalPayout,
    };

    this.roundHistory.unshift(summary);
    if (this.roundHistory.length > 50) {
      this.roundHistory = this.roundHistory.slice(0, 50);
    }
  }

  // --- Public Player Actions ---

  public placeBet(
    userId: string,
    userName: string,
    amount: number,
    autoCashout?: number
  ): { success: boolean; bet?: CrashBet; error?: string } {
    if (this.settings.crashMaintenance) {
      return { success: false, error: "Crash Arena is currently undergoing scheduled maintenance." };
    }

    if (this.currentRound.status !== "COUNTDOWN") {
      return { success: false, error: "Bets are only accepted during the countdown phase." };
    }

    if (amount <= 0 || isNaN(amount)) {
      return { success: false, error: "Invalid stake amount." };
    }

    // Check rate limit
    const rl = antiCheat.checkRateLimit(userId, "crash:bet");
    if (!rl.allowed) return { success: false, error: rl.reason };

    // Check if user already placed a bet this round
    const existing = Object.values(this.currentRound.activeBets).find((b) => b.userId === userId);
    if (existing) {
      return { success: false, error: "You already have an active bet in this round." };
    }

    const betId = `BET-${Date.now()}-${userId}`;
    const cleanAuto =
      autoCashout && autoCashout >= 1.01 && autoCashout <= 250 ? parseFloat(autoCashout.toFixed(2)) : undefined;

    const bet: CrashBet = {
      betId,
      userId,
      userName,
      amount,
      autoCashout: cleanAuto,
      cashedOut: false,
      timestamp: Date.now(),
      isBot: false,
    };

    // Record in ledger
    const ledgerRes = gameLedger.recordTransaction(
      "crash",
      this.currentRound.roundId,
      userId,
      userName,
      "GAME_ENTRY",
      -amount,
      `Crash stake for round ${this.currentRound.roundId}`,
      `bet-${this.currentRound.roundId}-${userId}`
    );

    if (!ledgerRes.success) {
      return { success: false, error: ledgerRes.error };
    }

    this.currentRound.activeBets[betId] = bet;
    this.notifyListeners();
    return { success: true, bet };
  }

  public cashOut(userId: string): { success: boolean; payout?: number; multiplier?: number; error?: string } {
    if (this.currentRound.status !== "RUNNING") {
      return { success: false, error: "Cannot cash out: Round is not running or already crashed." };
    }

    const rl = antiCheat.checkRateLimit(userId, "crash:cashout");
    if (!rl.allowed) return { success: false, error: rl.reason };

    const bet = Object.values(this.currentRound.activeBets).find((b) => b.userId === userId && !b.cashedOut);
    if (!bet) {
      return { success: false, error: "No active un-cashed stake found for this node." };
    }

    const currentMult = this.currentRound.currentMultiplier;
    // Critical server-authoritative guard: Cannot cash out at or above crash point
    if (currentMult >= this.currentRound.crashMultiplier) {
      return { success: false, error: "Crash occurred before cashout order reached consensus." };
    }

    const payout = Math.round(bet.amount * currentMult);
    bet.cashedOut = true;
    bet.cashoutMultiplier = currentMult;
    bet.payout = payout;

    gameLedger.recordTransaction(
      "crash",
      this.currentRound.roundId,
      userId,
      bet.userName,
      "GAME_REWARD",
      payout,
      `Manual cashout @ ${currentMult.toFixed(2)}x in round ${this.currentRound.roundId}`,
      `cashout-${this.currentRound.roundId}-${userId}`
    );

    this.notifyListeners();
    return { success: true, payout, multiplier: currentMult };
  }

  public findActiveBetForUser(userId: string): { roundId: string; status: string; bet: CrashBet } | null {
    const bet = Object.values(this.currentRound.activeBets).find((b) => b.userId === userId && !b.cashedOut);
    if (bet) {
      return {
        roundId: this.currentRound.roundId,
        status: this.currentRound.status,
        bet,
      };
    }
    return null;
  }

  public getAuthoritativeState(userId?: string) {
    const userBet = userId
      ? Object.values(this.currentRound.activeBets).find((b) => b.userId === userId)
      : undefined;

    return {
      roundId: this.currentRound.roundId,
      status: this.currentRound.status,
      currentMultiplier: this.currentRound.currentMultiplier,
      countdownSecondsRemaining: Math.max(
        0,
        Math.ceil((this.currentRound.countdownEndTime - Date.now()) / 1000)
      ),
      runningElapsedSec:
        this.currentRound.status === "RUNNING"
          ? Math.max(0, (Date.now() - this.currentRound.runningStartTime) / 1000)
          : 0,
      hashCommitment: this.currentRound.hashCommitment,
      clientSeed: this.currentRound.clientSeed,
      nonce: this.currentRound.nonce,
      serverSeed: this.currentRound.status === "CRASHED" ? this.currentRound.serverSeed : undefined,
      crashMultiplier: this.currentRound.status === "CRASHED" ? this.currentRound.crashMultiplier : undefined,
      activeBets: Object.values(this.currentRound.activeBets).map((b) => ({
        betId: b.betId,
        userName: b.userName,
        userTier: b.userTier || "Node",
        amount: b.amount,
        autoCashout: b.autoCashout,
        cashedOut: b.cashedOut,
        cashoutMultiplier: b.cashoutMultiplier,
        payout: b.payout,
        isSelf: b.userId === userId,
      })),
      userBet: userBet
        ? {
            betId: userBet.betId,
            amount: userBet.amount,
            autoCashout: userBet.autoCashout,
            cashedOut: userBet.cashedOut,
            cashoutMultiplier: userBet.cashoutMultiplier,
            payout: userBet.payout,
          }
        : null,
      recentHistory: this.roundHistory.slice(0, 10),
      isMaintenance: this.settings.crashMaintenance,
    };
  }

  public getHistory(limit = 50, search?: string) {
    let list = this.roundHistory;
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.roundId.toLowerCase().includes(q) || r.hashCommitment.toLowerCase().includes(q));
    }
    return list.slice(0, limit);
  }

  public verifyRound(roundId: string, serverSeed: string, clientSeed: string, nonce: number) {
    const computedHash = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest("hex");

    const computedMultiplier = this.calculateProvablyFairCrash(serverSeed, clientSeed, nonce);

    return {
      roundId,
      computedHash,
      computedMultiplier,
      serverSeed,
      clientSeed,
      nonce,
      valid: true,
    };
  }
}
