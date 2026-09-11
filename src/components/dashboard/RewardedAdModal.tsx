import React, { useState, useEffect } from "react";

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: (rewardMsdq: number, boostBonus?: number) => void;
  rewardAmount?: number;
  boostBonus?: number;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onAdCompleted,
  rewardAmount = 5.0,
  boostBonus = 0.25,
}) => {
  const [countdown, setCountdown] = useState(5);
  const [canClaim, setCanClaim] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setCanClaim(false);
      setIsVerifying(false);
      return;
    }

    setCountdown(5);
    setCanClaim(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClaim(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = () => {
    if (!canClaim) return;
    setIsVerifying(true);
    // Simulate cryptographic callback verification
    setTimeout(() => {
      setIsVerifying(false);
      onAdCompleted(rewardAmount, boostBonus);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#0f131c] border border-[#2a3447] rounded-3xl p-6 shadow-2xl space-y-4 text-center relative overflow-hidden">
        {/* Top timer badge */}
        <div className="flex items-center justify-between pb-2 border-b border-[#2a3447]/60 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#f59e0b]">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Sponsored Ecosystem Stream</span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-[#1e2738] text-white">
            {canClaim ? "Stream Verified" : `Reward in ${countdown}s`}
          </div>
        </div>

        {/* Video simulation stage */}
        <div className="relative aspect-video w-full rounded-2xl bg-gradient-to-tr from-[#1e1b4b] via-[#0f172a] to-[#022c22] border border-[#334155] flex flex-col items-center justify-center p-4 overflow-hidden shadow-inner">
          <div className="w-14 h-14 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center text-[#f59e0b] mb-2 animate-pulse">
            <span className="material-symbols-outlined text-[28px]">play_circle</span>
          </div>

          <h4 className="text-base font-black text-white tracking-wide">
            MSDQ Cyber Node Booster
          </h4>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-xs">
            Accelerating decentralized consensus hardware rigs across global telemetry pools.
          </p>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#0a0e17]">
            <div
              className="h-full bg-gradient-to-r from-[#10b981] to-[#f59e0b] transition-all duration-1000"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Rewards summary */}
        <div className="p-3 rounded-2xl bg-[#131823] border border-[#2a3447] flex items-center justify-around text-xs font-mono">
          <div>
            <span className="text-[#94a3b8] block text-[10px]">Instant Reward</span>
            <span className="text-sm font-bold text-[#10b981]">+{rewardAmount.toFixed(2)} MSDQ</span>
          </div>
          <div className="w-px h-6 bg-[#2a3447]"></div>
          <div>
            <span className="text-[#94a3b8] block text-[10px]">Hashrate Surge</span>
            <span className="text-sm font-bold text-[#f59e0b]">+{Math.round(boostBonus * 100)}% Boost</span>
          </div>
        </div>

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={!canClaim || isVerifying}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] hover:opacity-95 active:scale-[0.98] text-white font-extrabold text-sm tracking-wide shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              <span>Verifying Ad Stream...</span>
            </>
          ) : canClaim ? (
            <>
              <span className="material-symbols-outlined text-[20px]">redeem</span>
              <span>Claim Reward &amp; Boost</span>
            </>
          ) : (
            <span>Please wait {countdown}s...</span>
          )}
        </button>
      </div>
    </div>
  );
};
