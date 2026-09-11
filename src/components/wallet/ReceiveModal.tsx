import React, { useState } from "react";
import { QrCodeSvg } from "../common/QrCodeSvg";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  minerId?: string;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  minerId = "#8842",
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#0f131c] border border-[#2a3447] rounded-3xl p-6 shadow-2xl space-y-5 text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#10b981] text-[24px]">qr_code_2</span>
            <h2 className="text-lg font-bold text-white text-left">Receive MSDQ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1e2738] text-[#94a3b8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* QR Code visual container */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="p-3 bg-white rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.15)] inline-block">
            <QrCodeSvg value={walletAddress} size={180} />
          </div>
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span>Verified Sovereign Node {minerId}</span>
          </div>
        </div>

        {/* Address Display and Copy */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-[#94a3b8]">Your Permanent Unique MSDQ Address</label>
          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#131823] border border-[#2a3447]">
            <span className="font-mono text-xs text-white break-all font-semibold select-all">
              {walletAddress}
            </span>
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded-xl font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                copied
                  ? "bg-[#10b981] text-white"
                  : "bg-[#1e2738] hover:bg-[#2a374f] text-[#38bdf8] border border-[#38bdf8]/40"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Network guidance notice */}
        <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447]/60 text-[11px] text-[#64748b] leading-relaxed text-left flex items-start gap-2">
          <span className="material-symbols-outlined text-[#f59e0b] text-[18px] shrink-0 mt-0.5">info</span>
          <span>
            Only transfer native <strong className="text-white">MSDQ Network tokens</strong> to this address. Transfers arrive with instant finality upon validator quorum confirmation.
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-white font-semibold text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
