import crypto from "crypto";
import { GameLedgerEntry } from "./types.js";

class GameLedger {
  private entries: GameLedgerEntry[] = [];
  private processedActionKeys: Set<string> = new Set();
  private userBalances: Map<string, number> = new Map();

  constructor() {
    // Seed sample initial protocol game reserve transactions
    this.recordInitialSeed();
  }

  private recordInitialSeed() {
    const seedTx: GameLedgerEntry = {
      id: "GLEDGER-INIT-001",
      game: "crash",
      roundId: "#CR-15220",
      userId: "sys-reserve",
      userName: "MSDQ Protocol Vault",
      type: "GAME_ADJUSTMENT",
      amount: 1000000,
      status: "completed",
      timestamp: Date.now() - 3600000,
      note: "Initial provably fair sandbox escrow allocation",
      auditHash: crypto.createHash("sha256").update("genesis-game-ledger-seed").digest("hex"),
    };
    this.entries.push(seedTx);
  }

  public recordTransaction(
    game: "crash" | "ludo",
    roundId: string,
    userId: string,
    userName: string,
    type: "GAME_ENTRY" | "GAME_REWARD" | "GAME_REFUND" | "GAME_ADJUSTMENT",
    amount: number,
    note: string,
    idempotencyKey?: string
  ): { success: boolean; entry?: GameLedgerEntry; error?: string } {
    if (idempotencyKey) {
      if (this.processedActionKeys.has(idempotencyKey)) {
        return { success: false, error: "Duplicate transaction rejected by Idempotency Guard." };
      }
      this.processedActionKeys.add(idempotencyKey);
    }

    const id = `GL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = Date.now();
    const auditHash = crypto
      .createHash("sha256")
      .update(`${id}:${game}:${roundId}:${userId}:${type}:${amount}:${timestamp}`)
      .digest("hex");

    const entry: GameLedgerEntry = {
      id,
      game,
      roundId,
      userId,
      userName,
      type,
      amount,
      status: "completed",
      timestamp,
      note,
      auditHash,
    };

    this.entries.unshift(entry);
    if (this.entries.length > 500) {
      this.entries = this.entries.slice(0, 500);
    }

    return { success: true, entry };
  }

  public getRecentEntries(limit = 50): GameLedgerEntry[] {
    return this.entries.slice(0, limit);
  }

  public getUserEntries(userId: string, limit = 20): GameLedgerEntry[] {
    return this.entries.filter((e) => e.userId === userId).slice(0, limit);
  }

  public getStats() {
    const totalVolume = this.entries.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    const totalWins = this.entries
      .filter((e) => e.type === "GAME_REWARD")
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalEntries = this.entries
      .filter((e) => e.type === "GAME_ENTRY")
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

    return {
      totalTransactions: this.entries.length,
      totalVolume,
      totalWins,
      totalEntries,
      houseNet: totalEntries - totalWins,
    };
  }
}

export const gameLedger = new GameLedger();
