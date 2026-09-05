import { LEVELS } from './levels.ts';
export function reviewPool(levelIndex: number): string[] {
  return [
    ...new Set(
      LEVELS.slice(Math.max(0, levelIndex - 1), levelIndex + 1).flatMap((l) =>
        l.characters.split(' '),
      ),
    ),
  ];
}
export class TimedReview {
  state: 'ready' | 'countdown' | 'active' | 'between' | 'passed' | 'failed' =
    'ready';
  order: string[] = [];
  index = 0;
  deadline = 0;
  seconds = 3;
  start(pool: string[], now: number, random = Math.random) {
    this.order = [...pool];
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    }
    this.index = 0;
    this.state = 'countdown';
    this.deadline = now + 3000;
  }
  tick(now: number) {
    if (now < this.deadline) return;
    if (this.state === 'countdown' || this.state === 'between') {
      this.state = 'active';
      this.deadline = now + this.seconds * 1000;
    } else if (this.state === 'active') this.state = 'failed';
  }
  complete(now: number) {
    if (this.state !== 'active') return;
    if (now >= this.deadline) {
      this.state = 'failed';
      return;
    }
    this.index++;
    if (this.index === this.order.length) this.state = 'passed';
    else {
      this.state = 'between';
      this.deadline = now + 750;
    }
  }
  remaining(now: number) {
    return Math.max(0, (this.deadline - now) / 1000);
  }
  interrupt() {
    if (['countdown', 'active', 'between'].includes(this.state))
      this.state = 'failed';
  }
}
