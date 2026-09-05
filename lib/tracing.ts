export type TracePoint = { x: number; y: number; z: number };
export const PATH: TracePoint[] = Array.from({ length: 41 }, (_, i) =>
  i <= 20
    ? { x: -0.45 + i * 0.045, y: 0.45, z: 0 }
    : { x: 0.45, y: 0.45 - (i - 20) * 0.045, z: 0 },
);
export type TraceState = 'ready' | 'tracing' | 'complete' | 'retry';
/** Ordered, continuous path tracking shared by mouse and tracked sword tip. */
export class TraceLesson {
  state: TraceState = 'ready';
  next = 0;
  previous: TracePoint | null = null;
  reset() {
    this.state = 'ready';
    this.next = 0;
    this.previous = null;
  }
  release() {
    if (this.state === 'tracing') {
      this.state = 'retry';
      this.next = 0;
    }
    this.previous = null;
  }
  sample(p: TracePoint) {
    if (this.state === 'complete') return;
    const distance = (a: TracePoint, b: TracePoint) =>
      Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (this.state !== 'tracing') {
      if (distance(p, PATH[0]) > 0.115) return;
      this.state = 'tracing';
      this.next = 1;
      this.previous = p;
      return;
    }
    // Reject teleports and leaving the stroke corridor; small frame gaps are interpolated.
    const prev = this.previous!;
    if (distance(p, prev) > 0.3 || Math.abs(p.z) > 0.18) {
      this.release();
      return;
    }
    const horizontal = Math.hypot(
      p.y - 0.45,
      Math.max(-0.45 - p.x, 0, p.x - 0.45),
    );
    const vertical = Math.hypot(
      p.x - 0.45,
      Math.max(-0.45 - p.y, 0, p.y - 0.45),
    );
    if (Math.min(horizontal, vertical) > 0.12) {
      this.release();
      return;
    }
    const dx = p.x - prev.x,
      dy = p.y - prev.y,
      dz = p.z - prev.z;
    if ((this.next <= 20 && dx < -0.025) || (this.next > 20 && dy > 0.025)) {
      this.release();
      return;
    }
    const length = dx * dx + dy * dy + dz * dz;
    while (this.next < PATH.length) {
      const q = PATH[this.next];
      const t = length
        ? Math.max(
            0,
            Math.min(
              1,
              ((q.x - prev.x) * dx +
                (q.y - prev.y) * dy +
                (q.z - prev.z) * dz) /
                length,
            ),
          )
        : 0;
      if (
        distance(q, {
          x: prev.x + t * dx,
          y: prev.y + t * dy,
          z: prev.z + t * dz,
        }) > 0.065
      )
        break;
      this.next++;
    }
    this.previous = p;
    if (this.next === PATH.length) this.state = 'complete';
  }
  get progress() {
    return this.state === 'complete'
      ? 100
      : Math.round((Math.max(0, this.next - 1) / (PATH.length - 1)) * 100);
  }
}
