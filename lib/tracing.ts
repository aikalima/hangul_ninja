export type TracePoint = { x: number; y: number; z: number };
export const PATH: TracePoint[] = Array.from({ length: 41 }, (_, i) =>
  i <= 20
    ? { x: -0.45 + i * 0.045, y: 0.45, z: 0 }
    : { x: 0.45, y: 0.45 - (i - 20) * 0.045, z: 0 },
);
export type TraceState = 'ready' | 'tracing' | 'complete' | 'retry';
/** Swept, ordered cuts: wider arc/depth tolerance with recovery at the corner. */
export class FlowLesson {
  state: TraceState = 'ready';
  next = 0;
  previous: TracePoint | null = null;
  private lastTime = 0;
  reset() {
    this.state = 'ready';
    this.next = 0;
    this.previous = null;
    this.lastTime = 0;
  }
  release() {
    if (this.state !== 'complete') {
      this.next = this.next >= 21 ? 21 : 0;
      this.state = this.next ? 'tracing' : 'ready';
    }
    this.previous = null;
  }
  sample(p: TracePoint, time = performance.now()) {
    if (this.state === 'complete') return;
    const prev = this.previous;
    this.previous = { ...p };
    const gap = time - this.lastTime;
    this.lastTime = time;
    // Never join separate gestures, stale tracking poses, or controller teleports.
    if (
      !prev ||
      gap > 180 ||
      gap < 0 ||
      Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z) > 1.6
    )
      return;
    if (Math.abs(p.z) > 0.45 || Math.abs(prev.z) > 0.45) {
      this.release();
      return;
    }
    const horizontal = this.next < 21;
    const dx = p.x - prev.x,
      dy = p.y - prev.y;
    if (
      (horizontal && (dx <= 0 || Math.abs(dy) > dx * 0.9)) ||
      (!horizontal && (dy >= 0 || Math.abs(dx) > -dy * 0.9))
    )
      return;
    const end = horizontal ? 21 : 41,
      length = dx * dx + dy * dy;
    // Each checkpoint must intersect this same physical sweep; no diagonal shortcuts.
    while (this.next < end) {
      const q = PATH[this.next];
      const t = Math.max(
        0,
        Math.min(1, ((q.x - prev.x) * dx + (q.y - prev.y) * dy) / length),
      );
      if (Math.hypot(q.x - prev.x - t * dx, q.y - prev.y - t * dy) > 0.14)
        break;
      this.next++;
      this.state = 'tracing';
    }
    if (this.next === 41) this.state = 'complete';
  }
  get progress() {
    return this.state === 'complete'
      ? 100
      : Math.round((Math.max(0, this.next - 1) / 40) * 100);
  }
}
