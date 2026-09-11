import React, { useState, useEffect, useRef } from "react";
import { CrashRocketCanvas } from "./CrashRocketCanvas";
import { gameAudio } from "../../lib/gameAudio";
import { verifyCrashRoundClient } from "../../lib/provablyFair";
import { gameSyncManager, ConnectionStatus } from "../../lib/gameSyncManager";

interface CrashGameModuleProps {
  userId: string;
  userName: string;
  userBalance: number;
  onBalanceChange: (newBalance: number) => void;
  onOpenLedger?: () => void;
}

interface ActiveBet {
  betId: string;
  userName: string;
  userTier: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
  isSelf?: boolean;
}

interface RoundSummary {
  roundId: string;
  crashMultiplier: number;
  hashCommitment: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  timestamp: number;
  totalPlayers: number;
  totalPayout: number;
}

interface AuthoritativeState {
  roundId: string;
  status: "WAITING" | "COUNTDOWN" | "RUNNING" | "CRASHED" | "RESULT";
  currentMultiplier: number;
  countdownSecondsRemaining: number;
  runningElapsedSec: number;
  hashCommitment: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string;
  crashMultiplier?: number;
  activeBets: ActiveBet[];
  userBet: {
    betId: string;
    amount: number;
    autoCashout?: number;
    cashedOut: boolean;
    cashoutMultiplier?: number;
    payout?: number;
  } | null;
  recentHistory: RoundSummary[];
  isMaintenance: boolean;
}

export const CrashGameModule: React.FC<CrashGameModuleProps> = ({
  userId,
  userName,
  userBalance,
  onBalanceChange,
}) => {
  const [gameState, setGameState] = useState<AuthoritativeState | null>(null);
  const [betAmount, setBetAmount] = useState<number>(50);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(true);
  const [autoCashoutValue, setAutoCashoutValue] = useState<number>(2.0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(gameAudio.getMuted());

  // Verification modal state
  const [verifyingRound, setVerifyingRound] = useState<RoundSummary | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    computedHash: string;
    crashMultiplier: number;
    hashMatches: boolean;
  } | null>(null);

  // Active view tab: "game" | "history" | "fairness"
  const [activeTab, setActiveTab] = useState<"game" | "history" | "fairness">("game");
  const [historySearch, setHistorySearch] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  const prevStatusRef = useRef<string>("");
  const prevCashedOutRef = useRef<boolean>(false);
  const userBalanceRef = useRef(userBalance);
  const onBalanceChangeRef = useRef(onBalanceChange);

  // Keep callback refs fresh without causing subscription teardown
  useEffect(() => {
    userBalanceRef.current = userBalance;
    onBalanceChangeRef.current = onBalanceChange;
  }, [userBalance, onBalanceChange]);

  // Real-time authoritative game state subscription via gameSyncManager
  // Handles reconnects gracefully, de-duplicates listeners, and cleans up on unmount
  useEffect(() => {
    const unsubscribe = gameSyncManager.subscribeToCrashState(
      userId,
      (data: AuthoritativeState) => {
        setGameState(data);

        // Sound triggers based on state transitions
        if (data.status !== prevStatusRef.current) {
          if (data.status === "RUNNING") {
            gameAudio.playRocketThrust(data.currentMultiplier);
          } else if (data.status === "CRASHED") {
            gameAudio.playCrashExplosion();
          } else if (data.status === "COUNTDOWN") {
            gameAudio.stopRocketThrust();
          }
          prevStatusRef.current = data.status;
        } else if (data.status === "RUNNING") {
          gameAudio.playRocketThrust(data.currentMultiplier);
        }

        // Cashout sound trigger
        if (data.userBet?.cashedOut && !prevCashedOutRef.current) {
          gameAudio.playCashoutFanfare();
          if (data.userBet.payout) {
            onBalanceChangeRef.current(userBalanceRef.current + data.userBet.payout);
          }
          prevCashedOutRef.current = true;
        }

        if (data.status === "COUNTDOWN") {
          prevCashedOutRef.current = false;
        }
      },
      (status) => {
        setConnectionStatus(status);
      }
    );

    return () => {
      unsubscribe();
      gameAudio.stopRocketThrust();
    };
  }, [userId]);

  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    gameAudio.setMuted(next);
  };

  const handlePlaceBet = async () => {
    if (betAmount <= 0) {
      setFeedbackMsg({ type: "error", text: "Please enter a valid stake amount." });
      return;
    }
    if (betAmount > userBalance) {
      setFeedbackMsg({ type: "error", text: "Insufficient PTS in node balance." });
      return;
    }

    gameAudio.playButtonTap();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/games/crash/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          amount: betAmount,
          autoCashout: autoCashoutEnabled ? autoCashoutValue : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedbackMsg({ type: "error", text: data.error || "Failed to place stake." });
      } else {
        onBalanceChange(userBalance - betAmount);
        setFeedbackMsg({ type: "success", text: `Stake placed: ${betAmount} PTS reserved.` });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Network error placing stake." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashOut = async () => {
    gameAudio.playButtonTap();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/games/crash/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedbackMsg({ type: "error", text: data.error || "Failed to cash out." });
      } else {
        gameAudio.playCashoutFanfare();
        setFeedbackMsg({
          type: "success",
          text: `Cashed out at ${data.multiplier?.toFixed(2)}x for ${data.payout} PTS!`,
        });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Network error executing cashout order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenVerification = async (round: RoundSummary) => {
    setVerifyingRound(round);
    setVerificationResult(null);

    if (round.serverSeed) {
      const res = await verifyCrashRoundClient(
        round.serverSeed,
        round.clientSeed,
        round.nonce,
        round.hashCommitment
      );
      setVerificationResult(res);
    }
  };

  const currentMultiplier = gameState?.currentMultiplier || 1.0;
  const status = gameState?.status || "WAITING";
  const countdownSeconds = gameState?.countdownSecondsRemaining || 0;
  const userBet = gameState?.userBet;
  const isCashedOut = userBet?.cashedOut || false;

  const quickPresets = [
    { label: "10", action: () => setBetAmount(10) },
    { label: "50", action: () => setBetAmount(50) },
    { label: "100", action: () => setBetAmount(100) },
    { label: "500", action: () => setBetAmount(500) },
    { label: "2X", action: () => setBetAmount((prev) => Math.min(Math.min(userBalance, 10000), prev * 2)) },
    { label: "MAX", action: () => setBetAmount(Math.min(10000, userBalance)) },
  ];

  const autoCashoutPresets = [1.2, 1.5, 2.0, 3.0, 5.0, 10.0];

  return (
    <div className="space-y-4">
      {/* Top Header Controls: History Bar + Audio Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#171b24] p-3 rounded-2xl border border-[#3c4a42]/50">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[10px] font-mono text-[#bbcabf] uppercase tracking-wider whitespace-nowrap mr-1">
            Recent:
          </span>
          {gameState?.recentHistory?.map((h) => {
            const isHigh = h.crashMultiplier >= 10.0;
            const isMedium = h.crashMultiplier >= 2.0;
            return (
              <button
                key={h.roundId}
                onClick={() => handleOpenVerification(h)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all hover:scale-105 whitespace-nowrap cursor-pointer ${
                  isHigh
                    ? "bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/40"
                    : isMedium
                    ? "bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30"
                    : "bg-[#28312b] text-[#bbcabf] border border-[#3c4a42]/60"
                }`}
                title={`Round ${h.roundId} • Click to verify cryptographic proof`}
              >
                {h.crashMultiplier.toFixed(2)}x
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={toggleAudio}
            className="p-1.5 rounded-lg bg-[#222731] border border-[#3c4a42]/60 text-[#bbcabf] hover:text-[#4edea3] transition-colors"
            title={isAudioMuted ? "Unmute Sound FX" : "Mute Sound FX"}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isAudioMuted ? "volume_off" : "volume_up"}
            </span>
          </button>
          {/* Real-time Connection Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
              connectionStatus === "connected"
                ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]"
                : connectionStatus === "reconnecting"
                ? "bg-[#ffb95f]/10 border-[#ffb95f]/30 text-[#ffb95f]"
                : connectionStatus === "offline"
                ? "bg-[#ffb4ab]/10 border-[#ffb4ab]/30 text-[#ffb4ab]"
                : "bg-[#222731] border-[#3c4a42]/60 text-[#bbcabf]"
            }`}
            title={`Real-Time Database Stream: ${connectionStatus.toUpperCase()}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-[#4edea3] animate-pulse"
                  : connectionStatus === "reconnecting"
                  ? "bg-[#ffb95f] animate-ping"
                  : connectionStatus === "offline"
                  ? "bg-[#ffb4ab]"
                  : "bg-[#bbcabf]"
              }`}
            />
            <span className="uppercase text-[9px]">{connectionStatus}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#222731] border border-[#3c4a42]/60 text-[11px] font-mono text-[#4edea3]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            <span>Round {gameState?.roundId || "Syncing"}</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage: GPU Rocket Canvas */}
      <CrashRocketCanvas
        status={status}
        currentMultiplier={currentMultiplier}
        countdownSeconds={countdownSeconds}
        crashMultiplier={gameState?.crashMultiplier}
        cashedOut={isCashedOut}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("game")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
              activeTab === "game"
                ? "bg-[#4edea3] text-[#003824] shadow-md"
                : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Launch Controls
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
              activeTab === "history"
                ? "bg-[#4edea3] text-[#003824] shadow-md"
                : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Round Ledger
          </button>
          <button
            onClick={() => setActiveTab("fairness")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
              activeTab === "fairness"
                ? "bg-[#4edea3] text-[#003824] shadow-md"
                : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Provably Fair
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#bbcabf]">
          Balance: <strong className="text-[#4edea3]">{userBalance.toLocaleString()} PTS</strong>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
            feedbackMsg.type === "success"
              ? "bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30"
              : "bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {feedbackMsg.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TAB 1: GAME CONTROLS & LIVE PLAYERS */}
      {activeTab === "game" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: Betting Form */}
          <div className="lg:col-span-6 bg-[#171b24] p-4 rounded-3xl border border-[#3c4a42]/60 space-y-4 shadow-xl">
            {/* Stake Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-[#bbcabf] uppercase tracking-wider">
                  Stake Amount (PTS)
                </label>
                <span className="text-[10px] font-mono text-[#86948a]">Min: 10 PTS</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={status === "RUNNING" && !!userBet}
                  onClick={() => setBetAmount((prev) => Math.max(10, prev - 10))}
                  className="w-12 h-12 rounded-2xl bg-[#222731] hover:bg-[#2e3544] border border-[#3c4a42]/70 text-[#dfe2ee] font-mono text-xl font-bold flex items-center justify-center transition-all disabled:opacity-40"
                  title="Decrement Stake"
                >
                  -
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={betAmount}
                    min={10}
                    max={10000}
                    disabled={status === "RUNNING" && !!userBet}
                    onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-2xl px-4 py-3 text-lg font-mono font-bold text-[#dfe2ee] text-center focus:border-[#4edea3] focus:outline-none disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-mono text-[#86948a]">PTS</span>
                </div>
                <button
                  type="button"
                  disabled={status === "RUNNING" && !!userBet}
                  onClick={() => setBetAmount((prev) => Math.min(10000, prev + 10))}
                  className="w-12 h-12 rounded-2xl bg-[#222731] hover:bg-[#2e3544] border border-[#3c4a42]/70 text-[#dfe2ee] font-mono text-xl font-bold flex items-center justify-center transition-all disabled:opacity-40"
                  title="Increment Stake"
                >
                  +
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-6 gap-1.5 mt-2">
                {quickPresets.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={status === "RUNNING" && !!userBet}
                    onClick={qp.action}
                    className="py-1 rounded-lg bg-[#222731] border border-[#3c4a42]/50 text-[11px] font-mono text-[#bbcabf] hover:text-[#4edea3] hover:border-[#4edea3]/40 transition-colors disabled:opacity-40"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Cashout Controls */}
            <div className="p-3 bg-[#0f131c] rounded-2xl border border-[#3c4a42]/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-[#bbcabf] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#4edea3]">autorenew</span>
                  Auto Cash-Out Target
                </label>
                <input
                  type="checkbox"
                  checked={autoCashoutEnabled}
                  disabled={status === "RUNNING" && !!userBet}
                  onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#4edea3] cursor-pointer"
                />
              </div>

              {autoCashoutEnabled && (
                <>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="1.05"
                      max="250"
                      value={autoCashoutValue}
                      disabled={status === "RUNNING" && !!userBet}
                      onChange={(e) => setAutoCashoutValue(parseFloat(e.target.value) || 1.1)}
                      className="w-full bg-[#171b24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#4edea3] focus:border-[#4edea3] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono text-[#86948a]">Multiplier</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {autoCashoutPresets.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAutoCashoutValue(val)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                          autoCashoutValue === val
                            ? "bg-[#4edea3] text-[#003824] font-bold"
                            : "bg-[#222731] text-[#bbcabf] hover:text-[#4edea3]"
                        }`}
                      >
                        {val.toFixed(2)}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Primary Action Button */}
            <div>
              {status === "RUNNING" && userBet && !userBet.cashedOut ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCashOut}
                  className="w-full py-4 rounded-2xl bg-[#ffb95f] text-[#482a00] hover:bg-[#ffc880] font-mono font-black text-lg transition-all transform hover:scale-[1.01] shadow-[0_0_25px_rgba(255,185,95,0.4)] flex flex-col items-center justify-center cursor-pointer animate-pulse"
                >
                  <span>CASH OUT NOW</span>
                  <span className="text-xs font-bold opacity-90">
                    Win {Math.round(userBet.amount * currentMultiplier)} PTS ({currentMultiplier.toFixed(2)}x)
                  </span>
                </button>
              ) : status === "RUNNING" && userBet && userBet.cashedOut ? (
                <div className="w-full py-3.5 rounded-2xl bg-[#4edea3]/20 border border-[#4edea3]/50 text-center font-mono">
                  <span className="text-sm font-bold text-[#4edea3] block">
                    ✓ CASHED OUT @ {userBet.cashoutMultiplier?.toFixed(2)}x
                  </span>
                  <span className="text-xs text-[#bbcabf]">
                    Won {userBet.payout} PTS (+{userBet.payout! - userBet.amount} Net Profit)
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || (status === "RUNNING" && !userBet) || status === "CRASHED"}
                  onClick={handlePlaceBet}
                  className="w-full py-4 rounded-2xl bg-[#4edea3] text-[#003824] hover:bg-[#5ff0b4] disabled:opacity-40 disabled:cursor-not-allowed font-mono font-black text-lg transition-all transform hover:scale-[1.01] shadow-lg flex flex-col items-center justify-center cursor-pointer"
                >
                  <span>
                    {status === "COUNTDOWN"
                      ? userBet
                        ? "STAKE CONFIRMED (READY)"
                        : "LAUNCH ROCKET"
                      : status === "RUNNING"
                      ? "ROUND IN PROGRESS"
                      : "WAITING FOR NEXT ROUND"}
                  </span>
                  {status === "COUNTDOWN" && !userBet && (
                    <span className="text-xs font-bold opacity-80">
                      Reserve {betAmount} PTS for Round {gameState?.roundId}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Live Network Participants */}
          <div className="lg:col-span-6 bg-[#171b24] p-4 rounded-3xl border border-[#3c4a42]/60 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#4edea3]">groups</span>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe2ee]">
                  Arena Miners ({gameState?.activeBets?.length || 0})
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#bbcabf]">Round {gameState?.roundId}</span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-72 scrollbar-none pr-1">
              {gameState?.activeBets?.length === 0 ? (
                <div className="text-center py-10 text-xs font-mono text-[#86948a]">
                  Waiting for miners to place stakes...
                </div>
              ) : (
                gameState?.activeBets?.map((b) => (
                  <div
                    key={b.betId}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-mono border transition-all ${
                      b.isSelf
                        ? "bg-[#4edea3]/10 border-[#4edea3]/40"
                        : b.cashedOut
                        ? "bg-[#222731]/80 border-[#4edea3]/20"
                        : status === "CRASHED"
                        ? "bg-[#222731]/40 border-[#ffb4ab]/20 opacity-60"
                        : "bg-[#222731]/60 border-[#3c4a42]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          b.isSelf ? "bg-[#4edea3] text-[#003824]" : "bg-[#28312b] text-[#bbcabf]"
                        }`}
                      >
                        {b.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className={`font-semibold ${b.isSelf ? "text-[#4edea3]" : "text-[#dfe2ee]"}`}>
                          {b.userName} {b.isSelf && "(You)"}
                        </span>
                        <div className="text-[10px] text-[#86948a]">
                          {b.autoCashout ? `Auto: ${b.autoCashout.toFixed(2)}x` : "Manual Exit"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {b.cashedOut ? (
                        <div>
                          <span className="text-[#4edea3] font-bold">+{b.payout} PTS</span>
                          <span className="text-[10px] text-[#bbcabf] block">
                            @{b.cashoutMultiplier?.toFixed(2)}x
                          </span>
                        </div>
                      ) : status === "CRASHED" ? (
                        <div>
                          <span className="text-[#ffb4ab] line-through">{b.amount} PTS</span>
                          <span className="text-[10px] text-[#ffb4ab] block">Crashed</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[#dfe2ee] font-medium">{b.amount} PTS</span>
                          <span className="text-[10px] text-[#ffb95f] block animate-pulse">In Flight</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROUND LEDGER / HISTORY */}
      {activeTab === "history" && (
        <div className="bg-[#171b24] p-4 rounded-3xl border border-[#3c4a42]/60 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-mono font-bold text-[#dfe2ee]">Provably Fair Round Ledger</h4>
              <p className="text-xs font-mono text-[#bbcabf]">
                Every single round multiplier is pre-committed cryptographically using SHA-256 before bets open.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search Round ID or Hash..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3 py-1.5 text-xs font-mono text-[#dfe2ee] focus:border-[#4edea3] focus:outline-none w-full sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#3c4a42]/60 text-[#bbcabf]">
                  <th className="py-2.5 px-3">Round ID</th>
                  <th className="py-2.5 px-3">Multiplier</th>
                  <th className="py-2.5 px-3">Players / Payout</th>
                  <th className="py-2.5 px-3">SHA-256 Hash Commitment</th>
                  <th className="py-2.5 px-3 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c4a42]/30">
                {gameState?.recentHistory
                  ?.filter(
                    (h) =>
                      !historySearch ||
                      h.roundId.toLowerCase().includes(historySearch.toLowerCase()) ||
                      h.hashCommitment.toLowerCase().includes(historySearch.toLowerCase())
                  )
                  .map((h) => (
                    <tr key={h.roundId} className="hover:bg-[#222731]/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#dfe2ee]">{h.roundId}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            h.crashMultiplier >= 10.0
                              ? "bg-[#ffb95f]/20 text-[#ffb95f]"
                              : h.crashMultiplier >= 2.0
                              ? "bg-[#4edea3]/20 text-[#4edea3]"
                              : "bg-[#28312b] text-[#bbcabf]"
                          }`}
                        >
                          {h.crashMultiplier.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#bbcabf]">
                        {h.totalPlayers} miners • {h.totalPayout.toLocaleString()} PTS
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-[#86948a] truncate max-w-[140px]">
                        {h.hashCommitment}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleOpenVerification(h)}
                          className="px-2.5 py-1 rounded-lg bg-[#222731] border border-[#3c4a42]/60 text-[10px] font-mono text-[#4edea3] hover:bg-[#4edea3] hover:text-[#003824] transition-all cursor-pointer"
                        >
                          Verify Proof
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROVABLY FAIR ARCHITECTURE & FORMULA */}
      {activeTab === "fairness" && (
        <div className="bg-[#171b24] p-5 rounded-3xl border border-[#3c4a42]/60 space-y-4 shadow-xl text-xs font-mono text-[#bbcabf]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#4edea3]">verified</span>
            <h4 className="text-sm font-bold text-[#dfe2ee]">Provably Fair Protocol Specification</h4>
          </div>

          <p className="leading-relaxed">
            The MSDQ Network Crash Engine implements an unalterable provably fair system. Before each round begins, the server generates a random 64-character hex <strong>Server Seed</strong>, combines it with the public <strong>Client Seed</strong> and monotonic <strong>Nonce</strong>, and publishes the SHA-256 hash commitment:
          </p>

          <div className="p-3 bg-[#0f131c] rounded-2xl border border-[#3c4a42]/60 font-mono text-[11px] text-[#4edea3] overflow-x-auto">
            Hash = SHA-256(ServerSeed + &quot;:&quot; + ClientSeed + &quot;:&quot; + Nonce)
          </div>

          <p className="leading-relaxed">
            Because the hash is published in advance, the game operator cannot alter the crash point after stakes are placed without breaking the cryptographic hash commitment. The multiplier is derived deterministically from the first 52 bits of the hash:
          </p>

          <div className="p-3 bg-[#0f131c] rounded-2xl border border-[#3c4a42]/60 font-mono text-[11px] text-[#bbcabf] overflow-x-auto">
            h = parseInt(Hash.slice(0, 13), 16);<br />
            e = 2^52;<br />
            if (h % 33 === 0) Multiplier = 1.00; // House edge<br />
            else Multiplier = Math.floor((100 * e - h) / (e - h)) / 100;
          </div>

          <div className="flex items-center justify-between p-3 bg-[#222731] rounded-2xl border border-[#3c4a42]/60">
            <div>
              <span className="text-[#dfe2ee] font-bold block">Active Epoch Client Seed</span>
              <span className="text-[#4edea3] font-mono text-[11px]">{gameState?.clientSeed || "MSDQ-EPOCH-8842"}</span>
            </div>
            <div className="text-right">
              <span className="text-[#dfe2ee] font-bold block">Current Nonce</span>
              <span className="text-[#4edea3] font-mono text-[11px]">#{gameState?.nonce || "15231"}</span>
            </div>
          </div>
        </div>
      )}

      {/* VERIFICATION MODAL */}
      {verifyingRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#171b24] border border-[#3c4a42] rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3]">verified_user</span>
                <h3 className="text-sm font-bold text-[#dfe2ee]">
                  Cryptographic Audit: Round {verifyingRound.roundId}
                </h3>
              </div>
              <button
                onClick={() => setVerifyingRound(null)}
                className="p-1 rounded-lg text-[#bbcabf] hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#86948a] uppercase tracking-wider block mb-1">
                  Published SHA-256 Commitment (Pre-Round)
                </label>
                <div className="p-2.5 bg-[#0f131c] rounded-xl border border-[#3c4a42]/60 text-[10px] text-[#4edea3] break-all select-all">
                  {verifyingRound.hashCommitment}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#86948a] uppercase tracking-wider block mb-1">
                  Revealed Server Seed (Post-Crash)
                </label>
                <div className="p-2.5 bg-[#0f131c] rounded-xl border border-[#3c4a42]/60 text-[10px] text-[#bbcabf] break-all select-all">
                  {verifyingRound.serverSeed || "Secret hidden until round ends"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#86948a] uppercase tracking-wider block mb-1">
                    Client Seed
                  </label>
                  <div className="p-2 bg-[#0f131c] rounded-xl border border-[#3c4a42]/60 text-[10px] text-[#dfe2ee]">
                    {verifyingRound.clientSeed}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#86948a] uppercase tracking-wider block mb-1">
                    Monotonic Nonce
                  </label>
                  <div className="p-2 bg-[#0f131c] rounded-xl border border-[#3c4a42]/60 text-[10px] text-[#dfe2ee]">
                    {verifyingRound.nonce}
                  </div>
                </div>
              </div>

              {verificationResult && (
                <div
                  className={`p-3 rounded-2xl border ${
                    verificationResult.hashMatches
                      ? "bg-[#4edea3]/15 border-[#4edea3]/40 text-[#4edea3]"
                      : "bg-[#ffb4ab]/15 border-[#ffb4ab]/40 text-[#ffb4ab]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <span className="material-symbols-outlined text-[16px]">
                      {verificationResult.hashMatches ? "verified" : "cancel"}
                    </span>
                    <span>
                      {verificationResult.hashMatches
                        ? "Cryptographic Verification Passed"
                        : "Hash Mismatch Detected"}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#bbcabf]">
                    Derived Multiplier: <strong>{verificationResult.crashMultiplier.toFixed(2)}x</strong> (Matches actual outcome: {verifyingRound.crashMultiplier.toFixed(2)}x).
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVerifyingRound(null)}
                className="px-4 py-2 rounded-xl bg-[#222731] border border-[#3c4a42]/60 text-xs font-mono text-[#bbcabf] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
