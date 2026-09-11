import React, { useState } from "react";

interface BetAmountControlProps {
  amount: number;
  onChange: (amount: number) => void;
  availableBalance: number;
  minBet?: number;
  maxBet?: number;
  step?: number;
  tokenSymbol?: string;
  multiplierPreview?: number | string;
  disabled?: boolean;
  onConfirmBet?: () => void;
  actionButtonText?: string;
  actionButtonIcon?: string;
}

export const BetAmountControl: React.FC<BetAmountControlProps> = ({
  amount,
  onChange,
  availableBalance,
  minBet = 10,
  maxBet = 1000,
  step = 10,
  tokenSymbol = "PTS",
  multiplierPreview,
  disabled = false,
  onConfirmBet,
  actionButtonText,
  actionButtonIcon = "play_arrow",
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDecrease = () => {
    if (disabled) return;
    const newAmount = Math.max(minBet, amount - step);
    onChange(newAmount);
  };

  const handleIncrease = () => {
    if (disabled) return;
    const maxAllowed = Math.min(maxBet, availableBalance);
    const newAmount = Math.min(maxAllowed, amount + step);
    onChange(newAmount);
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const val = parseFloat(e.target.value);
    if (isNaN(val)) {
      onChange(minBet);
      return;
    }
    const clamped = Math.min(Math.max(minBet, val), Math.min(maxBet, availableBalance));
    onChange(clamped);
  };

  const setPreset = (preset: number | "min" | "max" | "half" | "double") => {
    if (disabled) return;
    const maxAllowed = Math.min(maxBet, availableBalance);
    let newAmount = amount;

    if (preset === "min") {
      newAmount = minBet;
    } else if (preset === "max") {
      newAmount = maxAllowed;
    } else if (preset === "half") {
      newAmount = Math.max(minBet, Math.floor(amount / 2));
    } else if (preset === "double") {
      newAmount = Math.min(maxAllowed, amount * 2);
    } else if (typeof preset === "number") {
      newAmount = Math.min(maxAllowed, Math.max(minBet, preset));
    }

    onChange(newAmount);
  };

  const isInsufficient = amount > availableBalance;
  const isBelowMin = amount < minBet;
  const isAboveMax = amount > maxBet;
  const hasError = isInsufficient || isBelowMin || isAboveMax;

  // Calculate potential payout preview if multiplier provided
  let numericMultiplier = 2.0;
  if (typeof multiplierPreview === "number") {
    numericMultiplier = multiplierPreview;
  } else if (typeof multiplierPreview === "string") {
    const parsed = parseFloat(multiplierPreview);
    if (!isNaN(parsed)) numericMultiplier = parsed;
  }
  const potentialReward = (amount * numericMultiplier).toFixed(2);

  const handleActionClick = () => {
    if (hasError || disabled) return;
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmAndProceed = () => {
    setShowConfirmModal(false);
    if (onConfirmBet) {
      onConfirmBet();
    }
  };

  return (
    <div className="w-full bg-[#131823] border border-[#2a3447] rounded-2xl p-3.5 space-y-3 shadow-lg">
      {/* Top row: Balance and Limits */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#94a3b8]">
          <span className="material-symbols-outlined text-[15px] text-[#f59e0b]">account_balance_wallet</span>
          <span>Available:</span>
          <span className="font-mono font-bold text-white">
            {availableBalance.toLocaleString()} {tokenSymbol}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#64748b]">
          Limits: {minBet} - {maxBet} {tokenSymbol}
        </div>
      </div>

      {/* Main Controls: [-] [Input] [+] */}
      <div className="flex items-center gap-2">
        {/* Decrease Button */}
        <button
          type="button"
          onClick={handleDecrease}
          disabled={disabled || amount <= minBet}
          aria-label="Decrease bet"
          className="w-12 h-12 rounded-xl bg-[#1e2738] border border-[#334155] hover:border-[#10b981] hover:bg-[#26334a] active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-white transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[24px] font-bold text-[#10b981]">remove</span>
        </button>

        {/* Amount Input with Symbol */}
        <div className="relative flex-1">
          <input
            type="number"
            value={amount}
            onChange={handleManualChange}
            disabled={disabled}
            min={minBet}
            max={Math.min(maxBet, availableBalance)}
            step={step}
            className={`w-full h-12 bg-[#0a0e17] border ${
              hasError
                ? "border-[#ef4444] text-[#ef4444]"
                : "border-[#334155] text-white focus:border-[#10b981]"
            } rounded-xl px-4 text-center font-mono text-lg font-extrabold focus:outline-none transition-colors`}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#94a3b8] pointer-events-none">
            {tokenSymbol}
          </span>
        </div>

        {/* Increase Button */}
        <button
          type="button"
          onClick={handleIncrease}
          disabled={disabled || amount >= Math.min(maxBet, availableBalance)}
          aria-label="Increase bet"
          className="w-12 h-12 rounded-xl bg-[#1e2738] border border-[#334155] hover:border-[#10b981] hover:bg-[#26334a] active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-white transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[24px] font-bold text-[#10b981]">add</span>
        </button>
      </div>

      {/* Quick Chips Preset Row */}
      <div className="grid grid-cols-6 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => setPreset("min")}
          disabled={disabled}
          className="py-1 px-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono font-semibold text-[#94a3b8] hover:text-white border border-[#334155]/60 transition-colors"
        >
          Min
        </button>
        <button
          type="button"
          onClick={() => setPreset(25)}
          disabled={disabled}
          className="py-1 px-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono font-semibold text-[#94a3b8] hover:text-white border border-[#334155]/60 transition-colors"
        >
          25
        </button>
        <button
          type="button"
          onClick={() => setPreset(50)}
          disabled={disabled}
          className="py-1 px-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono font-semibold text-[#94a3b8] hover:text-white border border-[#334155]/60 transition-colors"
        >
          50
        </button>
        <button
          type="button"
          onClick={() => setPreset(100)}
          disabled={disabled}
          className="py-1 px-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono font-semibold text-[#94a3b8] hover:text-white border border-[#334155]/60 transition-colors"
        >
          100
        </button>
        <button
          type="button"
          onClick={() => setPreset("double")}
          disabled={disabled}
          className="py-1 px-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono font-semibold text-[#38bdf8] border border-[#0284c7]/40 transition-colors"
        >
          2X
        </button>
        <button
          type="button"
          onClick={() => setPreset("max")}
          disabled={disabled}
          className="py-1 px-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono font-bold text-[#f59e0b] border border-[#d97706]/40 transition-colors"
        >
          Max
        </button>
      </div>

      {/* Error warning or Potential Payout summary */}
      {isInsufficient && (
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-xs font-mono">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          <span>Insufficient balance! Maximum you can bet is {availableBalance.toLocaleString()} {tokenSymbol}.</span>
        </div>
      )}

      {isBelowMin && (
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-mono">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>Minimum bet is {minBet} {tokenSymbol}.</span>
        </div>
      )}

      {!hasError && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#0a0e17]/60 border border-[#2a3447]/60 text-xs">
          <span className="text-[#94a3b8] flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[15px] text-[#10b981]">trending_up</span>
            Est. Potential Reward:
          </span>
          <span className="font-mono font-extrabold text-[#10b981] flex items-center gap-1">
            <span>+{potentialReward}</span>
            <span className="text-[10px] text-[#94a3b8]">{tokenSymbol}</span>
            {multiplierPreview && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] font-bold">
                ({typeof multiplierPreview === "number" ? `${multiplierPreview}x` : multiplierPreview})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Action Button (if requested directly) */}
      {actionButtonText && (
        <button
          type="button"
          onClick={handleActionClick}
          disabled={hasError || disabled}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">{actionButtonIcon}</span>
          <span>{actionButtonText}</span>
        </button>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#131823] border border-[#334155] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10b981] text-[22px]">verified</span>
                <h3 className="font-bold text-white text-base">Confirm Stake</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-[#94a3b8] hover:text-white rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94a3b8]">Bet Amount:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {amount} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#94a3b8]">Reward Multiplier:</span>
                <span className="font-mono font-bold text-[#38bdf8]">
                  {typeof multiplierPreview === "number" ? `${multiplierPreview}x` : multiplierPreview || "Variable"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-[#334155]/40">
                <span className="text-[#94a3b8]">Est. Max Return:</span>
                <span className="font-mono font-bold text-[#10b981] text-sm">
                  +{potentialReward} {tokenSymbol}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748b] leading-relaxed">
              Virtual sandbox tokens are deducted instantly upon round initiation. Ensure you are satisfied with this stake.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndProceed}
                className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-xs font-bold text-white shadow-md transition-colors"
              >
                Confirm & Play
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
