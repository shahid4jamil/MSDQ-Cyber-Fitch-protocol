// Web Audio API Sound Synthesizer for MSDQ Network GameFi Arena
// 100% self-contained synthesized sounds - no external audio files needed

class GameAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private rocketOscillator: OscillatorNode | null = null;
  private rocketGain: GainNode | null = null;

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopRocketThrust();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Button Tap / UI Feedback
  public playButtonTap() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // AudioContext failure recovery
    }
  }

  // Continuous Rocket Thruster Hum
  public playRocketThrust(multiplier: number = 1.0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const baseFreq = Math.min(180, 55 + Math.log2(Math.max(1, multiplier)) * 25);

      if (!this.rocketOscillator) {
        this.rocketOscillator = this.ctx.createOscillator();
        this.rocketGain = this.ctx.createGain();

        this.rocketOscillator.type = "triangle";
        this.rocketOscillator.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

        this.rocketGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        this.rocketGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.3);

        this.rocketOscillator.connect(this.rocketGain);
        this.rocketGain.connect(this.ctx.destination);
        this.rocketOscillator.start();
      } else {
        this.rocketOscillator.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
      }
    } catch {
      // AudioContext recovery
    }
  }

  public stopRocketThrust() {
    if (this.rocketGain && this.ctx) {
      try {
        this.rocketGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);
        setTimeout(() => {
          if (this.rocketOscillator) {
            this.rocketOscillator.stop();
            this.rocketOscillator.disconnect();
            this.rocketOscillator = null;
          }
          if (this.rocketGain) {
            this.rocketGain.disconnect();
            this.rocketGain = null;
          }
        }, 160);
      } catch {
        this.rocketOscillator = null;
        this.rocketGain = null;
      }
    }
  }

  // Multiplier Ascent Tick
  public playMultiplierTick(multiplier: number) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = Math.min(1200, 300 + multiplier * 40);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  // Crash Explosion Boom
  public playCrashExplosion() {
    this.stopRocketThrust();
    if (this.isMuted) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([80, 40, 120]);
    }

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // White noise explosion buffer
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(60, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  // Cashout Fanfare / Coin Chime
  public playCashoutFanfare() {
    if (this.isMuted) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 20, 60]);
    }

    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = this.ctx!.currentTime + idx * 0.07;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch {}
  }

  // Dice Shake & Roll Settle
  public playDiceRoll() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      for (let i = 0; i < 4; i++) {
        const time = this.ctx.currentTime + i * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(220 + Math.random() * 200, time);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.03);
      }
    } catch {}
  }

  // Token Step Hop
  public playTokenStep() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {}
  }

  // Capture Zap
  public playCaptureZap() {
    if (this.isMuted) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 30, 80]);
    }

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  // Victory Fanfare
  public playVictorySound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const chords = [
        [523.25, 659.25],
        [587.33, 698.46],
        [659.25, 783.99],
        [783.99, 1046.5],
      ];

      chords.forEach((chord, step) => {
        const time = this.ctx!.currentTime + step * 0.12;
        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.start(time);
          osc.stop(time + 0.3);
        });
      });
    } catch {}
  }
}

export const gameAudio = new GameAudioSynthesizer();
