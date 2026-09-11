import React, { useState, useEffect } from "react";
import { TaskItem } from "../types";

interface RewardsScreenProps {
  claimableVault: number;
  tasks: TaskItem[];
  onClaimTask: (taskId: string) => void;
  onClaimVault: () => void;
  onOpenAdModal: () => void;
  streakDay: number;
  onClaimStreak: (day: number) => void;
  streakClaimedToday: boolean;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  claimableVault,
  tasks,
  onClaimTask,
  onClaimVault,
  onOpenAdModal,
  streakDay,
  onClaimStreak,
  streakClaimedToday,
}) => {
  // Hourly claim timer
  const [hourlySeconds, setHourlySeconds] = useState(1420); // ~23m 40s
  const [canClaimHourly, setCanClaimHourly] = useState(false);

  useEffect(() => {
    if (hourlySeconds <= 0) {
      setCanClaimHourly(true);
      return;
    }
    const timer = setInterval(() => {
      setHourlySeconds((prev) => {
        if (prev <= 1) {
          setCanClaimHourly(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hourlySeconds]);

  const handleClaimHourly = () => {
    if (!canClaimHourly) return;
    onClaimVault();
    setHourlySeconds(3600);
    setCanClaimHourly(false);
  };

  const streakRewards = [5, 10, 15, 20, 25, 50, 100];

  return (
    <div className="flex flex-col gap-4 pb-24 max-w-xl mx-auto px-3.5 pt-3">
      {/* Claimable Vault Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c2028] via-[#161d26] to-[#0f131c] border border-[#ffb95f]/50 p-5 shadow-lg">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#ffb95f] font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">redeem</span>
            REWARDS & BOUNTY ENCLAVE
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ffb95f]/15 text-[#ffb95f]">
            UNLOCKED YIELD
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-xs text-[#bbcabf] font-mono">Claimable Vault Balance</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl sm:text-4xl font-mono font-extrabold text-[#dfe2ee]">
                {claimableVault.toFixed(2)}
              </span>
              <span className="text-lg font-mono font-bold text-[#ffb95f]">MSDQ</span>
            </div>
          </div>

          <button
            onClick={onClaimVault}
            disabled={claimableVault <= 0}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ffb95f] to-[#e29100] text-[#472a00] font-mono text-xs font-extrabold hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(255,185,95,0.3)]"
          >
            Claim All to Vault
          </button>
        </div>
      </div>

      {/* Hourly Protocol & Daily Drops Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hourly Reward Card */}
        <div className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
                update
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#4edea3]/10 text-[#4edea3]">
                HOURLY
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-[#dfe2ee] mt-2">+10.00 MSDQ</div>
            <div className="text-[10px] font-mono text-[#bbcabf]">Proof-of-Presence check</div>
          </div>

          <button
            onClick={handleClaimHourly}
            disabled={!canClaimHourly}
            className={`w-full mt-3 py-2 rounded-xl font-mono text-[11px] font-bold transition-all ${
              canClaimHourly
                ? "bg-[#4edea3] text-[#003824] hover:brightness-110 shadow-[0_0_12px_rgba(78,222,163,0.3)]"
                : "bg-[#262a33] text-[#86948a] cursor-not-allowed"
            }`}
          >
            {canClaimHourly
              ? "Claim Now"
              : `${Math.floor(hourlySeconds / 60)}m ${hourlySeconds % 60}s`}
          </button>
        </div>

        {/* Watch & Earn Sponsored Stream Card */}
        <div className="p-4 rounded-3xl bg-[#181c24] border border-[#4cd7f6]/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-[#4cd7f6] text-[20px]">
                smart_display
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#4cd7f6]/10 text-[#4cd7f6]">
                WATCH & EARN
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-[#dfe2ee] mt-2">+5.00 MSDQ</div>
            <div className="text-[10px] font-mono text-[#bbcabf]">Sponsored relay stream</div>
          </div>

          <button
            onClick={onOpenAdModal}
            className="w-full mt-3 py-2 rounded-xl bg-[#4cd7f6] text-[#003640] font-mono text-[11px] font-bold hover:brightness-110 transition-all shadow-[0_0_12px_rgba(76,215,246,0.3)] flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">play_arrow</span>
            Watch Stream (2/5)
          </button>
        </div>
      </div>

      {/* 7-Day Daily Check-In Streak Matrix */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb95f] text-[18px]">
              local_fire_department
            </span>
            <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
              7-Day Check-In Streak
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#4edea3] font-bold">
            Day 7 Jackpot: +100 MSDQ
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mt-3">
          {streakRewards.map((reward, idx) => {
            const dayNum = idx + 1;
            const isCompleted = dayNum < streakDay || (dayNum === streakDay && streakClaimedToday);
            const isCurrent = dayNum === streakDay && !streakClaimedToday;
            const isJackpot = dayNum === 7;

            return (
              <button
                key={dayNum}
                disabled={!isCurrent}
                onClick={() => onClaimStreak(dayNum)}
                className={`p-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                  isCompleted
                    ? "bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3]"
                    : isCurrent
                    ? "bg-[#ffb95f]/20 border-2 border-[#ffb95f] text-[#ffb95f] animate-pulse"
                    : isJackpot
                    ? "bg-[#262a33] border border-[#ffb95f]/30 text-[#ffb95f]"
                    : "bg-[#0f131c] border border-[#3c4a42]/40 text-[#bbcabf]"
                }`}
              >
                <span className="text-[9px] font-mono uppercase font-bold">D{dayNum}</span>
                <span className="material-symbols-outlined text-[16px] my-1">
                  {isCompleted ? "check_circle" : isJackpot ? "workspace_premium" : "lock"}
                </span>
                <span className="text-[10px] font-mono font-bold">+{reward}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekly Syndicate Bounty Card */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#dfe2ee] font-bold">Weekly Syndicate Bounty</span>
          <span className="text-[#4edea3] font-bold">+150.00 MSDQ</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-[#0a0e16] mt-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#4edea3] to-[#4cd7f6]"
            style={{ width: "80%" }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[#bbcabf] mt-2">
          <span>4 / 5 Objectives Met</span>
          <span>Resets in 3 days</span>
        </div>
      </div>

      {/* Dynamic Tasks Engine List */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
          Protocol Task Matrix
        </span>

        <div className="divide-y divide-[#3c4a42]/30 mt-3">
          {tasks.map((task) => (
            <div key={task.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    task.completed
                      ? "bg-[#4edea3]/15 text-[#4edea3]"
                      : "bg-[#262a33] text-[#bbcabf]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {task.completed ? "task_alt" : "pending"}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#dfe2ee]">{task.title}</div>
                  <div className="text-[10px] font-mono text-[#bbcabf] flex items-center gap-1.5 mt-0.5">
                    <span className="text-[#4edea3]">+{task.reward.toFixed(1)} MSDQ</span>
                    <span>•</span>
                    <span>{task.progress}/{task.total} Progress</span>
                  </div>
                </div>
              </div>

              <div>
                {task.claimed ? (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono text-[#86948a] bg-[#0f131c]">
                    Claimed
                  </span>
                ) : task.completed ? (
                  <button
                    onClick={() => onClaimTask(task.id)}
                    className="py-1 px-3 rounded-xl bg-[#4edea3] text-[#003824] font-mono text-[10px] font-bold hover:brightness-110 shadow-[0_0_10px_rgba(78,222,163,0.3)]"
                  >
                    Claim
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono text-[#bbcabf] bg-[#262a33]">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
