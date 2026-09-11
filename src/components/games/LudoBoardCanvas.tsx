import React, { useState, useEffect, useRef } from "react";
import { LudoPlayer } from "../../../server/games/types";
import { LudoDice } from "./LudoDice";
import { gameAudio } from "../../lib/gameAudio";

interface LudoBoardCanvasProps {
  players: LudoPlayer[];
  currentTurnPlayerId?: string;
  currentTurnPlayerColor?: "emerald" | "amber" | "cyan" | "ruby";
  validTokenMoves: number[];
  onSelectToken: (tokenId: number) => void;
  isMyTurn: boolean;
  currentDice?: number | null;
  hasRolled?: boolean;
  isRolling?: boolean;
  onRollDice?: () => void;
}

// 52-tile standard clockwise circuit coordinates (0..14 grid units)
const CIRCUIT_COORDINATES: Array<{ x: number; y: number }> = [
  // Green start arm (0..4) - clockwise from top-left green entry
  { x: 1, y: 6 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
  // Upwards to top arm (5..10)
  { x: 6, y: 5 },
  { x: 6, y: 4 },
  { x: 6, y: 3 },
  { x: 6, y: 2 },
  { x: 6, y: 1 },
  { x: 6, y: 0 },
  // Across top (11..12)
  { x: 7, y: 0 },
  { x: 8, y: 0 },
  // Downwards into right arm (13..18) - Amber/Yellow start is index 13!
  { x: 8, y: 1 },
  { x: 8, y: 2 },
  { x: 8, y: 3 },
  { x: 8, y: 4 },
  { x: 8, y: 5 },
  { x: 9, y: 6 },
  // Right arm towards edge (19..23)
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 12, y: 6 },
  { x: 13, y: 6 },
  { x: 14, y: 6 },
  // Across right edge (24..25)
  { x: 14, y: 7 },
  { x: 14, y: 8 },
  // Leftwards back towards center (26..31) - Cyan/Blue start is index 26!
  { x: 13, y: 8 },
  { x: 12, y: 8 },
  { x: 11, y: 8 },
  { x: 10, y: 8 },
  { x: 9, y: 8 },
  { x: 8, y: 9 },
  // Downwards to bottom edge (32..36)
  { x: 8, y: 10 },
  { x: 8, y: 11 },
  { x: 8, y: 12 },
  { x: 8, y: 13 },
  { x: 8, y: 14 },
  // Across bottom edge (37..38)
  { x: 7, y: 14 },
  { x: 6, y: 14 },
  // Upwards back towards center (39..44) - Ruby/Red start is index 39!
  { x: 6, y: 13 },
  { x: 6, y: 12 },
  { x: 6, y: 11 },
  { x: 6, y: 10 },
  { x: 6, y: 9 },
  { x: 5, y: 8 },
  // Leftwards to left edge (45..49)
  { x: 4, y: 8 },
  { x: 3, y: 8 },
  { x: 2, y: 8 },
  { x: 1, y: 8 },
  { x: 0, y: 8 },
  // Upwards to green entry (50..51)
  { x: 0, y: 7 },
  { x: 0, y: 6 },
];

// Home run paths (steps 51..55) and Center Goal (step 56)
const HOME_COLUMNS: Record<number, Array<{ x: number; y: number }>> = {
  // Emerald (Green) - index 0
  0: [
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6.2, y: 7 }, // Home
  ],
  // Amber (Yellow) - index 1
  1: [
    { x: 7, y: 1 },
    { x: 7, y: 2 },
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6.2 }, // Home
  ],
  // Cyan (Blue) - index 2
  2: [
    { x: 13, y: 7 },
    { x: 12, y: 7 },
    { x: 11, y: 7 },
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 7.8, y: 7 }, // Home
  ],
  // Ruby (Red) - index 3
  3: [
    { x: 7, y: 13 },
    { x: 7, y: 12 },
    { x: 7, y: 11 },
    { x: 7, y: 10 },
    { x: 7, y: 9 },
    { x: 7, y: 7.8 }, // Home
  ],
};

// Base Yard Token Spawns (x, y)
const YARD_SPAWNS: Record<number, Array<{ x: number; y: number }>> = {
  // Green Yard (top-left) - index 0
  0: [
    { x: 1.8, y: 1.8 },
    { x: 3.8, y: 1.8 },
    { x: 1.8, y: 3.8 },
    { x: 3.8, y: 3.8 },
  ],
  // Amber Yard (top-right) - index 1
  1: [
    { x: 10.8, y: 1.8 },
    { x: 12.8, y: 1.8 },
    { x: 10.8, y: 3.8 },
    { x: 12.8, y: 3.8 },
  ],
  // Cyan Yard (bottom-right) - index 2
  2: [
    { x: 10.8, y: 10.8 },
    { x: 12.8, y: 10.8 },
    { x: 10.8, y: 12.8 },
    { x: 12.8, y: 12.8 },
  ],
  // Ruby Yard (bottom-left) - index 3
  3: [
    { x: 1.8, y: 10.8 },
    { x: 3.8, y: 10.8 },
    { x: 1.8, y: 12.8 },
    { x: 3.8, y: 12.8 },
  ],
};

const SAFE_CIRCUIT_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLOR_MAP: Record<string, { fill: string; stroke: string; glow: string; yardBg: string }> = {
  emerald: { fill: "#4edea3", stroke: "#003824", glow: "rgba(78,222,163,0.5)", yardBg: "#0a2618" },
  amber: { fill: "#ffb95f", stroke: "#482a00", glow: "rgba(255,185,95,0.5)", yardBg: "#2d1c00" },
  cyan: { fill: "#4cd7f6", stroke: "#003642", glow: "rgba(76,215,246,0.5)", yardBg: "#002833" },
  ruby: { fill: "#ffb4ab", stroke: "#690005", glow: "rgba(255,180,171,0.5)", yardBg: "#33060a" },
};

export const LudoBoardCanvas: React.FC<LudoBoardCanvasProps> = ({
  players,
  currentTurnPlayerId,
  currentTurnPlayerColor = "emerald",
  validTokenMoves,
  onSelectToken,
  isMyTurn,
  currentDice = null,
  hasRolled = false,
  isRolling = false,
  onRollDice,
}) => {
  // Step-by-step animated positions tracker: key = `${playerId}-${tokenId}`, value = current step rendered
  const [displaySteps, setDisplaySteps] = useState<Record<string, number>>({});
  const targetStepsRef = useRef<Record<string, number>>({});

  // When players update, detect tokens advancing forward and animate step-by-step!
  useEffect(() => {
    players.forEach((player) => {
      player.tokens.forEach((token) => {
        const key = `${player.id}-${token.id}`;
        const currentDisplay = displaySteps[key] ?? token.step;
        const targetStep = token.step;

        targetStepsRef.current[key] = targetStep;

        if (currentDisplay === undefined) {
          setDisplaySteps((prev) => ({ ...prev, [key]: targetStep }));
        } else if (targetStep > currentDisplay && currentDisplay >= 0) {
          // Animate forward step by step
          let stepCursor = currentDisplay;
          const stepInterval = setInterval(() => {
            stepCursor++;
            gameAudio.playTokenStep();
            setDisplaySteps((prev) => ({ ...prev, [key]: stepCursor }));

            if (stepCursor >= targetStep || stepCursor >= (targetStepsRef.current[key] ?? targetStep)) {
              clearInterval(stepInterval);
            }
          }, 110);
        } else if (targetStep !== currentDisplay) {
          // Snapped (e.g. out of base to 0, or knocked back to -1)
          setDisplaySteps((prev) => ({ ...prev, [key]: targetStep }));
        }
      });
    });
  }, [players]);

  // Coordinates resolver
  const getTokenCoords = (colorIndex: number, step: number, tokenId: number): { x: number; y: number } => {
    if (step === -1) {
      return YARD_SPAWNS[colorIndex]?.[tokenId] || { x: 2, y: 2 };
    }
    if (step >= 51) {
      const homeIdx = Math.min(5, step - 51);
      return HOME_COLUMNS[colorIndex]?.[homeIdx] || { x: 7, y: 7 };
    }
    const startOffsets = [0, 13, 26, 39];
    const globalIdx = (startOffsets[colorIndex] + step) % 52;
    return CIRCUIT_COORDINATES[globalIdx] || { x: 7, y: 7 };
  };

  const scale = 10; // 15 grid units * 10 = 150 viewBox

  return (
    <div
      id="ludo-board-container"
      className="relative w-full max-w-[500px] mx-auto aspect-square rounded-3xl overflow-visible border-2 border-[#3c4a42]/80 shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-[#0b0e14] select-none"
    >
      <svg
        viewBox="0 0 150 150"
        className="w-full h-full block rounded-3xl overflow-hidden"
        style={{ shapeRendering: "geometricPrecision" }}
      >
        <defs>
          <pattern id="board-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1f2633" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Global Board Background */}
        <rect width="150" height="150" fill="#0f131c" />
        <rect width="150" height="150" fill="url(#board-grid)" />

        {/* --- 4 CORNER YARD BASES (6x6 units = 60x60 units each) --- */}
        {/* Emerald (Top-Left: 0,0) */}
        <g>
          <rect x="0" y="0" width="60" height="60" fill="#0a2618" stroke="#4edea3" strokeWidth="1" />
          <rect x="10" y="10" width="40" height="40" rx="6" fill="#131b26" stroke="#4edea3" strokeWidth="0.8" />
          {[
            { x: 18, y: 18 },
            { x: 38, y: 18 },
            { x: 18, y: 38 },
            { x: 38, y: 38 },
          ].map((pt, i) => (
            <circle key={`g-pit-${i}`} cx={pt.x} cy={pt.y} r="5.5" fill="#0a2618" stroke="#4edea3" strokeWidth="0.8" />
          ))}
          <text x="30" y="8" fill="#4edea3" fontSize="4.5" fontWeight="black" textAnchor="middle">
            EMERALD #0
          </text>
        </g>

        {/* Amber / Yellow (Top-Right: 90,0) */}
        <g>
          <rect x="90" y="0" width="60" height="60" fill="#2d1c00" stroke="#ffb95f" strokeWidth="1" />
          <rect x="100" y="10" width="40" height="40" rx="6" fill="#131b26" stroke="#ffb95f" strokeWidth="0.8" />
          {[
            { x: 108, y: 18 },
            { x: 128, y: 18 },
            { x: 108, y: 38 },
            { x: 128, y: 38 },
          ].map((pt, i) => (
            <circle key={`y-pit-${i}`} cx={pt.x} cy={pt.y} r="5.5" fill="#2d1c00" stroke="#ffb95f" strokeWidth="0.8" />
          ))}
          <text x="120" y="8" fill="#ffb95f" fontSize="4.5" fontWeight="black" textAnchor="middle">
            AMBER #1
          </text>
        </g>

        {/* Cyan / Blue (Bottom-Right: 90,90) */}
        <g>
          <rect x="90" y="90" width="60" height="60" fill="#002833" stroke="#4cd7f6" strokeWidth="1" />
          <rect x="100" y="100" width="40" height="40" rx="6" fill="#131b26" stroke="#4cd7f6" strokeWidth="0.8" />
          {[
            { x: 108, y: 108 },
            { x: 128, y: 108 },
            { x: 108, y: 128 },
            { x: 128, y: 128 },
          ].map((pt, i) => (
            <circle key={`b-pit-${i}`} cx={pt.x} cy={pt.y} r="5.5" fill="#002833" stroke="#4cd7f6" strokeWidth="0.8" />
          ))}
          <text x="120" y="146" fill="#4cd7f6" fontSize="4.5" fontWeight="black" textAnchor="middle">
            CYAN #2
          </text>
        </g>

        {/* Ruby / Red (Bottom-Left: 0,90) */}
        <g>
          <rect x="0" y="90" width="60" height="60" fill="#33060a" stroke="#ffb4ab" strokeWidth="1" />
          <rect x="10" y="100" width="40" height="40" rx="6" fill="#131b26" stroke="#ffb4ab" strokeWidth="0.8" />
          {[
            { x: 18, y: 108 },
            { x: 38, y: 108 },
            { x: 18, y: 128 },
            { x: 38, y: 128 },
          ].map((pt, i) => (
            <circle key={`r-pit-${i}`} cx={pt.x} cy={pt.y} r="5.5" fill="#33060a" stroke="#ffb4ab" strokeWidth="0.8" />
          ))}
          <text x="30" y="146" fill="#ffb4ab" fontSize="4.5" fontWeight="black" textAnchor="middle">
            RUBY #3
          </text>
        </g>

        {/* --- COMMON 52 TRACK SQUARES --- */}
        {CIRCUIT_COORDINATES.map((coord, idx) => {
          const isSafe = SAFE_CIRCUIT_INDICES.has(idx);
          const isGreenStart = idx === 0;
          const isYellowStart = idx === 13;
          const isBlueStart = idx === 26;
          const isRedStart = idx === 39;

          const tileFill = isGreenStart
            ? "#0a2618"
            : isYellowStart
            ? "#2d1c00"
            : isBlueStart
            ? "#002833"
            : isRedStart
            ? "#33060a"
            : isSafe
            ? "#1e2736"
            : "#151b26";

          return (
            <g key={idx}>
              <rect
                x={coord.x * scale}
                y={coord.y * scale}
                width={scale}
                height={scale}
                fill={tileFill}
                stroke="#2a3444"
                strokeWidth="0.5"
              />
              {/* Star symbol on safe zones */}
              {isSafe && !isGreenStart && !isYellowStart && !isBlueStart && !isRedStart && (
                <polygon
                  points={`${coord.x * scale + 5},${coord.y * scale + 2} ${coord.x * scale + 6.2},${
                    coord.y * scale + 4.5
                  } ${coord.x * scale + 8.5},${coord.y * scale + 4.5} ${coord.x * scale + 6.6},${
                    coord.y * scale + 6
                  } ${coord.x * scale + 7.4},${coord.y * scale + 8.2} ${coord.x * scale + 5},${
                    coord.y * scale + 6.8
                  } ${coord.x * scale + 2.6},${coord.y * scale + 8.2} ${coord.x * scale + 3.4},${
                    coord.y * scale + 6
                  } ${coord.x * scale + 1.5},${coord.y * scale + 4.5} ${coord.x * scale + 3.8},${
                    coord.y * scale + 4.5
                  }`}
                  fill="#ffb95f"
                />
              )}
            </g>
          );
        })}

        {/* --- HOME COLUMNS --- */}
        {/* Emerald Home Path */}
        {[1, 2, 3, 4, 5].map((x, i) => (
          <rect key={`gh-${i}`} x={x * scale} y={7 * scale} width={scale} height={scale} fill="#4edea3" stroke="#003824" strokeWidth="0.5" />
        ))}
        {/* Amber Home Path */}
        {[1, 2, 3, 4, 5].map((y, i) => (
          <rect key={`yh-${i}`} x={7 * scale} y={y * scale} width={scale} height={scale} fill="#ffb95f" stroke="#482a00" strokeWidth="0.5" />
        ))}
        {/* Cyan Home Path */}
        {[13, 12, 11, 10, 9].map((x, i) => (
          <rect key={`ch-${i}`} x={x * scale} y={7 * scale} width={scale} height={scale} fill="#4cd7f6" stroke="#003642" strokeWidth="0.5" />
        ))}
        {/* Ruby Home Path */}
        {[13, 12, 11, 10, 9].map((y, i) => (
          <rect key={`rh-${i}`} x={7 * scale} y={y * scale} width={scale} height={scale} fill="#ffb4ab" stroke="#690005" strokeWidth="0.5" />
        ))}

        {/* --- CENTER HOME GOAL TRIANGLES --- */}
        <polygon points="60,60 90,60 75,75" fill="#ffb95f" stroke="#482a00" strokeWidth="0.5" />
        <polygon points="90,60 90,90 75,75" fill="#4cd7f6" stroke="#003642" strokeWidth="0.5" />
        <polygon points="90,90 60,90 75,75" fill="#ffb4ab" stroke="#690005" strokeWidth="0.5" />
        <polygon points="60,90 60,60 75,75" fill="#4edea3" stroke="#003824" strokeWidth="0.5" />
        <circle cx="75" cy="75" r="12" fill="#0f131c" stroke="#3c4a42" strokeWidth="1" />

        {/* --- PLAYER TOKENS RENDERING --- */}
        {players.map((player) => {
          const isTurn = player.id === currentTurnPlayerId;
          const colorCfg = COLOR_MAP[player.color] || COLOR_MAP.emerald;

          return player.tokens.map((token) => {
            const key = `${player.id}-${token.id}`;
            const stepToRender = displaySteps[key] ?? token.step;
            const coords = getTokenCoords(player.colorIndex, stepToRender, token.id);
            const cx = coords.x * scale + scale / 2;
            const cy = coords.y * scale + scale / 2;
            const canMove = isTurn && isMyTurn && validTokenMoves.includes(token.id);

            return (
              <g
                key={`tok-${player.id}-${token.id}`}
                onClick={() => {
                  if (canMove) onSelectToken(token.id);
                }}
                className={canMove ? "cursor-pointer" : ""}
              >
                {/* Glow ring if movable */}
                {canMove && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="6.8"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                    strokeDasharray="2 2"
                    className="animate-spin"
                  />
                )}

                {/* Token Shadow */}
                <ellipse cx={cx} cy={cy + 1.2} rx="4.2" ry="2" fill="rgba(0,0,0,0.6)" />

                {/* Token Body */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="4.4"
                  fill={colorCfg.fill}
                  stroke={canMove ? "#ffffff" : colorCfg.stroke}
                  strokeWidth={canMove ? 1.6 : 1}
                />

                {/* Token Inner Pip */}
                <circle cx={cx} cy={cy} r="1.8" fill={colorCfg.stroke} />
                <text
                  x={cx}
                  y={cy + 1}
                  fill="#ffffff"
                  fontSize="2.6"
                  fontWeight="black"
                  textAnchor="middle"
                >
                  {token.id + 1}
                </text>
              </g>
            );
          });
        })}
      </svg>

      {/* --- CENTER HOLOGRAPHIC LUDO DICE ON THE BOARD (ALWAYS VISIBLE & UNCLIPPED) --- */}
      <div
        id="ludo-center-board-dice"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
      >
        <LudoDice
          value={currentDice}
          isRolling={isRolling}
          isMyTurn={isMyTurn}
          hasRolled={hasRolled}
          onRoll={onRollDice}
          size="board"
          activePlayerColor={currentTurnPlayerColor}
          showLabel={true}
          id="board-embedded-dice"
        />
      </div>
    </div>
  );
};
