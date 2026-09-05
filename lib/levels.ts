import type { TracePoint, TraceState } from './tracing.ts';
export const LEVELS = [
  {
    title: 'Basic vowels',
    characters: 'ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ',
    description: 'Six simple shapes. Your first foundation.',
  },
  {
    title: 'Basic consonants',
    characters: 'ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ',
    description: 'Build the core consonant shapes.',
  },
  {
    title: 'Y vowels',
    characters: 'ㅑ ㅕ ㅛ ㅠ',
    description: 'Add a stroke to the basic vowels.',
  },
  {
    title: 'Aspirated consonants',
    characters: 'ㅋ ㅌ ㅍ ㅊ ㅎ',
    description: 'Add a stroke and a puff of air.',
  },
  {
    title: 'Tense consonants',
    characters: 'ㄲ ㄸ ㅃ ㅆ ㅉ',
    description: 'Doubled shapes, tense sounds.',
  },
  {
    title: 'Compound vowels',
    characters: 'ㅐ ㅔ ㅒ ㅖ ㅘ ㅝ ㅚ ㅟ ㅙ ㅞ ㅢ',
    description: 'Combine familiar vowels.',
  },
];
const cut = (ax: number, ay: number, bx: number, by: number) =>
  Array.from({ length: 21 }, (_, i) => ({
    x: ax + ((bx - ax) * i) / 20,
    y: ay + ((by - ay) * i) / 20,
    z: 0,
  }));
export const VOWELS = [
  {
    glyph: 'ㅏ',
    roman: 'a',
    spoken: '아',
    cuts: [cut(0, 0.45, 0, -0.45), cut(0, 0, 0.4, 0)],
    directions: ['Down the long stem', 'Right from the middle'],
  },
  {
    glyph: 'ㅓ',
    roman: 'eo',
    spoken: '어',
    cuts: [cut(-0.4, 0, 0, 0), cut(0, 0.45, 0, -0.45)],
    directions: ['Right toward the stem', 'Down the long stem'],
  },
  {
    glyph: 'ㅗ',
    roman: 'o',
    spoken: '오',
    cuts: [cut(0, 0.4, 0, 0), cut(-0.45, 0, 0.45, 0)],
    directions: ['Down the short stem', 'Right across the base'],
  },
  {
    glyph: 'ㅜ',
    roman: 'u',
    spoken: '우',
    cuts: [cut(-0.45, 0, 0.45, 0), cut(0, 0, 0, -0.4)],
    directions: ['Right across the top', 'Down from the middle'],
  },
  {
    glyph: 'ㅡ',
    roman: 'eu',
    spoken: '으',
    cuts: [cut(-0.45, 0, 0.45, 0)],
    directions: ['Right in one broad sweep'],
  },
  {
    glyph: 'ㅣ',
    roman: 'i',
    spoken: '이',
    cuts: [cut(0, 0.45, 0, -0.45)],
    directions: ['Down in one broad cut'],
  },
];
export type Vowel = (typeof VOWELS)[number];
/** Each disconnected stroke is its own ordered sweep; recovery never draws a connector. */
export class VowelLesson {
  state: TraceState = 'ready';
  next = 0;
  completedCuts = 0;
  previous: TracePoint | null = null;
  private lastTime = 0;
  cuts: TracePoint[][];
  constructor(cuts: TracePoint[][]) {
    this.cuts = cuts;
  }
  get path() {
    return this.cuts.flat();
  }
  get progress() {
    return this.state === 'complete'
      ? 100
      : Math.min(99, Math.round((this.next / (this.cuts.length * 21)) * 100));
  }
  reset() {
    this.state = 'ready';
    this.next = 0;
    this.completedCuts = 0;
    this.previous = null;
    this.lastTime = 0;
  }
  release() {
    this.previous = null;
    if (this.state !== 'complete') {
      this.next = this.completedCuts * 21;
      this.state = this.next ? 'tracing' : 'ready';
    }
  }
  sample(p: TracePoint, time = performance.now()) {
    if (this.state === 'complete') return;
    const prev = this.previous,
      gap = time - this.lastTime;
    this.previous = { ...p };
    this.lastTime = time;
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
    const points = this.cuts[this.completedCuts];
    const dx = p.x - prev.x,
      dy = p.y - prev.y,
      length = dx * dx + dy * dy;
    if (length < 1e-8) return;
    const pointIndex = Math.min(19, this.next % 21);
    const a = points[pointIndex],
      b = points[pointIndex + 1];
    const sx = b.x - a.x,
      sy = b.y - a.y,
      along = dx * sx + dy * sy,
      cross = dx * sy - dy * sx;
    if (along <= 0 || Math.abs(cross) > along * 1.1) return;
    const end = (this.completedCuts + 1) * 21;
    while (this.next < end) {
      const q = points[this.next % 21];
      const t = Math.max(
        0,
        Math.min(1, ((q.x - prev.x) * dx + (q.y - prev.y) * dy) / length),
      );
      if (Math.hypot(q.x - prev.x - t * dx, q.y - prev.y - t * dy) > 0.06)
        break;
      this.next++;
      this.state = 'tracing';
    }
    if (this.next === end) {
      this.completedCuts++;
      this.previous = null;
      if (this.completedCuts === this.cuts.length) this.state = 'complete';
    }
  }
}
