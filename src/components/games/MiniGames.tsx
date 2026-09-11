import React, { useState, useEffect } from "react";
import { BetAmountControl } from "./BetAmountControl";

interface MiniGameProps {
  gameId: "dice" | "coinflip" | "wheel" | "numbers" | "colors";
  availableBalance: number;
  onBetPlaced: (stake: number, win: boolean, payout: number, gameName: string) => void;
  minBet?: number;
  maxBet?: number;
  defaultBet?: number;
}

// -------------------------------------------------------------
// 1. CYBER DICE
// -------------------------------------------------------------
export const CyberDiceGame: React.FC<MiniGameProps> = ({
  availableBalance,
  onBetPlaced,
  minBet = 10,
  maxBet = 2000,
  defaultBet = 50,
}) => {
  const [betAmount, setBetAmount] = useState(defaultBet);
  const [rollMode, setRollMode] = useState<"over" | "under">("over");
  const [targetNumber, setTargetNumber] = useState(50);
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<{ win: boolean; amount: number } | null>(null);
  const [diceFace, setDiceFace] = useState(4);

  // Calculate multiplier based on win probability
  const winChance = rollMode === "over" ? 100 - targetNumber : targetNumber - 1;
  const multiplier = Math.max(1.05, parseFloat(((98 / Math.max(1, winChance))).toFixed(2)));

  const handleRoll = () => {
    if (isRolling || betAmount > availableBalance) return;
    setIsRolling(true);
    setResultMsg(null);

    // Dice animation frames
    let counter = 0;
    const interval = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * 6) + 1);
      counter++;
      if (counter > 10) {
        clearInterval(interval);
        // Final outcome from 1-100
        const finalRoll = Math.floor(Math.random() * 100) + 1;
        setLastRoll(finalRoll);
        setDiceFace((finalRoll % 6) + 1);

        const isWin =
          rollMode === "over" ? finalRoll > targetNumber : finalRoll < targetNumber;
        const payout = isWin ? Math.round(betAmount * multiplier) : 0;

        setIsRolling(false);
        setResultMsg({ win: isWin, amount: isWin ? payout : betAmount });
        onBetPlaced(betAmount, isWin, payout, "Cyber Dice");
      }
    }, 70);
  };

  return (
    <div className="space-y-4">
      {/* Visual Dice Display */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131823] to-[#0a0e17] border border-[#2a3447] flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
        <div className="absolute top-3 left-4 text-xs font-mono text-[#94a3b8] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
          <span>Entropy PRNG Active</span>
        </div>

        {/* 3D Dice Box */}
        <div
          className={`w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] border-2 ${
            isRolling
              ? "border-[#f59e0b] animate-bounce shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              : resultMsg?.win
              ? "border-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              : "border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          } flex items-center justify-center p-3 transition-all my-2`}
        >
          {lastRoll !== null ? (
            <div className="text-center font-mono">
              <span className="text-3xl font-black text-white">{lastRoll}</span>
              <span className="block text-[9px] uppercase tracking-wider text-[#94a3b8]">Result</span>
            </div>
          ) : (
            <span className="material-symbols-outlined text-[48px] text-[#38bdf8]">
              casino
            </span>
          )}
        </div>

        {/* Win/Loss Banner */}
        {resultMsg && (
          <div
            className={`mt-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-fadeIn ${
              resultMsg.win
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
                : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {resultMsg.win ? "emoji_events" : "close"}
            </span>
            <span>
              {resultMsg.win
                ? `VICTORY! Won +${resultMsg.amount} PTS (${multiplier}x)`
                : `DEFEAT! Lost ${resultMsg.amount} PTS`}
            </span>
          </div>
        )}

        {/* Target Slider Controls */}
        <div className="w-full max-w-sm mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRollMode("over")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  rollMode === "over"
                    ? "bg-[#10b981] text-white"
                    : "bg-[#1e2738] text-[#94a3b8]"
                }`}
              >
                Roll Over &gt; {targetNumber}
              </button>
              <button
                type="button"
                onClick={() => setRollMode("under")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  rollMode === "under"
                    ? "bg-[#38bdf8] text-white"
                    : "bg-[#1e2738] text-[#94a3b8]"
                }`}
              >
                Roll Under &lt; {targetNumber}
              </button>
            </div>
            <span className="text-[#f59e0b] font-bold">{multiplier}x Payout</span>
          </div>

          <input
            type="range"
            min={5}
            max={95}
            value={targetNumber}
            onChange={(e) => setTargetNumber(parseInt(e.target.value))}
            disabled={isRolling}
            className="w-full h-2 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#10b981]"
          />
          <div className="flex justify-between text-[10px] text-[#64748b] font-mono">
            <span>Win Chance: {winChance}%</span>
            <span>Target: {targetNumber}</span>
          </div>
        </div>
      </div>

      {/* Bet Amount Controls */}
      <BetAmountControl
        amount={betAmount}
        onChange={setBetAmount}
        availableBalance={availableBalance}
        minBet={minBet}
        maxBet={maxBet}
        tokenSymbol="PTS"
        multiplierPreview={multiplier}
        disabled={isRolling}
        actionButtonText={isRolling ? "Rolling Quantum Die..." : `Roll Dice (${betAmount} PTS)`}
        actionButtonIcon="casino"
        onConfirmBet={handleRoll}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 2. QUANTUM COIN FLIP
// -------------------------------------------------------------
export const QuantumCoinFlipGame: React.FC<MiniGameProps> = ({
  availableBalance,
  onBetPlaced,
  minBet = 10,
  maxBet = 1500,
  defaultBet = 50,
}) => {
  const [betAmount, setBetAmount] = useState(defaultBet);
  const [selectedSide, setSelectedSide] = useState<"heads" | "tails">("heads");
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [resultMsg, setResultMsg] = useState<{ win: boolean; amount: number } | null>(null);

  const multiplier = 1.96;

  const handleFlip = () => {
    if (isFlipping || betAmount > availableBalance) return;
    setIsFlipping(true);
    setResultMsg(null);
    setFlipResult(null);

    setTimeout(() => {
      const outcome: "heads" | "tails" = Math.random() > 0.5 ? "heads" : "tails";
      setFlipResult(outcome);
      setIsFlipping(false);

      const isWin = outcome === selectedSide;
      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      setResultMsg({ win: isWin, amount: isWin ? payout : betAmount });
      onBetPlaced(betAmount, isWin, payout, "Quantum Coin Flip");
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Coin Animation Stage */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131823] to-[#0a0e17] border border-[#2a3447] flex flex-col items-center justify-center relative overflow-hidden shadow-xl min-h-[220px]">
        {/* Animated Coin */}
        <div
          className={`w-28 h-28 rounded-full border-4 ${
            isFlipping
              ? "border-[#f59e0b] animate-spin shadow-[0_0_40px_rgba(245,158,11,0.4)]"
              : flipResult === "heads"
              ? "border-[#f59e0b] bg-gradient-to-tr from-[#78350f] via-[#b45309] to-[#fbbf24] shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              : flipResult === "tails"
              ? "border-[#06b6d4] bg-gradient-to-tr from-[#0e7490] via-[#0284c7] to-[#38bdf8] shadow-[0_0_30px_rgba(6,182,212,0.3)]"
              : selectedSide === "heads"
              ? "border-[#f59e0b] bg-gradient-to-tr from-[#78350f] to-[#d97706]"
              : "border-[#06b6d4] bg-gradient-to-tr from-[#0e7490] to-[#0284c7]"
          } flex flex-col items-center justify-center p-2 text-white transition-all`}
        >
          <span className="material-symbols-outlined text-[36px]">
            {isFlipping
              ? "autorenew"
              : flipResult === "heads" || (!flipResult && selectedSide === "heads")
              ? "monetization_on"
              : "toll"}
          </span>
          <span className="text-[11px] font-mono font-black uppercase tracking-wider mt-0.5">
            {isFlipping
              ? "FLIPPING"
              : flipResult
              ? flipResult.toUpperCase()
              : selectedSide.toUpperCase()}
          </span>
        </div>

        {/* Win/Loss message */}
        {resultMsg && (
          <div
            className={`mt-4 px-4 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-fadeIn ${
              resultMsg.win
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
                : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {resultMsg.win ? "check_circle" : "cancel"}
            </span>
            <span>
              {resultMsg.win
                ? `WIN! +${resultMsg.amount} PTS (1.96x)`
                : `LOST! -${resultMsg.amount} PTS`}
            </span>
          </div>
        )}

        {/* Side Select Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setSelectedSide("heads")}
            disabled={isFlipping}
            className={`px-5 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedSide === "heads"
                ? "bg-[#f59e0b] text-[#0f172a] shadow-lg shadow-[#f59e0b]/30 scale-105"
                : "bg-[#1e2738] text-[#94a3b8] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">monetization_on</span>
            <span>HEADS (Alpha)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSide("tails")}
            disabled={isFlipping}
            className={`px-5 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedSide === "tails"
                ? "bg-[#06b6d4] text-white shadow-lg shadow-[#06b6d4]/30 scale-105"
                : "bg-[#1e2738] text-[#94a3b8] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">toll</span>
            <span>TAILS (Omega)</span>
          </button>
        </div>
      </div>

      {/* Bet Control */}
      <BetAmountControl
        amount={betAmount}
        onChange={setBetAmount}
        availableBalance={availableBalance}
        minBet={minBet}
        maxBet={maxBet}
        tokenSymbol="PTS"
        multiplierPreview={multiplier}
        disabled={isFlipping}
        actionButtonText={isFlipping ? "Flipping Quantum Coin..." : `Flip Coin (${betAmount} PTS)`}
        actionButtonIcon="autorenew"
        onConfirmBet={handleFlip}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 3. LUCKY FORTUNE WHEEL
// -------------------------------------------------------------
export const LuckyFortuneWheelGame: React.FC<MiniGameProps> = ({
  availableBalance,
  onBetPlaced,
  minBet = 20,
  maxBet = 1000,
  defaultBet = 50,
}) => {
  const [betAmount, setBetAmount] = useState(defaultBet);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winSector, setWinSector] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<{ win: boolean; amount: number; multiplier: number } | null>(null);

  const sectors = [
    { mult: 0, label: "0x", color: "#ef4444" },
    { mult: 1.2, label: "1.2x", color: "#3b82f6" },
    { mult: 2.0, label: "2.0x", color: "#10b981" },
    { mult: 0, label: "0x", color: "#ef4444" },
    { mult: 1.5, label: "1.5x", color: "#06b6d4" },
    { mult: 3.0, label: "3.0x", color: "#8b5cf6" },
    { mult: 5.0, label: "5.0x", color: "#f59e0b" },
    { mult: 10.0, label: "10x", color: "#ec4899" },
  ];

  const handleSpin = () => {
    if (isSpinning || betAmount > availableBalance) return;
    setIsSpinning(true);
    setResultMsg(null);

    // Choose sector (weighted: slightly higher probability on 1.2x, 1.5x, 2.0x, 0x)
    const chosenIndex = Math.floor(Math.random() * sectors.length);
    const sectorAngle = 360 / sectors.length;
    // Align chosen sector to top needle (270 deg)
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const finalAngle = extraSpins + (360 - chosenIndex * sectorAngle);

    setWheelRotation((prev) => prev + finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const sector = sectors[chosenIndex];
      setWinSector(chosenIndex);

      const isWin = sector.mult > 0;
      const payout = Math.round(betAmount * sector.mult);

      setResultMsg({ win: isWin, amount: payout, multiplier: sector.mult });
      onBetPlaced(betAmount, isWin, payout, "Lucky Fortune Wheel");
    }, 4200);
  };

  return (
    <div className="space-y-4">
      {/* Wheel Canvas Container */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131823] to-[#0a0e17] border border-[#2a3447] flex flex-col items-center justify-center relative overflow-hidden shadow-xl min-h-[300px]">
        {/* Top Indicator Needle */}
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#f59e0b] z-20 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] mb-[-8px]"></div>

        {/* Wheel Disk */}
        <div className="relative w-56 h-56 rounded-full border-4 border-[#334155] overflow-hidden shadow-2xl">
          <div
            className="w-full h-full rounded-full transition-all duration-[4000ms] cubic-bezier(0.15, 0.9, 0.25, 1)"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              background: "conic-gradient(#ef4444 0deg 45deg, #3b82f6 45deg 90deg, #10b981 90deg 135deg, #ef4444 135deg 180deg, #06b6d4 180deg 225deg, #8b5cf6 225deg 270deg, #f59e0b 270deg 315deg, #ec4899 315deg 360deg)",
            }}
          >
            {/* Sector Labels */}
            {sectors.map((sec, i) => {
              const angle = i * 45 + 22.5;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full top-0 left-0 flex items-start justify-center pt-3 text-[11px] font-mono font-black text-white pointer-events-none drop-shadow"
                  style={{
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <span>{sec.label}</span>
                </div>
              );
            })}
          </div>

          {/* Center Hub */}
          <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#0f172a] border-2 border-[#f59e0b] flex flex-col items-center justify-center shadow-lg pointer-events-none z-10">
            <span className="text-[9px] font-mono font-black text-[#f59e0b] leading-none">SPIN</span>
            <span className="text-[8px] font-mono text-[#94a3b8]">MSDQ</span>
          </div>
        </div>

        {/* Result Message */}
        {resultMsg && (
          <div
            className={`mt-4 px-4 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-fadeIn ${
              resultMsg.win
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
                : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {resultMsg.win ? "stars" : "sentiment_dissatisfied"}
            </span>
            <span>
              {resultMsg.win
                ? `WHEEL PAYOUT! Won +${resultMsg.amount} PTS (${resultMsg.multiplier}x)`
                : `NO WIN! Better luck on the next quantum spin!`}
            </span>
          </div>
        )}
      </div>

      {/* Bet Control */}
      <BetAmountControl
        amount={betAmount}
        onChange={setBetAmount}
        availableBalance={availableBalance}
        minBet={minBet}
        maxBet={maxBet}
        tokenSymbol="PTS"
        multiplierPreview="Up to 10.0x"
        disabled={isSpinning}
        actionButtonText={isSpinning ? "Wheel Spinning..." : `Spin Wheel (${betAmount} PTS)`}
        actionButtonIcon="donut_large"
        onConfirmBet={handleSpin}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 4. NUMBER PREDICTION
// -------------------------------------------------------------
export const NumberPredictionGame: React.FC<MiniGameProps> = ({
  availableBalance,
  onBetPlaced,
  minBet = 10,
  maxBet = 500,
  defaultBet = 25,
}) => {
  const [betAmount, setBetAmount] = useState(defaultBet);
  const [mode, setMode] = useState<"single" | "range">("range");
  const [selectedDigit, setSelectedDigit] = useState<number>(7);
  const [selectedRange, setSelectedRange] = useState<"low" | "high">("high");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnNumber, setDrawnNumber] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<{ win: boolean; amount: number } | null>(null);

  const multiplier = mode === "single" ? 9.5 : 2.0;

  const handlePredict = () => {
    if (isDrawing || betAmount > availableBalance) return;
    setIsDrawing(true);
    setResultMsg(null);
    setDrawnNumber(null);

    let count = 0;
    const interval = setInterval(() => {
      setDrawnNumber(Math.floor(Math.random() * 9) + 1);
      count++;
      if (count > 12) {
        clearInterval(interval);
        const finalDigit = Math.floor(Math.random() * 9) + 1;
        setDrawnNumber(finalDigit);
        setIsDrawing(false);

        let isWin = false;
        if (mode === "single") {
          isWin = finalDigit === selectedDigit;
        } else {
          isWin =
            selectedRange === "low"
              ? finalDigit >= 1 && finalDigit <= 4
              : finalDigit >= 6 && finalDigit <= 9;
        }

        const payout = isWin ? Math.round(betAmount * multiplier) : 0;
        setResultMsg({ win: isWin, amount: isWin ? payout : betAmount });
        onBetPlaced(betAmount, isWin, payout, "Number Prediction");
      }
    }, 60);
  };

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131823] to-[#0a0e17] border border-[#2a3447] flex flex-col items-center justify-center relative shadow-xl">
        {/* Draw Display */}
        <div className="w-20 h-20 rounded-2xl bg-[#0a0e17] border-2 border-[#8b5cf6] flex flex-col items-center justify-center shadow-lg my-2">
          <span className="text-3xl font-mono font-black text-white">
            {drawnNumber !== null ? drawnNumber : "?"}
          </span>
          <span className="text-[9px] font-mono text-[#8b5cf6] uppercase">EPOCH DRAW</span>
        </div>

        {/* Outcome */}
        {resultMsg && (
          <div
            className={`mt-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-fadeIn ${
              resultMsg.win
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
                : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {resultMsg.win ? "check" : "close"}
            </span>
            <span>
              {resultMsg.win
                ? `PREDICTION WON! +${resultMsg.amount} PTS (${multiplier}x)`
                : `MISSED! Drawn number was ${drawnNumber}`}
            </span>
          </div>
        )}

        {/* Prediction Selector */}
        <div className="w-full max-w-sm mt-4 space-y-3">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#1e2738]">
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                mode === "range" ? "bg-[#8b5cf6] text-white" : "text-[#94a3b8]"
              }`}
            >
              Range (2.0x)
            </button>
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                mode === "single" ? "bg-[#8b5cf6] text-white" : "text-[#94a3b8]"
              }`}
            >
              Exact Single (9.5x)
            </button>
          </div>

          {mode === "range" ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRange("low")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedRange === "low"
                    ? "bg-[#8b5cf6]/20 border-[#8b5cf6] text-white"
                    : "bg-[#131823] border-[#2a3447] text-[#94a3b8]"
                }`}
              >
                <span className="block font-bold text-sm">LOW [1 - 4]</span>
                <span className="text-[10px] text-[#8b5cf6]">2.0x Payout</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRange("high")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedRange === "high"
                    ? "bg-[#8b5cf6]/20 border-[#8b5cf6] text-white"
                    : "bg-[#131823] border-[#2a3447] text-[#94a3b8]"
                }`}
              >
                <span className="block font-bold text-sm">HIGH [6 - 9]</span>
                <span className="text-[10px] text-[#8b5cf6]">2.0x Payout</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-9 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => setSelectedDigit(digit)}
                  className={`py-2 rounded-lg font-mono font-bold text-xs border transition-all ${
                    selectedDigit === digit
                      ? "bg-[#8b5cf6] border-[#8b5cf6] text-white scale-105"
                      : "bg-[#1e2738] border-[#334155]/60 text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BetAmountControl
        amount={betAmount}
        onChange={setBetAmount}
        availableBalance={availableBalance}
        minBet={minBet}
        maxBet={maxBet}
        tokenSymbol="PTS"
        multiplierPreview={multiplier}
        disabled={isDrawing}
        actionButtonText={isDrawing ? "Drawing Quantum Digit..." : `Lock Prediction (${betAmount} PTS)`}
        actionButtonIcon="pin_invoke"
        onConfirmBet={handlePredict}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 5. COLOR PREDICTION
// -------------------------------------------------------------
export const ColorPredictionGame: React.FC<MiniGameProps> = ({
  availableBalance,
  onBetPlaced,
  minBet = 10,
  maxBet = 1000,
  defaultBet = 50,
}) => {
  const [betAmount, setBetAmount] = useState(defaultBet);
  const [chosenColor, setChosenColor] = useState<"green" | "red" | "violet">("green");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedColor, setRevealedColor] = useState<"green" | "red" | "violet" | null>(null);
  const [resultMsg, setResultMsg] = useState<{ win: boolean; amount: number } | null>(null);

  const multiplier = chosenColor === "violet" ? 4.5 : 2.0;

  const handleReveal = () => {
    if (isRevealing || betAmount > availableBalance) return;
    setIsRevealing(true);
    setResultMsg(null);
    setRevealedColor(null);

    setTimeout(() => {
      // 45% Green, 45% Red, 10% Violet
      const rand = Math.random();
      let outcome: "green" | "red" | "violet" = "green";
      if (rand < 0.45) outcome = "green";
      else if (rand < 0.9) outcome = "red";
      else outcome = "violet";

      setRevealedColor(outcome);
      setIsRevealing(false);

      const isWin = outcome === chosenColor;
      const payout = isWin ? Math.round(betAmount * multiplier) : 0;

      setResultMsg({ win: isWin, amount: isWin ? payout : betAmount });
      onBetPlaced(betAmount, isWin, payout, "Color Prediction");
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131823] to-[#0a0e17] border border-[#2a3447] flex flex-col items-center justify-center relative shadow-xl">
        {/* Sphere Container */}
        <div
          className={`w-24 h-24 rounded-full border-4 ${
            isRevealing
              ? "border-[#f59e0b] animate-ping"
              : revealedColor === "green"
              ? "border-[#10b981] bg-gradient-to-tr from-[#065f46] to-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              : revealedColor === "red"
              ? "border-[#ef4444] bg-gradient-to-tr from-[#991b1b] to-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              : revealedColor === "violet"
              ? "border-[#8b5cf6] bg-gradient-to-tr from-[#5b21b6] to-[#8b5cf6] shadow-[0_0_30px_rgba(139,92,246,0.4)]"
              : chosenColor === "green"
              ? "border-[#10b981] bg-[#065f46]/40"
              : chosenColor === "red"
              ? "border-[#ef4444] bg-[#991b1b]/40"
              : "border-[#8b5cf6] bg-[#5b21b6]/40"
          } flex items-center justify-center text-white my-3 transition-all`}
        >
          <span className="material-symbols-outlined text-[36px]">
            {revealedColor ? "palette" : "help_center"}
          </span>
        </div>

        {/* Outcome */}
        {resultMsg && (
          <div
            className={`mt-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-fadeIn ${
              resultMsg.win
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
                : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {resultMsg.win ? "emoji_events" : "close"}
            </span>
            <span>
              {resultMsg.win
                ? `COLOR MATCH! Won +${resultMsg.amount} PTS (${multiplier}x)`
                : `MISSED! Color was ${revealedColor?.toUpperCase()}`}
            </span>
          </div>
        )}

        {/* Color buttons */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-4">
          <button
            type="button"
            onClick={() => setChosenColor("green")}
            disabled={isRevealing}
            className={`p-3 rounded-2xl border text-center transition-all ${
              chosenColor === "green"
                ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981] scale-105"
                : "bg-[#131823] border-[#2a3447] text-[#94a3b8]"
            }`}
          >
            <span className="block font-bold text-xs">GREEN</span>
            <span className="text-[10px] font-mono">2.0x Payout</span>
          </button>
          <button
            type="button"
            onClick={() => setChosenColor("violet")}
            disabled={isRevealing}
            className={`p-3 rounded-2xl border text-center transition-all ${
              chosenColor === "violet"
                ? "bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#8b5cf6] scale-105"
                : "bg-[#131823] border-[#2a3447] text-[#94a3b8]"
            }`}
          >
            <span className="block font-bold text-xs">VIOLET</span>
            <span className="text-[10px] font-mono font-bold text-[#f59e0b]">4.5x High</span>
          </button>
          <button
            type="button"
            onClick={() => setChosenColor("red")}
            disabled={isRevealing}
            className={`p-3 rounded-2xl border text-center transition-all ${
              chosenColor === "red"
                ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] scale-105"
                : "bg-[#131823] border-[#2a3447] text-[#94a3b8]"
            }`}
          >
            <span className="block font-bold text-xs">RED</span>
            <span className="text-[10px] font-mono">2.0x Payout</span>
          </button>
        </div>
      </div>

      <BetAmountControl
        amount={betAmount}
        onChange={setBetAmount}
        availableBalance={availableBalance}
        minBet={minBet}
        maxBet={maxBet}
        tokenSymbol="PTS"
        multiplierPreview={multiplier}
        disabled={isRevealing}
        actionButtonText={isRevealing ? "Revealing Sphere Color..." : `Select Color (${betAmount} PTS)`}
        actionButtonIcon="palette"
        onConfirmBet={handleReveal}
      />
    </div>
  );
};
