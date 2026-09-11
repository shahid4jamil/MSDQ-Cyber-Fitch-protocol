import React, { useState } from "react";

interface BoostOption {
  id: string;
  title: string;
  boostPercent: number; // e.g. 10 for +10%
  durationHours: number;
  type: "free" | "ad" | "points";
  costPts?: number;
  badge?: string;
  description: string;
}

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoostPercent: number;
  onApplyBoost: (percent: number, durationHours: number, costPts?: number) => boolean;
  onWatchAdForBoost: () => void;
  ptsBalance: number;
}

export const BoostModal: React.FC<BoostModalProps> = ({
  isOpen,
  onClose,
  activeBoostPercent,
  onApplyBoost,
  onWatchAdForBoost,
  ptsBalance,
}) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const boostOptions: BoostOption[] = [
    {
      id: "boost-ad",
      title: "Ad Sponsored Surge",
      boostPercent: 15,
      durationHours: 2,
      type: "ad",
      badge: "FREE BOOST",
      description: "Watch a short sponsored stream to unlock +15% hash velocity for 2 hours.",
    },
    {
      id: "boost-10",
      title: "Standard Hash Surge",
      boostPercent: 10,
      durationHours: 4,
      type: "points",
      costPts: 100,
      badge: "+10% BOOST",
      description: "Activate secondary quantum coprocessors for +10% yield output over 4 hours.",
    },
    {
      id: "boost-25",
      title: "Turbo Hardware Rig",
      boostPercent: 25,
      durationHours: 8,
      type: "points",
      costPts: 250,
      badge: "+25% TURBO",
      description: "Overclock node cluster hardware to generate +25% enhanced yield for 8 hours.",
    },
    {
      id: "boost-super",
      title: "Super Multiplier Overdrive",
      boostPercent: 50,
      durationHours: 12,
      type: "points",
      costPts: 500,
      badge: "SUPER BOOSTER",
      description: "Full consensus validator priority granting a massive +50% velocity for 12 hours.",
    },
  ];

  const handleSelectBoost = (option: BoostOption) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (option.type === "ad") {
      onWatchAdForBoost();
      onClose();
      return;
    }

    if (option.costPts && option.costPts > ptsBalance) {
      setErrorMsg(`Insufficient PTS. You need ${option.costPts} PTS, but only have ${ptsBalance} PTS.`);
      return;
    }

    const applied = onApplyBoost(option.boostPercent, option.durationHours, option.costPts);
    if (applied) {
      setSuccessMsg(`Activated ${option.title} (+${option.boostPercent}%)!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } else {
      setErrorMsg("Failed to apply boost.");
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0f131c] border border-[#2a3447] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#ef4444]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
              <span className="material-symbols-outlined text-[24px]">bolt</span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Node Boost Center</h3>
              <p className="text-xs text-[#94a3b8]">Multiply Proof-of-Presence Hashrate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1e2738] text-[#94a3b8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current Active Boost Status */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#f59e0b]/15 via-[#131823] to-[#10b981]/15 border border-[#f59e0b]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f59e0b] text-[20px]">electric_meter</span>
            <div>
              <span className="text-xs text-[#94a3b8] block">Current Multiplier Status</span>
              <span className="text-sm font-mono font-bold text-white">
                {activeBoostPercent > 0 ? `+${activeBoostPercent}% Active Boost` : "Normal Base Velocity (1.00x)"}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#f59e0b] px-2.5 py-1 rounded-xl bg-[#0a0e17] border border-[#f59e0b]/30">
            Vault: {ptsBalance} PTS
          </span>
        </div>

        {/* Success / Error Messages */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Boost Options Grid */}
        <div className="space-y-3">
          {boostOptions.map((opt) => (
            <div
              key={opt.id}
              className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] hover:border-[#f59e0b]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{opt.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed max-w-sm">
                  {opt.description}
                </p>
                <div className="text-[11px] font-mono text-[#64748b] flex items-center gap-3 pt-0.5">
                  <span>Duration: {opt.durationHours} Hours</span>
                  <span>•</span>
                  <span>{opt.type === "ad" ? "1 Ad Stream" : `${opt.costPts} PTS`}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectBoost(opt)}
                className={`py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                  opt.type === "ad"
                    ? "bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-md hover:opacity-90"
                    : "bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] shadow-md"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {opt.type === "ad" ? "play_circle" : "bolt"}
                </span>
                <span>{opt.type === "ad" ? "Watch Ad" : "Activate"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
