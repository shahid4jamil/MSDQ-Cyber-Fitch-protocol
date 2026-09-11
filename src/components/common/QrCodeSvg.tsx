import React from "react";

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Procedural SVG QR Code visualizer for MSDQ wallet addresses.
 * Renders standard QR matrix finder patterns and deterministic pseudo-random hash data.
 */
export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 180,
  className = "",
}) => {
  // Generate deterministic 21x21 QR matrix based on value hash
  const gridSize = 21;
  const matrix: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  // 1. Draw 3 corner finder patterns (7x7 with inner 3x3 box)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startY + r][startX + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(gridSize - 7, 0); // Top-right
  drawFinder(0, gridSize - 7); // Bottom-left

  // 2. Draw alignment and timing tracks
  for (let i = 8; i < gridSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Fill remaining data modules deterministically using simple hash
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;
      const inCenterLogo = r >= 8 && r <= 12 && c >= 8 && c <= 12;

      if (inTopLeft || inTopRight || inBottomLeft || inCenterLogo) {
        continue;
      }

      // Bit distribution
      const bit = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 0.13)) > 0.48;
      matrix[r][c] = bit;
    }
  }

  const cellSize = size / gridSize;

  return (
    <div
      className={`relative inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl ${className}`}
      style={{ width: size + 24, height: size + 24 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {matrix.map((row, r) =>
          row.map((active, c) => {
            if (!active) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize * 0.94}
                height={cellSize * 0.94}
                rx={cellSize * 0.15}
                fill="#0a0e17"
              />
            );
          })
        )}
      </svg>

      {/* Center MSDQ Protocol Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 rounded-xl bg-[#0a0e17] border-2 border-[#10b981] flex flex-col items-center justify-center shadow-lg">
          <span className="text-[9px] font-mono font-black text-[#10b981] tracking-tighter leading-none">
            MSDQ
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-0.5 animate-ping" />
        </div>
      </div>
    </div>
  );
};
