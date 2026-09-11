import React from "react";
import { HalvingMilestone } from "../../types";

interface NextHalvingCardProps {
  currentMiningRate: number;
  halvingMilestones: HalvingMilestone[];
  onOpenHalvingScreen?: () => void;
}

export const NextHalvingCard: React.FC<NextHalvingCardProps> = ({
  currentMiningRate,
  halvingMilestones,
  onOpenHalvingScreen,
}) => {
  // Find current active milestone and next upcoming milestone
  const nextMilestone = halvingMilestones.find((m) => !m.reached) || halvingMilestones[halvingMilestones.length - 1];
  const previousMilestones = halvingMilestones.filter((m) => m.reached);
  const lastReached = previousMilestones[previousMilestones.length - 1];

  // Current simulated user count: 542,118 users
  const currentUsers = 542118;
  const targetUsers = nextMilestone ? nextMilestone.usersCount : 1000000;
  const prevUsers = lastReached ? lastReached.usersCount : 100000;

  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((currentUsers - prevUsers) / (targetUsers - prevUsers)) * 100))
  );

  const nextRate = nextMilestone ? nextMilestone.rewardRate : currentMiningRate * 0.5;

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-[#131823] via-[#0f141f] to-[#0a0e17] border border-[#8b5cf6]/30 shadow-xl relative overflow-hidden space-y-4 group">
      {/* Decorative gradient aura */}
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#8b5cf6]/10 blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center text-[#8b5cf6]">
            <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Next Halving Countdown</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/40 font-mono">
                EPOCH 4
              </span>
            </h3>
            <span className="text-[10px] text-[#94a3b8] font-mono">Deflationary Supply Protocol</span>
          </div>
        </div>

        {onOpenHalvingScreen && (
          <button
            onClick={onOpenHalvingScreen}
            className="text-xs font-mono font-bold text-[#8b5cf6] hover:text-[#a78bfa] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-[#2a3447]/60">
          <span className="text-[10px] text-[#94a3b8] block">Current Base Yield</span>
          <span className="font-mono text-sm font-black text-[#10b981] mt-0.5 block">
            {currentMiningRate.toFixed(2)} MSDQ/h
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-[#2a3447]/60">
          <span className="text-[10px] text-[#94a3b8] block">Current Network Size</span>
          <span className="font-mono text-sm font-black text-white mt-0.5 block">
            {currentUsers.toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-[#2a3447]/60">
          <span className="text-[10px] text-[#94a3b8] block">Next Milestone</span>
          <span className="font-mono text-sm font-black text-[#f59e0b] mt-0.5 block">
            {nextMilestone?.milestone || "1M Miners"}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#0a0e17]/80 border border-[#2a3447]/60">
          <span className="text-[10px] text-[#94a3b8] block">Halving Effect</span>
          <span className="font-mono text-sm font-black text-[#ef4444] mt-0.5 block flex items-center gap-1">
            <span>{nextRate.toFixed(2)} MSDQ/h</span>
            <span className="text-[9px] text-[#ef4444] font-bold">(-50%)</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#94a3b8]">Milestone Progress:</span>
          <span className="font-bold text-[#8b5cf6]">{progressPct}% Complete</span>
        </div>
        <div className="w-full h-2.5 bg-[#0a0e17] rounded-full overflow-hidden border border-[#2a3447]/60 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#f59e0b] shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] text-[#64748b] font-mono pt-0.5">
          <span>Checkpoint: {lastReached?.milestone || "100K"}</span>
          <span>Target: {nextMilestone?.milestone || "1M Users"}</span>
        </div>
      </div>
    </div>
  );
};
