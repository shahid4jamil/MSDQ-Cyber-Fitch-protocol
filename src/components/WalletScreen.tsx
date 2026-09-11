import React, { useState } from "react";
import { Transaction } from "../types";

interface WalletScreenProps {
  protocolBalance: number;
  usdBalance: number;
  ptsBalance?: number;
  transactions: Transaction[];
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenConvert?: () => void;
  onConsolidateSubledgers?: () => void;
  onOpenWithdrawalModal?: () => void;
  walletAddress?: string;
  ptsToMsdqRate?: number;
  msdqToPtsRate?: number;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  protocolBalance,
  usdBalance,
  ptsBalance = 1200,
  transactions,
  onOpenSend,
  onOpenReceive,
  onOpenConvert,
  onConsolidateSubledgers,
  onOpenWithdrawalModal,
  walletAddress = "MSDQ7X8K2P9A4M6E3R",
  ptsToMsdqRate = 100,
  msdqToPtsRate = 90,
}) => {
  const [filterTab, setFilterTab] = useState<
    "all" | "sent" | "received" | "converted" | "bets" | "mining"
  >("all");
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Metrics
  const totalReceived = transactions
    .filter((tx) => tx.amount > 0 && tx.type !== "mining")
    .reduce((sum, tx) => sum + tx.amount, 3420.6);
  const totalSent = transactions
    .filter((tx) => tx.amount < 0 && tx.type === "send")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 850.0);
  const pendingBalance = 1991.3;

  const filteredTransactions = transactions.filter((tx) => {
    if (filterTab === "all") return true;
    if (filterTab === "sent") return tx.type === "send" || tx.amount < 0;
    if (filterTab === "received") return tx.type === "receive" || (tx.amount > 0 && tx.type !== "mining");
    if (filterTab === "converted") return (tx.note && tx.note.toLowerCase().includes("pts")) || tx.type === "escrow";
    if (filterTab === "bets") return (tx.note && tx.note.toLowerCase().includes("bet")) || (tx.note && tx.note.toLowerCase().includes("game"));
    if (filterTab === "mining") return tx.type === "mining";
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-5">
      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column on Desktop */}
        <div className="lg:col-span-6 space-y-5">
          {/* Primary Custodial Sovereign Vault Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131823] via-[#0f141f] to-[#0a0e17] border border-[#2a3447] p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Top Header Status */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
                <span className="text-[#38bdf8] font-bold uppercase tracking-wider">
                  MSDQ Sovereign Hardware Wallet
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-bold">
                Validator Active
              </span>
            </div>

            {/* Unique Miner Address Bar */}
            <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="material-symbols-outlined text-[18px] text-[#38bdf8] shrink-0">fingerprint</span>
                <div className="overflow-hidden">
                  <span className="text-[9px] font-mono text-[#64748b] block uppercase tracking-wider">
                    Unique Miner Address
                  </span>
                  <span className="font-mono text-xs font-bold text-white tracking-wider truncate block">
                    {walletAddress}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[#94a3b8] hover:text-white transition-colors"
                  title="Copy Address"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedAddress ? "check" : "content_copy"}
                  </span>
                </button>
                <button
                  onClick={onOpenReceive}
                  className="p-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[#38bdf8] transition-colors"
                  title="View QR Code"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                </button>
              </div>
            </div>

            {/* Balances Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* MSDQ Available Balance */}
              <div className="p-4 rounded-2xl bg-[#131823] border border-[#38bdf8]/40 shadow-inner">
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                  Available MSDQ
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                    {protocolBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#38bdf8]">MSDQ</span>
                </div>
                <span className="text-[11px] font-mono text-[#64748b] block mt-0.5">
                  ≈ ${usdBalance.toFixed(2)} USD
                </span>
              </div>

              {/* PTS Points Balance */}
              <div className="p-4 rounded-2xl bg-[#131823] border border-[#f59e0b]/40 shadow-inner flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#94a3b8]">
                      Game Vault PTS
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[#f59e0b] px-1.5 py-0.2 rounded bg-[#f59e0b]/15">
                      {ptsToMsdqRate} PTS = 1 MSDQ
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-[#f59e0b]">
                      {ptsBalance.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#94a3b8]">PTS</span>
                  </div>
                </div>

                {onOpenConvert && (
                  <button
                    onClick={onOpenConvert}
                    className="mt-2 w-full py-1.5 rounded-xl bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/40 text-[#f59e0b] font-mono text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">currency_exchange</span>
                    <span>Convert to MSDQ</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4 Action Buttons Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <button
                onClick={onOpenSend}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-white transition-all group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/15 text-[#38bdf8] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">north_east</span>
                </div>
                <span className="text-xs font-semibold mt-1.5">Send</span>
              </button>

              <button
                onClick={onOpenReceive}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-white transition-all group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">south_west</span>
                </div>
                <span className="text-xs font-semibold mt-1.5">Receive</span>
              </button>

              <button
                onClick={onOpenConvert}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-white transition-all group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
                </div>
                <span className="text-xs font-semibold mt-1.5">Convert</span>
              </button>

              {onOpenWithdrawalModal ? (
                <button
                  onClick={onOpenWithdrawalModal}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-white transition-all group shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#8b5cf6]/15 text-[#8b5cf6] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                  </div>
                  <span className="text-xs font-semibold mt-1.5">Withdraw</span>
                </button>
              ) : (
                <button
                  onClick={onConsolidateSubledgers}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-white transition-all group shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#8b5cf6]/15 text-[#8b5cf6] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">layers</span>
                  </div>
                  <span className="text-xs font-semibold mt-1.5">Sync</span>
                </button>
              )}
            </div>
          </div>

          {/* Metrics Ledger Breakdown: Pending, Total Received, Total Sent */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447]">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase block">Pending</span>
              <span className="font-mono text-sm font-bold text-[#f59e0b] mt-0.5 block">
                {pendingBalance.toFixed(2)}
              </span>
              <span className="text-[9px] font-mono text-[#64748b]">Multi-sig Hold</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447]">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase block">Total Received</span>
              <span className="font-mono text-sm font-bold text-[#10b981] mt-0.5 block">
                +{totalReceived.toFixed(2)}
              </span>
              <span className="text-[9px] font-mono text-[#64748b]">Inbound Trans</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447]">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase block">Total Sent</span>
              <span className="font-mono text-sm font-bold text-[#ef4444] mt-0.5 block">
                -{totalSent.toFixed(2)}
              </span>
              <span className="text-[9px] font-mono text-[#64748b]">Outbound Relay</span>
            </div>
          </div>
        </div>

        {/* Right Column on Desktop: Transaction History */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-3xl bg-[#131823] border border-[#2a3447] p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2a3447]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8] text-[20px]">history</span>
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Transaction History
                </span>
              </div>

              {/* Requested Filter Tabs: All, Sent, Received, Converted, Bets, Mining */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {(["all", "sent", "received", "converted", "bets", "mining"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold capitalize whitespace-nowrap transition-all ${
                      filterTab === tab
                        ? "bg-[#38bdf8] text-[#0f172a] shadow-sm"
                        : "bg-[#1e2738] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions List */}
            <div className="divide-y divide-[#2a3447]/40 max-h-[540px] overflow-y-auto pr-1">
              {filteredTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-[#64748b]">
                  No transactions matching '{filterTab}' filter.
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPositive
                              ? "bg-[#10b981]/15 text-[#10b981]"
                              : "bg-[#ef4444]/15 text-[#ef4444]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {tx.type === "mining"
                              ? "cyclone"
                              : tx.type === "escrow"
                              ? "currency_exchange"
                              : isPositive
                              ? "south_west"
                              : "north_east"}
                          </span>
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold text-white truncate max-w-[170px] sm:max-w-[260px]">{tx.note}</div>
                          <div className="text-[10px] font-mono text-[#64748b] flex items-center gap-1.5 mt-0.5">
                            <span>{tx.timestamp}</span>
                            <span>•</span>
                            <span className="text-[#94a3b8]">{tx.txHash}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-xs font-extrabold ${
                            isPositive ? "text-[#10b981]" : "text-white"
                          }`}
                        >
                          {isPositive ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} MSDQ
                        </div>
                        <div className="text-[10px] font-mono text-[#64748b]">
                          ${tx.usdValue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
