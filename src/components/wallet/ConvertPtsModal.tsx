import React, { useState } from "react";
import { ConversionRecord } from "../../types";

interface ConvertPtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ptsBalance: number;
  msdqBalance: number;
  conversionRate: number; // e.g. 100 means 100 PTS = 1 MSDQ
  conversionHistory: ConversionRecord[];
  onConvert: (ptsAmount: number, msdqAmount: number) => Promise<{ success: boolean; error?: string }>;
}

export const ConvertPtsModal: React.FC<ConvertPtsModalProps> = ({
  isOpen,
  onClose,
  ptsBalance,
  msdqBalance,
  conversionRate,
  conversionHistory,
  onConvert,
}) => {
  const [inputPts, setInputPts] = useState<string>("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numPts = parseFloat(inputPts) || 0;
  const rate = conversionRate > 0 ? conversionRate : 100;
  const calculatedMsdq = (numPts / rate).toFixed(4);

  const isValidAmount = numPts >= rate && numPts <= ptsBalance;

  const handleQuickPercent = (pct: number) => {
    const raw = Math.floor((ptsBalance * pct) / 100);
    // Round to multiple of rate if possible
    const rounded = Math.max(rate, Math.floor(raw / rate) * rate);
    setInputPts(rounded.toString());
    setErrorMsg(null);
  };

  const handleOpenConfirm = () => {
    if (numPts < rate) {
      setErrorMsg(`Minimum conversion amount is ${rate} PTS (= 1 MSDQ).`);
      return;
    }
    if (numPts > ptsBalance) {
      setErrorMsg(`Insufficient PTS balance. You only have ${ptsBalance} PTS.`);
      return;
    }
    setErrorMsg(null);
    setShowConfirm(true);
  };

  const handleExecuteConvert = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const msdqValue = parseFloat(calculatedMsdq);
    const result = await onConvert(numPts, msdqValue);

    setIsSubmitting(false);
    if (result.success) {
      setShowConfirm(false);
      setSuccessMsg(`Successfully converted ${numPts} PTS into ${msdqValue} MSDQ!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1800);
    } else {
      setErrorMsg(result.error || "Conversion failed. Please verify balances.");
      setShowConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0f131c] border border-[#2a3447] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#10b981]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
              <span className="material-symbols-outlined text-[24px]">currency_exchange</span>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Convert PTS to MSDQ</h2>
              <p className="text-xs text-[#94a3b8]">Ecosystem Multi-Ledger Settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1e2738] text-[#94a3b8] hover:text-white hover:bg-[#2a374f] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Balance Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-[#131823] border border-[#2a3447]">
            <span className="text-[11px] text-[#94a3b8] font-medium block">Available PTS Balance</span>
            <span className="text-lg font-mono font-bold text-[#f59e0b] block mt-0.5">
              {ptsBalance.toLocaleString()} <span className="text-xs text-[#94a3b8]">PTS</span>
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-[#131823] border border-[#2a3447]">
            <span className="text-[11px] text-[#94a3b8] font-medium block">Available MSDQ Balance</span>
            <span className="text-lg font-mono font-bold text-[#10b981] block mt-0.5">
              {msdqBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-xs text-[#94a3b8]">MSDQ</span>
            </span>
          </div>
        </div>

        {/* Official Exchange Rate Banner */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#f59e0b]/10 via-[#131823] to-[#10b981]/10 border border-[#f59e0b]/30">
          <div className="flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[18px] text-[#f59e0b]">swap_horizontal_circle</span>
            <span className="text-[#dfe2ee] font-medium">Protocol Official Rate:</span>
          </div>
          <span className="font-mono text-xs font-extrabold text-white">
            <span className="text-[#f59e0b]">{rate} PTS</span> = <span className="text-[#10b981]">1.00 MSDQ</span>
          </span>
        </div>

        {/* Input Form */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#dfe2ee] flex justify-between">
            <span>Amount to Convert (PTS)</span>
            <span className="text-[#94a3b8]">Min: {rate} PTS</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={inputPts}
              onChange={(e) => {
                setInputPts(e.target.value);
                setErrorMsg(null);
              }}
              min={rate}
              max={ptsBalance}
              step={rate}
              placeholder={`e.g. ${rate}`}
              className="w-full h-13 bg-[#0a0e17] border border-[#334155] focus:border-[#f59e0b] rounded-2xl px-4 text-left font-mono text-lg font-extrabold text-white focus:outline-none transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#f59e0b]">
              PTS
            </span>
          </div>

          {/* Quick percentages */}
          <div className="flex items-center gap-2 pt-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="flex-1 py-1.5 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-xs font-mono font-semibold text-[#94a3b8] hover:text-white border border-[#334155]/60 transition-colors"
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Output Calculation Preview */}
        <div className="p-4 rounded-2xl bg-[#0a0e17] border border-[#10b981]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#10b981]">download_for_offline</span>
            <div>
              <span className="text-xs text-[#94a3b8] block">You will receive</span>
              <span className="text-xs text-[#64748b]">Instant Sovereign Settlement</span>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xl font-black text-[#10b981] block">+{calculatedMsdq}</span>
            <span className="text-[11px] font-bold text-[#94a3b8]">MSDQ Tokens</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={!isValidAmount || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f59e0b] via-[#10b981] to-[#059669] hover:opacity-90 active:scale-[0.99] text-white font-extrabold text-sm tracking-wide shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">autorenew</span>
          <span>Review Conversion</span>
        </button>

        {/* Conversion History Section */}
        <div className="pt-3 border-t border-[#2a3447]/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#38bdf8]">history</span>
              Conversion History
            </h4>
            <span className="text-[11px] text-[#64748b] font-mono">{conversionHistory.length} records</span>
          </div>

          {conversionHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#64748b] bg-[#131823]/40 rounded-2xl border border-dashed border-[#2a3447]">
              No previous conversions found.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {conversionHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-[#131823] border border-[#2a3447]/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#f59e0b]">-{rec.ptsUsed} PTS</span>
                      <span className="material-symbols-outlined text-[14px] text-[#64748b]">arrow_forward</span>
                      <span className="font-mono font-bold text-[#10b981]">+{rec.msdqReceived} MSDQ</span>
                    </div>
                    <div className="text-[10px] text-[#64748b] font-mono mt-0.5">
                      TX: {rec.txId} • {rec.date}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                    SETTLED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#131823] border border-[#334155] rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/60 text-white font-bold">
                <span className="material-symbols-outlined text-[#f59e0b]">verified_user</span>
                <span>Confirm PTS Conversion</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">PTS to Deduct:</span>
                  <span className="font-mono font-bold text-[#f59e0b]">-{numPts} PTS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Conversion Rate:</span>
                  <span className="font-mono text-white">{rate} PTS = 1 MSDQ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Protocol Fee:</span>
                  <span className="font-mono text-[#10b981]">0.00 MSDQ (Zero Gas)</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#334155]/40 font-bold">
                  <span className="text-white">MSDQ to Credit:</span>
                  <span className="font-mono text-[#10b981] text-sm">+{calculatedMsdq} MSDQ</span>
                </div>
              </div>

              <p className="text-[11px] text-[#64748b] leading-relaxed">
                This transaction will deduct {numPts} PTS from your Game Vault and credit {calculatedMsdq} MSDQ directly to your Consensus Vault.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConvert}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-xs font-bold text-white shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Conversion</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
