import React, { useState } from "react";
import { Transaction } from "../../types";

interface PtsMsdqConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ptsBalance: number;
  msdqBalance: number;
  ptsToMsdqRate: number; // e.g. 100 PTS = 1 MSDQ -> 100
  msdqToPtsRate: number; // e.g. 1 MSDQ = 90 PTS -> 90
  onConvertSuccess: (
    convertedFrom: "PTS" | "MSDQ",
    fromAmount: number,
    toAmount: number,
    tx: Transaction
  ) => void;
}

export const PtsMsdqConvertModal: React.FC<PtsMsdqConvertModalProps> = ({
  isOpen,
  onClose,
  ptsBalance,
  msdqBalance,
  ptsToMsdqRate = 100,
  msdqToPtsRate = 90,
  onConvertSuccess,
}) => {
  const [direction, setDirection] = useState<"PTS_TO_MSDQ" | "MSDQ_TO_PTS">("PTS_TO_MSDQ");
  const [inputAmount, setInputAmount] = useState<string>("");
  const [step, setStep] = useState<"INPUT" | "CONFIRM">("INPUT");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numInput = parseFloat(inputAmount) || 0;

  // Rate calculations
  // Mode 1: PTS -> MSDQ: input PTS / ptsToMsdqRate = MSDQ
  const msdqYield = direction === "PTS_TO_MSDQ" ? numInput / Math.max(1, ptsToMsdqRate) : 0;

  // Mode 2: MSDQ -> PTS: input MSDQ * msdqToPtsRate = PTS
  const ptsYield = direction === "MSDQ_TO_PTS" ? numInput * msdqToPtsRate : 0;

  const handleQuickPercent = (pct: number) => {
    if (direction === "PTS_TO_MSDQ") {
      const val = Math.floor(ptsBalance * pct);
      setInputAmount(val.toString());
    } else {
      const val = (msdqBalance * pct).toFixed(2);
      setInputAmount(val.toString());
    }
    setErrorMsg(null);
  };

  const validateAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numInput <= 0 || isNaN(numInput)) {
      setErrorMsg("Please enter a valid amount greater than zero.");
      return;
    }

    if (direction === "PTS_TO_MSDQ") {
      if (numInput > ptsBalance) {
        setErrorMsg(`Insufficient PTS balance. Available: ${ptsBalance.toLocaleString()} PTS.`);
        return;
      }
      if (numInput < 10) {
        setErrorMsg("Minimum conversion threshold is 10 PTS.");
        return;
      }
    } else {
      if (numInput > msdqBalance) {
        setErrorMsg(`Insufficient MSDQ balance. Available: ${msdqBalance.toFixed(2)} MSDQ.`);
        return;
      }
      if (numInput < 0.1) {
        setErrorMsg("Minimum conversion threshold is 0.1 MSDQ.");
        return;
      }
    }

    setStep("CONFIRM");
  };

  const handleExecuteConversion = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    setTimeout(() => {
      const txHash = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (direction === "PTS_TO_MSDQ") {
        const receivedMsdq = parseFloat(msdqYield.toFixed(4));
        const newTx: Transaction = {
          id: `conv-pts-${Date.now()}`,
          type: "conversion",
          amount: receivedMsdq,
          usdValue: receivedMsdq * 1.5,
          timestamp,
          status: "confirmed",
          txHash,
          note: `PTS → MSDQ Swapped ${numInput} PTS for +${receivedMsdq} MSDQ`,
          ptsAmount: numInput,
          conversionRate: ptsToMsdqRate,
        };
        onConvertSuccess("PTS", numInput, receivedMsdq, newTx);
      } else {
        const receivedPts = Math.floor(ptsYield);
        const newTx: Transaction = {
          id: `conv-msdq-${Date.now()}`,
          type: "conversion",
          amount: -numInput,
          usdValue: numInput * 1.5,
          timestamp,
          status: "confirmed",
          txHash,
          note: `MSDQ → PTS Swapped ${numInput} MSDQ for +${receivedPts} PTS`,
          ptsAmount: receivedPts,
          conversionRate: msdqToPtsRate,
        };
        onConvertSuccess("MSDQ", numInput, receivedPts, newTx);
      }

      setIsProcessing(false);
      onClose();
    }, 800);
  };

  return (
    <div
      id="msdq-convert-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-[#0f141f] border border-[#2a3447] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[#94a3b8] hover:text-white transition-colors"
          title="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#10b981] via-[#0284c7] to-[#8b5cf6] flex items-center justify-center text-white shadow-lg shadow-[#10b981]/20">
            <span className="material-symbols-outlined text-[24px]">swap_horiz</span>
          </div>
          <div>
            <h2 className="text-lg font-mono font-black text-white tracking-tight">
              Ecosystem Token Swap
            </h2>
            <p className="text-xs font-mono text-[#94a3b8]">
              PTS Points &harr; Protocol MSDQ Dual Bridge
            </p>
          </div>
        </div>

        {/* Direction Switcher Tabs */}
        {step === "INPUT" && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0a0e17] border border-[#2a3447]">
            <button
              type="button"
              onClick={() => {
                setDirection("PTS_TO_MSDQ");
                setInputAmount("");
                setErrorMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                direction === "PTS_TO_MSDQ"
                  ? "bg-[#10b981] text-[#0f141f] shadow-md shadow-[#10b981]/20"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <span>PTS &rarr; MSDQ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection("MSDQ_TO_PTS");
                setInputAmount("");
                setErrorMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                direction === "MSDQ_TO_PTS"
                  ? "bg-[#38bdf8] text-[#0f141f] shadow-md shadow-[#38bdf8]/20"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <span>MSDQ &rarr; PTS</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: INPUT FORM */}
        {step === "INPUT" ? (
          <form onSubmit={validateAndProceed} className="space-y-4 font-mono text-xs">
            {/* From Token Capsule */}
            <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2">
              <div className="flex items-center justify-between text-[#94a3b8]">
                <span>You Convert</span>
                <span>
                  Available:{" "}
                  <strong className="text-white">
                    {direction === "PTS_TO_MSDQ"
                      ? `${ptsBalance.toLocaleString()} PTS`
                      : `${msdqBalance.toFixed(2)} MSDQ`}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={direction === "PTS_TO_MSDQ" ? "1" : "0.01"}
                  min="0"
                  required
                  value={inputAmount}
                  onChange={(e) => {
                    setInputAmount(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-xl sm:text-2xl font-black text-white placeholder-[#334155] focus:outline-none"
                />
                <span className="px-3 py-1.5 rounded-xl bg-[#1e2738] border border-[#2a3447] text-sm font-bold text-[#10b981]">
                  {direction === "PTS_TO_MSDQ" ? "PTS" : "MSDQ"}
                </span>
              </div>

              {/* Quick Percent Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[0.25, 0.5, 0.75, 1.0].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleQuickPercent(p)}
                    className="flex-1 py-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-bold text-[#94a3b8] hover:text-white transition-colors"
                  >
                    {p === 1.0 ? "MAX" : `${p * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Exchange Rate Badge */}
            <div className="p-3 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8] text-[11px]">Consensus Exchange Rate</span>
                <span className="text-[#10b981] font-bold text-[11px]">
                  {direction === "PTS_TO_MSDQ"
                    ? `${ptsToMsdqRate} PTS = 1.00 MSDQ`
                    : `1.00 MSDQ = ${msdqToPtsRate} PTS`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#94a3b8]">You Will Receive</span>
                <span className="text-white font-black text-sm">
                  {direction === "PTS_TO_MSDQ"
                    ? `≈ ${msdqYield.toFixed(4)} MSDQ`
                    : `≈ ${Math.floor(ptsYield).toLocaleString()} PTS`}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10b981] via-[#059669] to-[#0284c7] text-[#0f141f] font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer"
            >
              Review &amp; Confirm Conversion
            </button>
          </form>
        ) : (
          /* STEP 2: CONFIRMATION VIEW */
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-3">
              <div className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
                Transaction Preview
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Converting</span>
                <span className="font-bold text-white">
                  {numInput.toLocaleString()}{" "}
                  {direction === "PTS_TO_MSDQ" ? "PTS" : "MSDQ"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Configured Rate</span>
                <span className="text-[#38bdf8] font-bold">
                  {direction === "PTS_TO_MSDQ"
                    ? `${ptsToMsdqRate} PTS / MSDQ`
                    : `${msdqToPtsRate} PTS / MSDQ`}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Receiving</span>
                <span className="text-base font-black text-[#10b981]">
                  {direction === "PTS_TO_MSDQ"
                    ? `+${msdqYield.toFixed(4)} MSDQ`
                    : `+${Math.floor(ptsYield).toLocaleString()} PTS`}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#94a3b8]">Remaining Balance</span>
                <span className="font-bold text-[#94a3b8]">
                  {direction === "PTS_TO_MSDQ"
                    ? `${(ptsBalance - numInput).toLocaleString()} PTS`
                    : `${(msdqBalance - numInput).toFixed(2)} MSDQ`}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setStep("INPUT")}
                className="w-1/3 py-3 rounded-2xl bg-[#1e2738] hover:bg-[#28354c] text-[#94a3b8] hover:text-white font-bold transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteConversion}
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-[#0f141f] font-black shadow-lg shadow-[#10b981]/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#0f141f] border-t-transparent rounded-full animate-spin"></span>
                    <span>Minting on Ledger...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Confirm Swap</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 text-center border-t border-[#2a3447]/60">
          <span className="text-[10px] font-mono text-[#64748b]">
            Conversion rates are governed by decentralized admin telemetry.
          </span>
        </div>
      </div>
    </div>
  );
};
