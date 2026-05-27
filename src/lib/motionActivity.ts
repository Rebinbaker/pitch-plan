// Lightweight motion activity tracker. Uses DeviceMotionEvent on web,
// falls back to 'unknown' if unavailable. Returns rolling activity level.

export type MotionActivity = 'still' | 'walking' | 'moving' | 'unknown';

class MotionTracker {
  private samples: number[] = [];
  private listener: ((e: DeviceMotionEvent) => void) | null = null;
  private started = false;

  start() {
    if (this.started) return;
    if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') return;
    this.listener = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      // remove gravity baseline ~9.81
      const dyn = Math.abs(mag - 9.81);
      this.samples.push(dyn);
      if (this.samples.length > 200) this.samples.shift();
    };
    try {
      window.addEventListener('devicemotion', this.listener);
      this.started = true;
    } catch {}
  }

  stop() {
    if (this.listener) window.removeEventListener('devicemotion', this.listener);
    this.listener = null;
    this.started = false;
    this.samples = [];
  }

  // Returns activity based on recent samples
  current(): MotionActivity {
    if (!this.started || this.samples.length < 10) return 'unknown';
    // RMS of recent samples
    const slice = this.samples.slice(-100);
    const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / slice.length);
    if (rms < 0.15) return 'still';
    if (rms < 0.8) return 'walking';
    return 'moving';
  }
}

export const motionTracker = new MotionTracker();
