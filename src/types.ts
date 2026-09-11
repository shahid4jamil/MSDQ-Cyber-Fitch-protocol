export type ScreenType =
  | "home"
  | "dash"
  | "mining"
  | "games"
  | "wallet"
  | "tasks"
  | "rewards"
  | "referrals"
  | "notifications"
  | "profile"
  | "halving"
  | "ranks"
  | "ai"
  | "admin";

export type ThemeMode = "dark" | "light" | "system";

export interface Transaction {
  id: string;
  type: "mining" | "send" | "receive" | "referral" | "game_win" | "game_bet" | "conversion" | "escrow";
  amount: number;
  usdValue: number;
  timestamp: string;
  status: "confirmed" | "pending" | "processing";
  txHash: string;
  note: string;
  recipientAddress?: string;
  senderAddress?: string;
  ptsAmount?: number;
  conversionRate?: number;
}

export interface ConversionRecord {
  id: string;
  date: string;
  ptsUsed: number;
  msdqReceived: number;
  rate: number; // e.g. 100 PTS = 1 MSDQ -> rate is 100
  txId: string;
  status: "completed" | "pending" | "failed";
}

export interface GameConfig {
  id: string;
  name: string;
  icon: string;
  category: "arcade" | "table" | "dice" | "prediction";
  minBet: number;
  maxBet: number;
  defaultBet: number;
  multiplier: string;
  enabled: boolean;
  description: string;
  rules: string[];
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  category?: "Protocol" | "Mining" | "Halving" | "Games" | "Rewards";
  imageUrl?: string;
  badge?: string;
  active: boolean;
  content?: string;
  createdAt?: string;
  actionLink?: string;
}

export interface HalvingMilestone {
  id: string;
  milestone: string;
  usersCount: number;
  rewardRate: number; // MSDQ/hr
  reached: boolean;
  estimatedDate: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "mining" | "reward" | "wallet" | "game" | "announcement" | "boost" | "system";
  read: boolean;
  actionScreen?: ScreenType;
}

export interface AdminProtocolConfig {
  tokenName: string;
  tokenSymbol: string;
  ptsToMsdqRate: number; // e.g. 100 (meaning 100 PTS = 1 MSDQ)
  baseMiningRate: number;
  miningDurationHours: number;
  boostPercentage: number;
  minBetGlobal: number;
  maxBetGlobal: number;
  defaultBetGlobal: number;
  maintenanceMode: boolean;
  activeAnnouncementsCount?: number;
}

export interface NodeReferral {
  id: string;
  name: string;
  nodeCode: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  hashContribution: number; // in MH/s
  yieldGenerated: number; // in MSDQ
  status: "Active" | "Idle" | "Syncing";
  lastPing: string;
  canPing: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  category: "daily" | "hourly" | "weekly" | "monthly" | "special" | "event" | "syndicate" | "social" | "genesis" | "milestone" | "referral";
  reward: number;
  rewardType?: "MSDQ" | "PTS";
  progress: number;
  total: number;
  completed: boolean;
  claimed: boolean;
  badge?: string;
}

export interface MiningSession {
  id: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  minedAmount: number;
  effectiveRate: number;
  status: "active" | "completed" | "paused";
  blockHash: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: "HALVING_EMISSION" | "SECURITY_ENCLAVE" | "WITHDRAWAL_DISBURSE" | "CONSENSUS_VOTE" | "BOT_MITIGATION";
  severity: "info" | "warning" | "critical" | "success";
  details: string;
  nodeSource: string;
  status?: "pending" | "investigating" | "resolved";
}

export interface EnclaveUser {
  id: string;
  walletAddress: string;
  tier: string;
  balanceMSDQ: number;
  miningRate: number;
  kycLevel: number;
  status: "Active" | "Frozen" | "Flagged";
  joinedDate: string;
}
