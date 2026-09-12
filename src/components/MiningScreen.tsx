import React, { useState, useEffect } from "react";
import { Transaction, HalvingMilestone, MiningSession } from "../types";
import { UserProfile } from "../lib/firebase";

interface MiningScreenProps {
  protocolBalance: number;
  usdBalance: number;
  isMining: boolean;
  miningRate: number;
  baseRate: number;
  boostRate: number;
  sessionMined: number;
  activeBoostPercent: number;
  onToggleMining: () => void;
  onClaimMining: () => void;
  onOpenBoost: () => void;
  onOpenConvert?: () => void;
  onNavigate: (screen: any) => void;
  halvingMilestones?: HalvingMilestone[];
  transactions: Transaction[];
  userProfile?: UserProfile | null;
  onStartMiningSession?: () => Promise<void>;
  onClaimMiningReward?: () => Promise<void>;
}

export const MiningScreen: React.FC<MiningScreenProps> = ({
  protocolBalance,
  isMining,
  miningRate,
  baseRate,
  boostRate,
  sessionMined,
  activeBoostPercent,
  onToggleMining,
  onClaimMining,
  onOpenBoost,
  onNavigate,
  halvingMilestones = [],
  transactions,
  userProfile,
  onStartMiningSession,
  onClaimMiningReward,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [liveYield, setLiveYield] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState<boolean>(true);

  // Server-authoritative status
  const serverStatus = userProfile?.miningStatus || (isMining ? "mining" : "idle");
  const miningStartedAt = userProfile?.miningStartedAt || 0;
  const miningEndsAt = userProfile?.miningEndsAt || 0;
  const effectiveMiningRate = userProfile?.miningRate || (baseRate + boostRate);

  // Update countdown and earned yield based on authoritative server timestamps
  useEffect(() => {
    const updateAuthoritativeTimer = () => {
      const now = Date.now();
      if (serverStatus === "mining" && miningEndsAt > 0) {
        const remaining = Math.max(0, Math.floor((miningEndsAt - now) / 1000));
        setSecondsRemaining(remaining);

        // Calculate accrued yield so far:
        const elapsedHours = Math.max(
          0,
          (Math.min(now, miningEndsAt) - miningStartedAt) / 3600000
        );
        const earned = elapsedHours * effectiveMiningRate;
        setLiveYield(parseFloat(earned.toFixed(4)));
      } else if (serverStatus === "completed") {
        setSecondsRemaining(0);
        const totalHours = Math.max(0, (miningEndsAt - miningStartedAt) / 3600000);
        setLiveYield(parseFloat((totalHours * effectiveMiningRate).toFixed(4)));
      } else {
        setSecondsRemaining(86400);
        setLiveYield(0);
      }
    };

    updateAuthoritativeTimer();
    const interval = setInterval(updateAuthoritativeTimer, 1000);
    return () => clearInterval(interval);
  }, [serverStatus, miningStartedAt, miningEndsAt, effectiveMiningRate]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const totalCycleSeconds = 86400;
  const cyclePercent =
    serverStatus === "completed"
      ? 100
      : serverStatus === "mining"
      ? Math.min(100, Math.max(0, ((totalCycleSeconds - secondsRemaining) / totalCycleSeconds) * 100))
      : 0;

  const handleStartSession = async () => {
    if (onStartMiningSession) {
      setIsStarting(true);
      try {
        await onStartMiningSession();
      } finally {
        setIsStarting(false);
      }
    } else {
      onToggleMining();
    }
  };

  const handleClaimReward = async () => {
    if (onClaimMiningReward) {
      setIsClaiming(true);
      try {
        await onClaimMiningReward();
      } finally {
        setIsClaiming(false);
      }
    } else {
      onClaimMining();
    }
  };

  const handleToggleNotify = async () => {
    if (!notifyOnComplete && "Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
      }
    }
    setNotifyOnComplete(!notifyOnComplete);
  };

  const nextMilestone = halvingMilestones.find((m) => !m.reached) || halvingMilestones[0];
  const miningTransactions = transactions.filter((t) => t.type === "mining");

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#131823] via-[#1a2232] to-[#131823] border border-[#2a3447] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-[#38bdf8]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
            <span className="material-symbols-outlined text-[28px] animate-spin-slow">
              memory
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#10b981] uppercase">
                Server-Authoritative Hash Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
              MSDQ Mining Terminal
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Automated, zero-battery-drain sovereign node validation protocol.
            </p>
          </div>
        </div>

        {/* Balance Capsule */}
        <div className="flex items-center gap-2 bg-[#0a0e17] border border-[#2a3447] rounded-2xl px-4 py-2.5">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Vault Balance</span>
            <div className="text-base font-mono font-bold text-[#10b981]">
              {protocolBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MSDQ
            </div>
          </div>
          <button
            onClick={() => onNavigate("wallet")}
            className="p-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[#38bdf8] transition-colors cursor-pointer"
            title="Open Wallet"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          </button>
        </div>
      </div>

      {/* Main Mining Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Big Mining Gauge & Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Dial Card */}
          <div className="rounded-3xl bg-[#131823] border border-[#2a3447] p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* Top Status Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2a3447]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8] text-[20px]">
                  podcasts
                </span>
                <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  Rig Telemetry • Node Enclave
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleNotify}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                    notifyOnComplete
                      ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40"
                      : "bg-[#1e2738] text-[#94a3b8] border-[#2a3447]"
                  }`}
                  title="Alert when cycle completes"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {notifyOnComplete ? "notifications_active" : "notifications_off"}
                  </span>
                  <span>{notifyOnComplete ? "Alerts On" : "Alerts Off"}</span>
                </button>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a0e17] border border-[#2a3447]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      serverStatus === "mining"
                        ? "bg-[#10b981] animate-pulse"
                        : serverStatus === "completed"
                        ? "bg-[#38bdf8] animate-bounce"
                        : "bg-[#94a3b8]"
                    }`}
                  />
                  <span className="text-[11px] font-mono font-bold text-white uppercase">
                    {serverStatus === "mining"
                      ? "Mining Active"
                      : serverStatus === "completed"
                      ? "Cycle Complete"
                      : "Node Idle"}
                  </span>
                </div>
              </div>
            </div>

            {/* Circular Visualizer */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
                  {/* Track Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    fill="transparent"
                    stroke="#1e2738"
                    strokeWidth="10"
                  />
                  {/* Active Progress Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    fill="transparent"
                    stroke={
                      serverStatus === "completed"
                        ? "#38bdf8"
                        : serverStatus === "mining"
                        ? "#10b981"
                        : "#334155"
                    }
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={2 * Math.PI * 84 * (1 - cyclePercent / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Ambient Center Glow */}
                <div
                  className={`absolute inset-6 rounded-full border border-dashed transition-all duration-700 flex flex-col items-center justify-center text-center p-3 ${
                    serverStatus === "mining"
                      ? "border-[#10b981]/50 bg-[#0a0e17]/80 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                      : serverStatus === "completed"
                      ? "border-[#38bdf8]/50 bg-[#0a0e17]/80 shadow-[0_0_30px_rgba(56,189,248,0.2)]"
                      : "border-[#2a3447] bg-[#0a0e17]"
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                    Mining Rate
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                      {serverStatus === "mining" ? effectiveMiningRate.toFixed(2) : "0.00"}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#10b981]">
                      MSDQ/h
                    </span>
                  </div>

                  {/* Rate Breakdown */}
                  <div className="text-[11px] font-mono text-[#38bdf8] mt-1 flex items-center gap-1">
                    <span>{baseRate.toFixed(2)} base</span>
                    <span>+</span>
                    <span>{boostRate.toFixed(2)} boost</span>
                  </div>

                  {/* Cycle Timer Countdown */}
                  <div className="mt-2 pt-2 border-t border-[#2a3447]/60 w-full">
                    <span className="text-[9px] font-mono uppercase text-[#94a3b8] block">
                      Cycle Countdown
                    </span>
                    <span className="text-xs font-mono font-extrabold text-white">
                      {serverStatus === "mining"
                        ? formatTime(secondsRemaining)
                        : serverStatus === "completed"
                        ? "00:00:00 (CLAIMABLE)"
                        : "24:00:00 (READY)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar of Current 24h Cycle */}
              <div className="w-full max-w-md mt-6 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94a3b8]">24h Mining Cycle Progress</span>
                  <span className="font-bold text-[#10b981]">{cyclePercent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#0a0e17] border border-[#2a3447] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#38bdf8] transition-all duration-500"
                    style={{ width: `${cyclePercent}%` }}
                  />
                </div>
              </div>

              {/* Authoritative Session Yield Accrual */}
              <div className="w-full max-w-md mt-4 p-4 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                    Session Accumulation
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-mono font-black text-[#10b981]">
                      +{liveYield.toFixed(4)}
                    </span>
                    <span className="text-xs font-mono text-[#94a3b8]">MSDQ</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                    Estimated Value
                  </span>
                  <span className="text-sm font-mono font-bold text-white">
                    ≈ ${(liveYield * 0.5).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: START MINING, SPEED BOOST, CLAIM REWARD */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 pt-2">
              {serverStatus === "mining" && secondsRemaining > 0 ? (
                <button
                  disabled
                  className="py-3.5 px-3 rounded-2xl font-mono text-xs sm:text-sm font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    sync
                  </span>
                  <span>Mining Active ({formatTime(secondsRemaining)})</span>
                </button>
              ) : serverStatus === "completed" || (serverStatus === "mining" && secondsRemaining === 0) ? (
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="py-3.5 px-3 rounded-2xl font-mono text-xs sm:text-sm font-black bg-gradient-to-r from-[#38bdf8] to-[#0284c7] text-white hover:brightness-110 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    download_for_offline
                  </span>
                  <span>{isClaiming ? "Claiming..." : `Claim ${liveYield.toFixed(2)} MSDQ`}</span>
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={isStarting}
                  className="py-3.5 px-3 rounded-2xl font-mono text-xs sm:text-sm font-black bg-gradient-to-r from-[#10b981] to-[#059669] text-white hover:brightness-110 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  <span>{isStarting ? "Starting..." : "Start 24h Mining"}</span>
                </button>
              )}

              <button
                onClick={onOpenBoost}
                className="py-3.5 px-3 rounded-2xl font-mono text-xs sm:text-sm font-black bg-[#1e2738] text-[#f59e0b] border border-[#f59e0b]/40 hover:bg-[#2a374f] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>Speed Boost</span>
              </button>

              <button
                onClick={handleClaimReward}
                disabled={liveYield <= 0.001 || isClaiming}
                className="py-3.5 px-3 rounded-2xl font-mono text-xs sm:text-sm font-black bg-[#1e2738] text-[#38bdf8] border border-[#38bdf8]/40 hover:bg-[#2a374f] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none shadow-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">savings</span>
                <span>Claim Harvest</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Boost Card, Next Halving, and Session History */}
        <div className="lg:col-span-5 space-y-5">
          {/* Boost Status & Super Booster Card */}
          <div className="p-5 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f59e0b] text-[20px]">
                  rocket_launch
                </span>
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Hashrate Boost Engine
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                {activeBoostPercent > 0 ? `+${activeBoostPercent}% Active` : "Standard Rate"}
              </span>
            </div>

            <p className="text-xs text-[#94a3b8]">
              Accelerate your node rewards with PTS point boosts or watch sponsored streams to unlock the +10% Super Booster.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={onOpenBoost}
                className="p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] hover:border-[#f59e0b]/50 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-[#f59e0b]">
                  <span className="text-xs font-mono font-bold">+25% Boost</span>
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] block mt-1">
                  100 PTS • 6 Hours
                </span>
              </button>

              <button
                onClick={onOpenBoost}
                className="p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] hover:border-[#10b981]/50 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-[#10b981]">
                  <span className="text-xs font-mono font-bold">Super Booster</span>
                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] block mt-1">
                  +10% Rate • Free Ad
                </span>
              </button>
            </div>
          </div>

          {/* Halving Impact Card */}
          {nextMilestone && (
            <div className="p-5 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38bdf8] text-[20px]">
                    hourglass_bottom
                  </span>
                  <h3 className="text-sm font-mono font-bold text-white uppercase">
                    Upcoming Halving Event
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate("halving")}
                  className="text-[11px] font-mono text-[#38bdf8] hover:underline cursor-pointer"
                >
                  Details →
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Next Milestone</span>
                  <span className="text-sm font-mono font-bold text-white">{nextMilestone.milestone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Reward Shift</span>
                  <span className="text-sm font-mono font-bold text-[#ef4444]">
                    {miningRate.toFixed(2)} → {nextMilestone.rewardRate.toFixed(2)} MSDQ/h
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Real Mining Session History */}
          <div className="p-5 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3447]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">
                  history
                </span>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Mining Emission Records
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8]">Verified Ledger</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {miningTransactions.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-[#64748b]">
                  No settled mining cycles recorded yet. Activate a 24-hour cycle to disburse Proof-of-Work yield.
                </div>
              ) : (
                miningTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold text-[#10b981] flex items-center gap-1.5">
                        <span>+{tx.amount.toFixed(2)} MSDQ</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#10b981]/15 text-[#10b981]">
                          24h Cycle
                        </span>
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5 flex items-center gap-1">
                        <span>{tx.timestamp}</span>
                        <span>•</span>
                        <span>{tx.txHash || "0xVerified"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#10b981] font-bold block">✓ SETTLED</span>
                      <span className="text-[10px] text-[#94a3b8]">PoC Emission</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
