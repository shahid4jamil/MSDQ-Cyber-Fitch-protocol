import React, { useState, useEffect } from "react";

// 1. Quick Send Modal
interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string, amount: number, fee: number) => void;
  currentBalance: number;
  senderAddress?: string;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  onSend,
  currentBalance,
  senderAddress = "MSDQ8K4X92AB7P",
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"INPUT" | "CONFIRM">("INPUT");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fee = 0.10; // Consensus validator network fee
  const numAmount = parseFloat(amount) || 0;
  const totalDeducted = numAmount + fee;
  const remainingBalance = Math.max(0, currentBalance - totalDeducted);

  useEffect(() => {
    if (isOpen) {
      setStep("INPUT");
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        setRecipient(text.trim());
        setErrorMsg(null);
      }
    } catch {}
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanRecipient = recipient.trim().toUpperCase();
    if (!cleanRecipient) {
      setErrorMsg("Please enter recipient's MSDQ wallet address.");
      return;
    }

    if (cleanRecipient === senderAddress.toUpperCase()) {
      setErrorMsg("Cannot transfer MSDQ to your own address.");
      return;
    }

    if (numAmount <= 0 || isNaN(numAmount)) {
      setErrorMsg("Please specify an amount greater than zero.");
      return;
    }

    if (totalDeducted > currentBalance) {
      setErrorMsg(
        `Insufficient balance. You need ${totalDeducted.toFixed(2)} MSDQ (including ${fee} MSDQ fee), but only have ${currentBalance.toFixed(2)} MSDQ.`
      );
      return;
    }

    setStep("CONFIRM");
  };

  const handleExecuteTransfer = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    setTimeout(() => {
      onSend(recipient.trim().toUpperCase(), numAmount, fee);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#0f141f] border border-[#2a3447] p-5 font-mono shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <span className="material-symbols-outlined text-[16px]">send</span>
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {step === "INPUT" ? "P2P Sovereign Transfer" : "Confirm MSDQ Transfer"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1e2738] hover:bg-[#28354c] text-[#94a3b8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-xs flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: INPUT FORM */}
        {step === "INPUT" ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8] uppercase mb-1">
                <span>Receiver MSDQ Address</span>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="text-[#38bdf8] hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[12px]">content_paste</span>
                  <span>Paste</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. MSDQ8K4X92AB7P"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-xs text-white uppercase tracking-wider focus:border-[#10b981] focus:outline-none placeholder-[#475569]"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mb-1">
                <span className="uppercase">Amount (MSDQ)</span>
                <span>
                  Available: <strong className="text-white">{currentBalance.toFixed(2)} MSDQ</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-xs text-white focus:border-[#10b981] focus:outline-none placeholder-[#475569]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(Math.max(0, currentBalance - fee).toFixed(2))}
                  className="absolute right-2 top-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#1e2738] hover:bg-[#28354c] text-[#10b981] transition-colors"
                >
                  MAX
                </button>
              </div>

              {/* Quick Percentages */}
              <div className="flex items-center gap-1.5 mt-2">
                {[0.25, 0.5, 0.75].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAmount(((currentBalance - fee) * pct).toFixed(2))}
                    className="flex-1 py-1 rounded-lg bg-[#1e2738] hover:bg-[#28354c] text-[10px] font-bold text-[#94a3b8] hover:text-white transition-colors"
                  >
                    {pct * 100}%
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447] text-[11px] text-[#94a3b8] space-y-1.5">
              <div className="flex justify-between">
                <span>Network Protocol:</span>
                <span className="text-white font-bold">MSDQ Native Consensus Rail</span>
              </div>
              <div className="flex justify-between">
                <span>Consensus Gas Fee:</span>
                <span className="text-[#10b981] font-bold">{fee.toFixed(2)} MSDQ</span>
              </div>
              <div className="flex justify-between border-t border-[#2a3447]/60 pt-1 text-white font-bold">
                <span>Total Deducted:</span>
                <span>{totalDeducted.toFixed(2)} MSDQ</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-[#0f141f] font-black text-xs hover:brightness-110 shadow-lg shadow-[#10b981]/20 transition-all cursor-pointer"
            >
              Continue to Confirmation
            </button>
          </form>
        ) : (
          /* STEP 2: CONFIRMATION VIEW */
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2.5">
              <div className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
                Review Transaction Details
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Receiver Address:</span>
                <span className="font-bold text-[#38bdf8] text-[11px] truncate max-w-[200px]">
                  {recipient.trim().toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Transfer Amount:</span>
                <span className="font-black text-white text-sm">
                  {numAmount.toFixed(2)} MSDQ
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Network Gas Fee:</span>
                <span className="font-bold text-[#10b981]">{fee.toFixed(2)} MSDQ</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Total Amount:</span>
                <span className="font-black text-white">{totalDeducted.toFixed(2)} MSDQ</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#94a3b8]">Remaining Balance:</span>
                <span className="font-bold text-[#94a3b8]">{remainingBalance.toFixed(2)} MSDQ</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep("INPUT")}
                className="w-1/3 py-3 rounded-2xl bg-[#1e2738] hover:bg-[#28354c] text-[#94a3b8] hover:text-white font-bold transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteTransfer}
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-[#0f141f] font-black shadow-lg shadow-[#10b981]/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#0f141f] border-t-transparent rounded-full animate-spin"></span>
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    <span>Confirm &amp; Send MSDQ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Receive QR Modal
interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  walletAddress = "MSDQ8K4X92AB7P",
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My MSDQ Network Sovereign Address",
          text: `Send MSDQ to my sovereign wallet address: ${walletAddress}`,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#0f141f] border border-[#2a3447] p-5 font-mono shadow-2xl text-center space-y-4 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3447]/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Receive MSDQ Protocol Assets
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1e2738] hover:bg-[#28354c] text-[#94a3b8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* QR Code Frame */}
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white mx-auto my-2 w-48 h-48 shadow-xl shadow-white/5 border-4 border-[#38bdf8]/30">
          <svg className="w-40 h-40" viewBox="0 0 100 100" fill="currentColor">
            <rect width="100" height="100" fill="#ffffff" />
            <path
              d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z M45,15 h10 v10 h-10 z M45,35 h10 v10 h-10 z M15,45 h10 v10 h-10 z M35,45 h10 v10 h-10 z M55,45 h10 v10 h-10 z M75,45 h10 v10 h-10 z M45,65 h10 v10 h-10 z M65,65 h10 v10 h-10 z M75,75 h15 v15 h-15 z M50,80 h10 v10 h-10 z"
              fill="#0f141f"
            />
          </svg>
        </div>

        {/* Unique Wallet Address Box */}
        <div className="space-y-1 text-left bg-[#0a0e17] p-3 rounded-2xl border border-[#2a3447]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
            Unique Permanent MSDQ Address
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-white tracking-wider break-all">
              {walletAddress}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="py-3 rounded-2xl bg-[#10b981] text-[#0f141f] font-black text-xs hover:brightness-110 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-[#10b981]/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copied!" : "Copy Address"}</span>
          </button>

          <button
            onClick={handleShare}
            className="py-3 rounded-2xl bg-[#1e2738] hover:bg-[#28354c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            <span>Share</span>
          </button>
        </div>

        <p className="text-[10px] text-[#64748b]">
          Only send MSDQ tokens to this sovereign address on the MSDQ Network consensus rail.
        </p>
      </div>
    </div>
  );
};

// 3. Sponsored Stream Ad Video Simulation Modal
interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: (amount: number) => void;
}

export const AdModal: React.FC<AdModalProps> = ({
  isOpen,
  onClose,
  onRewardEarned,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(5);
      setCanClaim(false);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
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

  const handleClaimReward = () => {
    onRewardEarned(5.0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f131c] border border-[#4cd7f6]/50 p-5 font-mono shadow-2xl text-center overflow-hidden">
        {/* Ad Video Simulation Frame */}
        <div className="relative h-60 rounded-2xl bg-gradient-to-br from-[#1c2028] via-[#12161f] to-[#0a0e16] border border-[#3c4a42]/60 overflow-hidden flex flex-col items-center justify-center p-4">
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#4cd7f6]/20 text-[#4cd7f6] text-[9px] font-bold border border-[#4cd7f6]/40">
            AdMob Verified Stream
          </div>

          <div className="w-14 h-14 rounded-2xl bg-[#4cd7f6]/15 border border-[#4cd7f6]/40 text-[#4cd7f6] flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-[32px]">smart_display</span>
          </div>

          <div className="text-xs font-bold text-[#dfe2ee] mt-3">
            Sponsor Mesh: CyberVPN Decentralized
          </div>
          <p className="text-[10px] text-[#bbcabf] max-w-[200px] mt-1">
            Stream relay consensus proof running...
          </p>

          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-[#4edea3]">
            {canClaim ? "✓ Stream Completed" : `Reward in ${secondsLeft}s`}
          </div>
        </div>

        <div className="mt-4">
          {canClaim ? (
            <button
              onClick={handleClaimReward}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#003824] font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(78,222,163,0.3)] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Claim +5.00 MSDQ Reward
            </button>
          ) : (
            <div className="py-3 text-xs text-[#bbcabf]">
              Viewing sponsored stream ({secondsLeft}s)...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Boost Hashrate Modal
interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBoost: () => void;
}

export const BoostModal: React.FC<BoostModalProps> = ({
  isOpen,
  onClose,
  onApplyBoost,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#181c24] border border-[#4edea3]/50 p-5 font-mono shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
          <span className="text-xs font-bold text-[#4edea3] uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            Protocol Hash Surge
          </span>
          <button onClick={onClose} className="text-[#bbcabf] hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="mt-3 text-xs text-[#bbcabf] leading-relaxed">
          Activate hardware overclocking and decentralized peer relays to increase your node mining velocity by <span className="text-[#4edea3] font-bold">+0.50 MSDQ/hr</span> for the next 24 hours.
        </div>

        <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 my-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span>Base Velocity:</span>
            <span className="text-[#dfe2ee]">1.00 MSDQ/h</span>
          </div>
          <div className="flex justify-between text-[#4edea3]">
            <span>Hardware Surge:</span>
            <span>+0.50 MSDQ/h</span>
          </div>
          <div className="flex justify-between font-bold border-t border-[#3c4a42]/40 pt-1 text-[#dfe2ee]">
            <span>Net Hash Velocity:</span>
            <span className="text-[#4edea3]">1.50 MSDQ/h</span>
          </div>
        </div>

        <button
          onClick={() => {
            onApplyBoost();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-[#4edea3] text-[#003824] font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(78,222,163,0.3)]"
        >
          Engage +0.50 MH/s Surge
        </button>
      </div>
    </div>
  );
};
