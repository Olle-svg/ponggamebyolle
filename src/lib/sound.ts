class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain = 0.4;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.3,
    startDelay = 0,
  ) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
      gainNode.gain.setValueAtTime(gain * this.masterGain, ctx.currentTime + startDelay);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startDelay + duration,
      );
      osc.start(ctx.currentTime + startDelay);
      osc.stop(ctx.currentTime + startDelay + duration);
    } catch {
      // Silently fail if audio is not available
    }
  }

  paddleHit() {
    this.playTone(480, 0.07, 'square', 0.5);
  }

  wallBounce() {
    this.playTone(280, 0.06, 'sine', 0.35);
  }

  score() {
    this.playTone(523, 0.12, 'sine', 0.5, 0);
    this.playTone(659, 0.12, 'sine', 0.5, 0.1);
    this.playTone(784, 0.2, 'sine', 0.5, 0.2);
  }

  gameOver(won: boolean) {
    if (won) {
      this.playTone(523, 0.15, 'sine', 0.5, 0);
      this.playTone(659, 0.15, 'sine', 0.5, 0.15);
      this.playTone(784, 0.15, 'sine', 0.5, 0.3);
      this.playTone(1047, 0.4, 'sine', 0.6, 0.45);
    } else {
      this.playTone(440, 0.2, 'square', 0.4, 0);
      this.playTone(330, 0.2, 'square', 0.4, 0.2);
      this.playTone(220, 0.4, 'square', 0.4, 0.4);
    }
  }

  setVolume(volume: number) {
    this.masterGain = Math.max(0, Math.min(1, volume));
  }
}

export const soundEngine = new SoundEngine();
