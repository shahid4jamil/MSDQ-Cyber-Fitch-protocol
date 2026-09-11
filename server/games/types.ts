export type CrashRoundStatus = "WAITING" | "COUNTDOWN" | "RUNNING" | "CRASHED" | "RESULT";

export interface CrashBet {
  betId: string;
  userId: string;
  userName: string;
  userTier?: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
  timestamp: number;
  isBot?: boolean;
}

export interface CrashRoundSummary {
  roundId: string;
  crashMultiplier: number;
  hashCommitment: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  timestamp: number;
  totalPlayers: number;
  totalPayout: number;
}

export interface CrashRound {
  roundId: string;
  status: CrashRoundStatus;
  startTime: number;
  countdownEndTime: number;
  runningStartTime: number;
  crashMultiplier: number;
  currentMultiplier: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hashCommitment: string;
  activeBets: Record<string, CrashBet>;
}

export interface LudoToken {
  id: number; // 0, 1, 2, 3
  step: number; // -1: in yard, 0..50: track, 51..55: home path, 56: finished home
}

export interface LudoPlayer {
  id: string;
  name: string;
  color: "emerald" | "cyan" | "amber" | "ruby";
  colorIndex: 0 | 1 | 2 | 3;
  tokens: LudoToken[];
  isBot: boolean;
  isReady: boolean;
  timeouts: number;
  consecutiveSixes: number;
  score: number;
  connected: boolean;
  avatarSeed?: string;
}

export interface LudoMoveRecord {
  id: string;
  turn: number;
  playerId: string;
  playerName: string;
  playerColor: string;
  dice: number;
  tokenId: number;
  fromStep: number;
  toStep: number;
  capturedPlayerName?: string;
  timestamp: number;
  description: string;
}

export interface LudoRoom {
  id: string;
  code: string;
  name: string;
  mode: "2p" | "4p";
  variant: "classic" | "quick"; // classic: 4 tokens home, quick: 2 tokens home
  entryFee: number;
  status: "WAITING" | "READY" | "PLAYING" | "COMPLETED";
  maxPlayers: number;
  players: LudoPlayer[];
  currentTurnIndex: number;
  currentDice: number | null;
  validTokenMoves: number[]; // token IDs that can move with currentDice
  hasRolled: boolean;
  turnExpiresAt: number;
  turnDurationSec: number;
  winnerId?: string;
  winnerName?: string;
  moveHistory: LudoMoveRecord[];
  createdAt: number;
  lastActivity: number;
  createdBy: string;
  logs: string[];
}

export interface GameLedgerEntry {
  id: string;
  game: "crash" | "ludo";
  roundId: string;
  userId: string;
  userName: string;
  type: "GAME_ENTRY" | "GAME_REWARD" | "GAME_REFUND" | "GAME_ADJUSTMENT";
  amount: number;
  status: "completed" | "flagged";
  timestamp: number;
  note: string;
  auditHash: string;
}

export interface GameSettings {
  crashMaintenance: boolean;
  ludoMaintenance: boolean;
  crashCountdownSec: number;
  crashMinDurationSec: number;
  crashMaxDurationSec: number;
  crashHouseEdge: number;
  ludoTurnDurationSec: number;
  ludoMaxTimeouts: number;
  ludoDefaultStakes: number[];
  maxAutoCashout: number;
  antiCheatRateLimit: number;
}
