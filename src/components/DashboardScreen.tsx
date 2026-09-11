import React, { useState, useEffect } from "react";
import { Transaction, Announcement, HalvingMilestone } from "../types";
import { NextHalvingCard } from "./dashboard/NextHalvingCard";
import { AnnouncementsBanner } from "./dashboard/AnnouncementsBanner";

interface DashboardScreenProps {
  protocolBalance: number;
  usdBalance: number;
  isMining: boolean;
  miningRate: number;
  baseRate: number;
  boostRate: number;
  sessionMined: number;
  onToggleMining: () => void;
  onClaimMining: () => void;
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenBoost: () => void;
  onOpenConvert?: () => void;
  onNavigate: (screen: any) => void;
  transactions: Transaction[];
  announcements?: Announcement[];
  halvingMilestones?: HalvingMilestone[];
  activeBoostPercent?: number;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  protocolBalance,
  usdBalance,
  isMining,
  miningRate,
  baseRate,
  boostRate,
  sessionMined,
  onToggleMining,
  onClaimMining,
  onOpenSend,
  onOpenReceive,
  onOpenBoost,
  onOpenConvert,
  onNavigate,
  transactions,
  announcements = [],
  halvingMilestones = [],
  activeBoostPercent = 0,
}) => {
  // Live animated mining ticker
  const [liveSessionMined, setLiveSessionMined] = useState(sessionMined);

  useEffect(() => {
    setLiveSessionMined(sessionMined);
  }, [sessionMined]);

  useEffect(() => {
    if (!isMining) return;
    const interval = setInterval(() => {
      setLiveSessionMined((prev) => prev + (miningRate / 3600) * 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [isMining, miningRate]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-5">
      {/* Network Announcements Banner */}
      {announcements.length > 0 && (
        <AnnouncementsBanner announcements={announcements} />
      )}

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column on Desktop */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Balance & Protocol Equity Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131823] via-[#0f141f] to-[#0a0e17] border border-[#2a3447] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
                <span className="text-[#38bdf8] font-bold uppercase tracking-wider">
                  MSDQ Network Consensus Balance
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-bold">
                Sovereign Rig
              </span>
            </div>

            <div>
              <span className="text-xs text-[#94a3b8] font-mono">Total Verified Balance</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white">
                  {protocolBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg font-mono font-extrabold text-[#38bdf8]">MSDQ</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-[#94a3b8]">
                  ≈ ${usdBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  +4.82% 24h
                </span>
              </div>
            </div>

            {/* 4 Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={onOpenSend}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] hover:border-[#38bdf8]/50 transition-all group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#38bdf8]/15 text-[#38bdf8] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">north_east</span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-white mt-1.5">Send</span>
              </button>

              <button
                onClick={onOpenReceive}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] hover:border-[#10b981]/50 transition-all group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">south_west</span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-white mt-1.5">Receive</span>
              </button>

              <button
                onClick={onOpenConvert || (() => onNavigate("wallet"))}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] hover:border-[#f59e0b]/50 transition-all group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">currency_exchange</span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-white mt-1.5">Convert</span>
              </button>

              <button
                onClick={onOpenBoost}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] hover:border-[#f59e0b]/50 transition-all group"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#ef4444]/20 text-[#f59e0b] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">bolt</span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-white mt-1.5">Boost</span>
              </button>
            </div>
          </div>

          {/* Interactive Mining Hub Gauge Card */}
          <div className="relative rounded-3xl bg-[#131823] border border-[#2a3447] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[22px] ${isMining ? "text-[#10b981] animate-spin" : "text-[#94a3b8]"}`}>
                  cyclone
                </span>
                <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  Decentralized Mining Pod
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMining ? "bg-[#10b981] animate-pulse" : "bg-[#ef4444]"
                  }`}
                ></span>
                <span className="text-[11px] font-mono text-[#94a3b8]">
                  {isMining ? "MINING ACTIVE" : "MINING PAUSED"}
                </span>
              </div>
            </div>

            {/* Circular Mining Gauge Visualizer */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                {/* Outer Ambient glowing ring */}
                <div
                  className={`absolute inset-0 rounded-full border-2 transition-all duration-700 ${
                    isMining
                      ? "border-[#10b981]/40 shadow-[0_0_35px_rgba(16,185,129,0.3)] animate-spin-slow"
                      : "border-[#2a3447]"
                  }`}
                ></div>

                {/* Inner dashed ring */}
                <div
                  className={`absolute inset-3 rounded-full border border-dashed transition-all duration-500 ${
                    isMining ? "border-[#38bdf8]/50 animate-reverse-spin" : "border-[#2a3447]/60"
                  }`}
                ></div>

                {/* Core telemetry display */}
                <div className="flex flex-col items-center justify-center text-center z-10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                    Hash Velocity
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                      {isMining ? miningRate.toFixed(2) : "0.00"}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#10b981]">
                      MSDQ/h
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#38bdf8] mt-1 flex items-center gap-1">
                    <span>{baseRate.toFixed(2)} base</span>
                    <span>+</span>
                    <span>{boostRate.toFixed(2)} surge</span>
                  </div>
                  {activeBoostPercent > 0 && (
                    <span className="mt-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
                      +{activeBoostPercent}% OVERCLOCK
                    </span>
                  )}
                </div>
              </div>

              {/* Session Real-time Accrued Counter */}
              <div className="w-full mt-4 p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <span className="text-xs font-mono text-[#94a3b8]">Current Session Yield</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#10b981]">
                    +{liveSessionMined.toFixed(4)}
                  </span>
                  <span className="font-mono text-xs text-[#94a3b8]">MSDQ</span>
                </div>
              </div>
            </div>

            {/* 3 Buttons: START MINING / PAUSE, BOOST, CLAIM REWARD */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
              <button
                onClick={onToggleMining}
                className={`py-3 px-2 rounded-2xl font-mono text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                  isMining
                    ? "bg-[#1e2738] text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#2a374f]"
                    : "bg-gradient-to-r from-[#10b981] to-[#059669] text-white hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMining ? "pause_circle" : "play_arrow"}
                </span>
                <span>{isMining ? "Pause" : "Start Mining"}</span>
              </button>

              <button
                onClick={onOpenBoost}
                className="py-3 px-2 rounded-2xl font-mono text-xs sm:text-sm font-extrabold bg-[#1e2738] text-[#f59e0b] border border-[#f59e0b]/40 hover:bg-[#2a374f] transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Boost</span>
              </button>

              <button
                onClick={onClaimMining}
                disabled={liveSessionMined < 0.01}
                className="py-3 px-2 rounded-2xl font-mono text-xs sm:text-sm font-extrabold bg-[#1e2738] text-[#38bdf8] border border-[#38bdf8]/40 hover:bg-[#2a374f] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                <span>Claim</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column on Desktop */}
        <div className="lg:col-span-5 space-y-5">
          {/* Next Halving Tracker Card */}
          {halvingMilestones.length > 0 && (
            <NextHalvingCard
              currentMiningRate={miningRate}
              halvingMilestones={halvingMilestones}
              onOpenHalvingScreen={() => onNavigate("halving")}
            />
          )}

          {/* Protocol Telemetry HUD Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex flex-col">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase">Network Diff</span>
              <span className="text-sm font-mono font-bold text-white mt-1">4.82 TH/s</span>
              <span className="text-[10px] text-[#10b981] font-mono">+1.2% this epoch</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex flex-col">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase">Active Nodes</span>
              <span className="text-sm font-mono font-bold text-white mt-1">64 Peers</span>
              <span className="text-[10px] text-[#38bdf8] font-mono">Quorum Synced</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex flex-col">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase">Uptime Ratio</span>
              <span className="text-sm font-mono font-bold text-white mt-1">99.98%</span>
              <span className="text-[10px] text-[#10b981] font-mono">Slashing Safe</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex flex-col">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase">Next Epoch</span>
              <span className="text-sm font-mono font-bold text-[#f59e0b] mt-1">#1.50M</span>
              <span className="text-[10px] text-[#94a3b8] font-mono">137,882 left</span>
            </div>
          </div>

          {/* Recent Ledger Activity Feed Preview */}
          <div className="rounded-3xl bg-[#131823] border border-[#2a3447] p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8] text-[18px]">
                  receipt_long
                </span>
                <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  Real-Time Node Ledger
                </span>
              </div>
              <button
                onClick={() => onNavigate("wallet")}
                className="text-[11px] font-mono text-[#10b981] hover:underline flex items-center gap-1"
              >
                All Logs <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>

            <div className="divide-y divide-[#2a3447]/40 mt-2">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.amount > 0
                          ? "bg-[#10b981]/15 text-[#10b981]"
                          : "bg-[#ef4444]/15 text-[#ef4444]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {tx.amount > 0 ? "arrow_downward" : "arrow_upward"}
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-medium text-white truncate max-w-[170px] sm:max-w-[220px]">{tx.note}</div>
                      <div className="text-[10px] font-mono text-[#64748b] flex items-center gap-1.5">
                        <span>{tx.timestamp}</span>
                        <span>•</span>
                        <span className="text-[#94a3b8]">{tx.txHash}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono text-xs font-bold ${
                        tx.amount > 0 ? "text-[#10b981]" : "text-white"
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} MSDQ
                    </div>
                    <div className="text-[10px] font-mono text-[#64748b]">
                      ${tx.usdValue.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
