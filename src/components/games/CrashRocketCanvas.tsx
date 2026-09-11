import React, { useEffect, useRef } from "react";

interface CrashRocketCanvasProps {
  status: "WAITING" | "COUNTDOWN" | "RUNNING" | "CRASHED" | "RESULT";
  currentMultiplier: number;
  countdownSeconds: number;
  crashMultiplier?: number;
  cashedOut?: boolean;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const CrashRocketCanvas: React.FC<CrashRocketCanvasProps> = ({
  status,
  currentMultiplier,
  countdownSeconds,
  crashMultiplier,
  cashedOut,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Animation states stored in ref to prevent React re-renders
  const animStateRef = useRef({
    stars: [] as Star[],
    particles: [] as Particle[],
    explosionParticles: [] as Particle[],
    rocketX: 0.15, // normalized (0..1)
    rocketY: 0.85, // normalized (0..1)
    screenShake: 0,
    launchpadSmoke: 0,
    hasExploded: false,
    lastStatus: status,
    flameScale: 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationFrameId: number;
    const state = animStateRef.current;

    // Initialize stars
    const numStars = 60;
    state.stars = Array.from({ length: numStars }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.4 + 0.2,
      opacity: Math.random() * 0.7 + 0.3,
    }));

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(container);

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Detect state transitions
      if (status === "CRASHED" && state.lastStatus !== "CRASHED" && !state.hasExploded) {
        state.hasExploded = true;
        state.screenShake = 15;
        // Spawn explosion particles
        const rx = state.rocketX * width;
        const ry = state.rocketY * height;
        state.explosionParticles = [];
        for (let i = 0; i < 70; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 260 + 40;
          state.explosionParticles.push({
            x: rx,
            y: ry,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: Math.random() * 0.8 + 0.4,
            color: i % 3 === 0 ? "#ffb4ab" : i % 2 === 0 ? "#ff897d" : "#ffb95f",
            size: Math.random() * 4 + 2,
          });
        }
      }

      if (status === "COUNTDOWN" || status === "WAITING") {
        state.hasExploded = false;
        state.rocketX = 0.15;
        state.rocketY = 0.82;
      }

      state.lastStatus = status;

      // Clear Canvas
      ctx.save();

      // Screen shake
      if (state.screenShake > 0) {
        const sx = (Math.random() - 0.5) * state.screenShake;
        const sy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(sx, sy);
        state.screenShake = Math.max(0, state.screenShake - dt * 25);
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#080c14");
      bgGrad.addColorStop(0.6, "#0f131c");
      bgGrad.addColorStop(1, "#141924");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield rendering with speed scaled by multiplier
      const starSpeedMultiplier = status === "RUNNING" ? Math.min(8, 1 + currentMultiplier * 0.6) : 0.8;
      ctx.fillStyle = "#ffffff";
      for (const s of state.stars) {
        s.y += s.speed * starSpeedMultiplier * dt * 0.4;
        s.x -= s.speed * starSpeedMultiplier * dt * 0.2;
        if (s.y > 1) s.y = 0;
        if (s.x < 0) s.x = 1;

        ctx.globalAlpha = s.opacity;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Cyber Grid floor lines
      ctx.strokeStyle = "rgba(78, 222, 163, 0.08)";
      ctx.lineWidth = 1;
      const gridOffset = (time * 0.03 * starSpeedMultiplier) % 30;
      for (let y = height * 0.75; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let x = -30 + gridOffset; x < width + 30; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, height * 0.75);
        ctx.lineTo(x - 50, height);
        ctx.stroke();
      }

      // Calculate rocket target coordinates based on multiplier
      if (status === "RUNNING") {
        // Curve smoothly from (0.15, 0.82) towards (0.80, 0.22)
        const progress = Math.min(1.0, Math.log(currentMultiplier) / Math.log(20));
        const targetX = 0.15 + progress * 0.65;
        const targetY = 0.82 - Math.pow(progress, 0.85) * 0.62;

        state.rocketX += (targetX - state.rocketX) * dt * 5;
        state.rocketY += (targetY - state.rocketY) * dt * 5;

        // Trajectory Glow Path
        const startX = 0.15 * width;
        const startY = 0.82 * height;
        const currX = state.rocketX * width;
        const currY = state.rocketY * height;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Quadratic curve towards rocket
        ctx.quadraticCurveTo(startX + (currX - startX) * 0.4, startY, currX, currY);
        ctx.strokeStyle = cashedOut
          ? "rgba(255, 185, 95, 0.6)"
          : "rgba(78, 222, 163, 0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Trajectory area under curve fill
        ctx.lineTo(currX, height * 0.82);
        ctx.lineTo(startX, height * 0.82);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, currY, 0, height * 0.82);
        areaGrad.addColorStop(
          0,
          cashedOut ? "rgba(255, 185, 95, 0.15)" : "rgba(78, 222, 163, 0.15)"
        );
        areaGrad.addColorStop(1, "rgba(78, 222, 163, 0.0)");
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Spawn engine exhaust particles
        state.flameScale = 0.8 + Math.sin(time * 0.04) * 0.3;
        const backX = currX - 16;
        const backY = currY + 12;

        for (let i = 0; i < 2; i++) {
          state.particles.push({
            x: backX,
            y: backY,
            vx: -Math.random() * 80 - 40,
            vy: Math.random() * 60 + 20,
            life: 1,
            maxLife: Math.random() * 0.4 + 0.2,
            color: Math.random() > 0.4 ? "#4edea3" : "#4cd7f6",
            size: Math.random() * 4 + 2,
          });
        }
      }

      // Update & Render Engine Exhaust Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / p.maxLife;

        if (p.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Render Rocket or Explosion
      const rx = state.rocketX * width;
      const ry = state.rocketY * height;

      if (status !== "CRASHED" || !state.hasExploded) {
        // Draw Cyber Rocket
        ctx.save();
        ctx.translate(rx, ry);

        // Rocket angle based on flight
        const flightAngle =
          status === "RUNNING" ? -Math.PI / 4.5 : -Math.PI / 3.8;
        ctx.rotate(flightAngle);

        // Thruster flame if running or countdown
        if (status === "RUNNING" || (status === "COUNTDOWN" && countdownSeconds <= 2)) {
          const flameLength = 22 * state.flameScale;
          const flameGrad = ctx.createLinearGradient(-flameLength, 0, 0, 0);
          flameGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          flameGrad.addColorStop(0.3, "rgba(78, 222, 163, 0.9)");
          flameGrad.addColorStop(0.7, "rgba(76, 215, 246, 0.7)");
          flameGrad.addColorStop(1, "rgba(255, 185, 95, 0)");

          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(-flameLength, 0);
          ctx.lineTo(-4, -6);
          ctx.lineTo(0, 0);
          ctx.lineTo(-4, 6);
          ctx.closePath();
          ctx.fill();
        }

        // Rocket Fins
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#4edea3";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(-18, -14);
        ctx.lineTo(-6, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(-18, 14);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rocket Body
        const bodyGrad = ctx.createLinearGradient(-15, 0, 20, 0);
        bodyGrad.addColorStop(0, "#1c2028");
        bodyGrad.addColorStop(0.7, "#334155");
        bodyGrad.addColorStop(1, "#4edea3");

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(22, 0); // Nose cone
        ctx.quadraticCurveTo(12, -9, -12, -7);
        ctx.lineTo(-12, 7);
        ctx.quadraticCurveTo(12, 9, 22, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit visor
        ctx.fillStyle = cashedOut ? "#ffb95f" : "#4cd7f6";
        ctx.shadowColor = cashedOut ? "#ffb95f" : "#4cd7f6";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(6, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      } else {
        // Render Crash Explosion Shrapnel
        for (let i = state.explosionParticles.length - 1; i >= 0; i--) {
          const ep = state.explosionParticles[i];
          ep.x += ep.vx * dt;
          ep.y += ep.vy * dt;
          ep.vx *= 0.96;
          ep.vy *= 0.96;
          ep.life -= dt / ep.maxLife;

          if (ep.life <= 0) {
            state.explosionParticles.splice(i, 1);
            continue;
          }

          ctx.fillStyle = ep.color;
          ctx.globalAlpha = ep.life;
          ctx.shadowColor = ep.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, ep.size * ep.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;

        // Shockwave Ring
        const shockLife = Math.max(0, 1 - (state.explosionParticles[0]?.life || 0));
        if (shockLife < 1) {
          ctx.strokeStyle = "rgba(255, 180, 171, " + (1 - shockLife) * 0.7 + ")";
          ctx.lineWidth = 4 * (1 - shockLife);
          ctx.beginPath();
          ctx.arc(rx, ry, shockLife * 120, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
    };
  }, [status, currentMultiplier, countdownSeconds, crashMultiplier, cashedOut]);

  return (
    <div ref={containerRef} className="relative w-full h-64 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-[#3c4a42]/60">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Dynamic Top Right Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f131c]/80 border border-[#3c4a42]/60 backdrop-blur-md text-[10px] font-mono text-[#bbcabf]">
        <span
          className={`w-2 h-2 rounded-full ${
            status === "RUNNING"
              ? "bg-[#4edea3] animate-ping"
              : status === "COUNTDOWN"
              ? "bg-[#ffb95f] animate-pulse"
              : "bg-[#ffb4ab]"
          }`}
        />
        <span>
          {status === "RUNNING"
            ? "IN FLIGHT"
            : status === "COUNTDOWN"
            ? `LAUNCH IN ${countdownSeconds}s`
            : status === "CRASHED"
            ? "CRASHED"
            : "WAITING"}
        </span>
      </div>

      {/* Central Multiplier HUD */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        {status === "COUNTDOWN" && (
          <div className="text-center">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#bbcabf]">
              Next Rocket Launching In
            </span>
            <div className="text-5xl sm:text-6xl font-mono font-black text-[#ffb95f] tracking-tight drop-shadow-[0_0_20px_rgba(255,185,95,0.4)]">
              {countdownSeconds}s
            </div>
            <span className="text-[10px] font-mono text-[#4edea3] mt-1 block">
              Place your stakes & configure auto cashout
            </span>
          </div>
        )}

        {status === "RUNNING" && (
          <div className="text-center">
            <div
              className={`text-5xl sm:text-6xl font-mono font-black tracking-tight drop-shadow-[0_0_25px_rgba(78,222,163,0.4)] ${
                cashedOut ? "text-[#ffb95f]" : "text-[#dfe2ee]"
              }`}
            >
              {currentMultiplier.toFixed(2)}x
            </div>
            <span className="text-[11px] font-mono text-[#4edea3] uppercase tracking-wider animate-pulse mt-0.5 block">
              {cashedOut ? "★ LOCKED WINNING MULTIPLIER" : "Trajectory Ascending"}
            </span>
          </div>
        )}

        {status === "CRASHED" && (
          <div className="text-center animate-bounce">
            <div className="text-5xl sm:text-6xl font-mono font-black text-[#ffb4ab] tracking-tight drop-shadow-[0_0_30px_rgba(255,180,171,0.5)]">
              {(crashMultiplier || currentMultiplier).toFixed(2)}x
            </div>
            <span className="text-xs font-mono font-bold text-[#ffb4ab] uppercase tracking-widest bg-[#ffb4ab]/15 px-3 py-0.5 rounded-full border border-[#ffb4ab]/30 mt-1 inline-block">
              CRASHED
            </span>
          </div>
        )}
      </div>

      {/* Watermark Provably Fair */}
      <div className="absolute bottom-2.5 right-3.5 flex items-center gap-1.5 text-[9px] font-mono text-[#86948a]/80 pointer-events-none">
        <span className="material-symbols-outlined text-[13px] text-[#4edea3]">verified</span>
        <span>SHA-256 Pre-Committed PRNG</span>
      </div>
    </div>
  );
};
