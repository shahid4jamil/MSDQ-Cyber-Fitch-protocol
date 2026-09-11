import React, { useEffect, useState } from "react";

export interface LudoDiceProps {
  value: number | null; // 1..6, or null
  isRolling: boolean;
  isMyTurn: boolean;
  hasRolled: boolean;
  disabled?: boolean;
  onRoll?: () => void;
  size?: "sm" | "md" | "lg" | "board";
  activePlayerColor?: "emerald" | "amber" | "cyan" | "ruby";
  showLabel?: boolean;
  className?: string;
  id?: string;
}

// 3x3 grid positions for standard 6-sided dice faces
// indices:
// 0: top-left,    1: top-mid,    2: top-right
// 3: mid-left,    4: center,     5: mid-right
// 6: bot-left,    7: bot-mid,    8: bot-right
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const COLOR_GLOW_MAP = {
  emerald: {
    glow: "shadow-[0_0_25px_rgba(78,222,163,0.6)] border-[#4edea3]",
    pip: "bg-[#4edea3]",
    pipGlow: "shadow-[0_0_8px_rgba(78,222,163,0.9)]",
    activeBadge: "bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/40",
  },
  amber: {
    glow: "shadow-[0_0_25px_rgba(255,185,95,0.6)] border-[#ffb95f]",
    pip: "bg-[#ffb95f]",
    pipGlow: "shadow-[0_0_8px_rgba(255,185,95,0.9)]",
    activeBadge: "bg-[#ffb95f]/20 text-[#ffb95f] border-[#ffb95f]/40",
  },
  cyan: {
    glow: "shadow-[0_0_25px_rgba(76,215,246,0.6)] border-[#4cd7f6]",
    pip: "bg-[#4cd7f6]",
    pipGlow: "shadow-[0_0_8px_rgba(76,215,246,0.9)]",
    activeBadge: "bg-[#4cd7f6]/20 text-[#4cd7f6] border-[#4cd7f6]/40",
  },
  ruby: {
    glow: "shadow-[0_0_25px_rgba(255,180,171,0.6)] border-[#ffb4ab]",
    pip: "bg-[#ffb4ab]",
    pipGlow: "shadow-[0_0_8px_rgba(255,180,171,0.9)]",
    activeBadge: "bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/40",
  },
};

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  isRolling,
  isMyTurn,
  hasRolled,
  disabled = false,
  onRoll,
  size = "md",
  activePlayerColor = "emerald",
  showLabel = true,
  className = "",
  id = "ludo-authoritative-dice",
}) => {
  const [animatedFace, setAnimatedFace] = useState<number>(value || 1);

  // During roll animation, rapidly cycle faces to create genuine 3D rolling illusion
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRolling) {
      interval = setInterval(() => {
        setAnimatedFace(Math.floor(Math.random() * 6) + 1);
      }, 70);
    } else {
      setAnimatedFace(value || 1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRolling, value]);

  const canClick = isMyTurn && !hasRolled && !isRolling && !disabled && Boolean(onRoll);
  const colorTheme = COLOR_GLOW_MAP[activePlayerColor] || COLOR_GLOW_MAP.emerald;

  // Sizing definitions
  const sizeClasses = {
    sm: "w-11 h-11 p-1.5 rounded-xl border-2",
    md: "w-16 h-16 sm:w-18 sm:h-18 p-2 rounded-2xl border-2",
    lg: "w-20 h-20 sm:w-24 sm:h-24 p-2.5 rounded-3xl border-3",
    board: "w-14 h-14 sm:w-16 sm:h-16 p-2 rounded-2xl border-2",
  }[size];

  const pipSizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
    board: "w-2.5 h-2.5 sm:w-3 sm:h-3",
  }[size];

  const activePips = PIP_MAP[animatedFace] || [4];

  return (
    <div
      id={id}
      className={`flex flex-col items-center justify-center select-none font-mono ${className}`}
    >
      {/* 3D Dice Outer Wrapper */}
      <div className="relative group">
        {/* Pulsing Aura if user's turn to roll */}
        {canClick && (
          <div
            className={`absolute -inset-1.5 rounded-3xl opacity-75 blur-md animate-pulse pointer-events-none ${
              activePlayerColor === "amber"
                ? "bg-[#ffb95f]/50"
                : activePlayerColor === "cyan"
                ? "bg-[#4cd7f6]/50"
                : activePlayerColor === "ruby"
                ? "bg-[#ffb4ab]/50"
                : "bg-[#4edea3]/50"
            }`}
          />
        )}

        {/* Dice Cube Body */}
        <button
          type="button"
          disabled={!canClick}
          onClick={() => {
            if (canClick && onRoll) onRoll();
          }}
          aria-label={
            isRolling
              ? "Dice is rolling"
              : value
              ? `Dice rolled a ${value}`
              : "Ludo dice ready to roll"
          }
          className={`relative ${sizeClasses} transition-all duration-200 flex items-center justify-center ${
            isRolling
              ? "animate-bounce scale-95 rotate-12 shadow-2xl bg-gradient-to-br from-[#2a3444] via-[#1c2430] to-[#0f131c] border-[#4edea3]"
              : canClick
              ? `cursor-pointer hover:scale-105 active:scale-95 bg-gradient-to-br from-[#283241] via-[#19212c] to-[#0e141c] ${colorTheme.glow}`
              : value
              ? `bg-gradient-to-br from-[#1e2735] via-[#151c26] to-[#0b1017] ${colorTheme.glow}`
              : "opacity-60 bg-[#121721] border-[#2c3644] cursor-not-allowed"
          }`}
          style={{
            transformStyle: "preserve-3d",
            perspective: "800px",
          }}
        >
          {/* Subtle Top-Left Lighting Bevel */}
          <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />

          {/* 3x3 Pip Grid */}
          <div className="w-full h-full grid grid-cols-3 grid-rows-3 items-center justify-items-center relative z-10">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
              const hasPip = activePips.includes(index);
              return (
                <div
                  key={index}
                  className="w-full h-full flex items-center justify-center"
                >
                  {hasPip && (
                    <div
                      className={`${pipSizeClasses} rounded-full transition-transform ${
                        canClick || isRolling || value
                          ? `${colorTheme.pip} ${colorTheme.pipGlow}`
                          : "bg-[#86948a]"
                      } ${isRolling ? "scale-110" : "scale-100"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Rolling indicator overlay */}
          {isRolling && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-[inherit] z-20">
              <span className="material-symbols-outlined text-xs text-[#4edea3] animate-spin">
                sync
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Clear Text Label ("DICE: X") */}
      {showLabel && (
        <div className="mt-2 text-center">
          <div
            className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase border transition-all ${
              isRolling
                ? "bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/50 animate-pulse"
                : value
                ? `${colorTheme.activeBadge} font-bold shadow-sm`
                : canClick
                ? "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40 animate-pulse font-bold"
                : "bg-[#171b24] text-[#86948a] border-[#2c3644]"
            }`}
          >
            {isRolling ? "ROLLING..." : value ? `DICE: ${value}` : canClick ? "TAP TO ROLL" : "WAITING"}
          </div>
        </div>
      )}
    </div>
  );
};
