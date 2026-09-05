import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FlowLesson } from '../lib/tracing.ts';

void test('flow accepts fast sweeping cuts with depth variation', () => {
  const lesson = new FlowLesson();
  lesson.sample({ x: -0.6, y: 0.5, z: 0.25 }, 0);
  lesson.sample({ x: 0.58, y: 0.48, z: -0.2 }, 80);
  assert.equal(lesson.progress, 50);
  lesson.sample({ x: 0.48, y: 0.5, z: 0.1 }, 100);
  lesson.sample({ x: 0.48, y: -0.56, z: 0.28 }, 170);
  assert.equal(lesson.state, 'complete');
});
void test('flow preserves a landed slash during recovery but restarts an unfinished cut', () => {
  const lesson = new FlowLesson();
  lesson.sample({ x: -0.55, y: 0.45, z: 0 }, 0);
  lesson.sample({ x: 0, y: 0.45, z: 0 }, 50);
  lesson.release();
  assert.equal(lesson.progress, 0);
  lesson.sample({ x: -0.55, y: 0.45, z: 0 }, 100);
  lesson.sample({ x: 0.55, y: 0.45, z: 0 }, 160);
  lesson.release();
  assert.equal(lesson.progress, 50);
  lesson.sample({ x: 0.45, y: 0.55, z: 0 }, 1000);
  lesson.sample({ x: 0.45, y: -0.55, z: 0 }, 1080);
  assert.equal(lesson.state, 'complete');
});
void test('flow rejects reversed cuts, out-of-order cuts, and diagonal shortcuts', () => {
  for (const [a, b] of [
    [
      { x: 0.55, y: 0.45, z: 0 },
      { x: -0.55, y: 0.45, z: 0 },
    ],
    [
      { x: 0.45, y: 0.55, z: 0 },
      { x: 0.45, y: -0.55, z: 0 },
    ],
    [
      { x: -0.55, y: 0.55, z: 0 },
      { x: 0.55, y: -0.55, z: 0 },
    ],
  ]) {
    const lesson = new FlowLesson();
    lesson.sample(a, 0);
    lesson.sample(b, 80);
    assert.equal(lesson.progress, 0);
  }
});
void test('flow never connects across releases, stale poses, or teleports', () => {
  const lesson = new FlowLesson();
  lesson.sample({ x: -0.55, y: 0.45, z: 0 }, 0);
  lesson.release();
  lesson.sample({ x: 0.55, y: 0.45, z: 0 }, 50);
  assert.equal(lesson.progress, 0);
  lesson.reset();
  lesson.sample({ x: -0.55, y: 0.45, z: 0 }, 0);
  lesson.sample({ x: 0.55, y: 0.45, z: 0 }, 1000);
  assert.equal(lesson.progress, 0);
  lesson.reset();
  lesson.sample({ x: -2, y: 0.45, z: 0 }, 0);
  lesson.sample({ x: 2, y: 0.45, z: 0 }, 50);
  assert.equal(lesson.progress, 0);
});
void test('flow requires cuts near the guide and does not finish by wiggling at its start', () => {
  const lesson = new FlowLesson();
  lesson.sample({ x: -0.55, y: 0.45, z: 0.7 }, 0);
  lesson.sample({ x: 0.55, y: 0.45, z: 0.7 }, 80);
  assert.equal(lesson.progress, 0);
  lesson.reset();
  for (let i = 0; i < 30; i++)
    lesson.sample({ x: -0.45 + (i % 2) * 0.02, y: 0.45, z: 0 }, i * 10);
  assert.ok(lesson.progress < 20);
});
