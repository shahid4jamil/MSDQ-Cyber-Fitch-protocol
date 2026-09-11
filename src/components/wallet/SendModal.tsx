import React, { useState } from "react";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  fee?: number;
  onSend: (recipientAddress: string, amount: number) => Promise<{ success: boolean; error?: string }>;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  availableBalance,
  fee = 0.10,
  onSend,
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const totalWithFee = numAmount + fee;
  const isValidAmount = numAmount > 0 && totalWithFee <= availableBalance;
  const isValidAddress = recipient.trim().length >= 8;

  const handleOpenConfirm = () => {
    setErrorMsg(null);
    if (!recipient.trim()) {
      setErrorMsg("Please provide a recipient MSDQ wallet address.");
      return;
    }
    if (!recipient.trim().toUpperCase().startsWith("MSDQ") && !recipient.trim().startsWith("0x")) {
      setErrorMsg("Recipient address must begin with 'MSDQ' or standard '0x' protocol prefix.");
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg("Amount must be greater than 0.");
      return;
    }
    if (totalWithFee > availableBalance) {
      setErrorMsg(`Insufficient balance for transfer + ${fee.toFixed(2)} MSDQ gas fee. Available: ${availableBalance.toLocaleString()} MSDQ.`);
      return;
    }
    setShowConfirm(true);
  };

  const handleExecuteSend = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await onSend(recipient.trim(), numAmount);
    setIsSubmitting(false);

    if (result.success) {
      setShowConfirm(false);
      setSuccessMsg(`Successfully sent ${numAmount} MSDQ to ${recipient.slice(0, 10)}...!`);
      setTimeout(() => {
        setSuccessMsg(null);
        setRecipient("");
        setAmount("");
        onClose();
      }, 1800);
    } else {
      setErrorMsg(result.error || "Transfer failed. Please check network logs.");
      setShowConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#0f131c] border border-[#2a3447] rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38bdf8] text-[24px]">send</span>
            <h2 className="text-lg font-bold text-white">Send MSDQ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1e2738] text-[#94a3b8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Available Balance Status */}
        <div className="p-3 rounded-2xl bg-[#131823] border border-[#2a3447] flex items-center justify-between">
          <span className="text-xs text-[#94a3b8]">Available Balance:</span>
          <span className="font-mono text-sm font-bold text-[#10b981]">
            {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MSDQ
          </span>
        </div>

        {/* Recipient Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#dfe2ee]">Recipient MSDQ Address</label>
          <div className="relative">
            <input
              type="text"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="e.g. MSDQ7X8K2P9A4M6..."
              className="w-full h-12 bg-[#0a0e17] border border-[#334155] focus:border-[#38bdf8] rounded-2xl px-4 text-xs font-mono text-white focus:outline-none transition-colors"
            />
          </div>
          <span className="text-[10px] text-[#64748b]">
            Must be a valid sovereign MSDQ address starting with MSDQ.
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[#dfe2ee]">Transfer Amount</span>
            <button
              type="button"
              onClick={() => setAmount(availableBalance.toString())}
              className="font-mono text-[11px] font-bold text-[#38bdf8] hover:underline"
            >
              MAX
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrorMsg(null);
              }}
              min="0.01"
              max={availableBalance}
              step="0.1"
              placeholder="0.00"
              className="w-full h-12 bg-[#0a0e17] border border-[#334155] focus:border-[#38bdf8] rounded-2xl px-4 font-mono text-lg font-bold text-white focus:outline-none transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#94a3b8]">
              MSDQ
            </span>
          </div>
        </div>

        {/* Network Gas Fee Banner */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447]/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#38bdf8]">local_gas_station</span>
            <span className="text-[#94a3b8]">Consensus Gas Fee:</span>
          </div>
          <span className="font-mono font-bold text-[#38bdf8]">{fee.toFixed(2)} MSDQ</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={!isValidAddress || !isValidAmount || isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#38bdf8] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white font-extrabold text-sm tracking-wide shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          <span>Review Transfer</span>
        </button>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#131823] border border-[#334155] rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#334155]/60 text-white font-bold">
                <span className="material-symbols-outlined text-[#38bdf8]">security</span>
                <span>Confirm P2P Transfer</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Recipient:</span>
                  <span className="font-mono text-white text-[11px] break-all max-w-[180px]">
                    {recipient}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Send Amount:</span>
                  <span className="font-mono font-bold text-[#38bdf8] text-sm">
                    {numAmount.toFixed(2)} MSDQ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Gas Network Fee:</span>
                  <span className="font-mono text-[#94a3b8]">{fee.toFixed(2)} MSDQ</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#334155]/40 font-bold">
                  <span className="text-white">Total Deducted:</span>
                  <span className="font-mono text-white text-sm">
                    {totalWithFee.toFixed(2)} MSDQ
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-[#94a3b8]">Remaining Balance:</span>
                  <span className="font-mono text-[#10b981]">
                    {(availableBalance - totalWithFee).toFixed(2)} MSDQ
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#64748b] leading-relaxed">
                Transfers on the MSDQ Protocol are irreversible. Please ensure the recipient address is accurate.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSend}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0284c7] text-xs font-bold text-white shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <span>Confirm & Send</span>
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
