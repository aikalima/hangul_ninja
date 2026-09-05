import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TraceLesson, PATH } from '../lib/tracing.ts';

void test('completes a continuous right-then-down stroke', () => {
  const lesson = new TraceLesson();
  PATH.forEach((p) => lesson.sample(p));
  assert.equal(lesson.state, 'complete');
  assert.equal(lesson.progress, 100);
});
void test('cannot start at the corner or trace in reverse', () => {
  const lesson = new TraceLesson();
  [...PATH].reverse().forEach((p) => lesson.sample(p));
  assert.notEqual(lesson.state, 'complete');
  assert.equal(lesson.progress, 0);
});
void test('releasing at the corner requires restarting', () => {
  const lesson = new TraceLesson();
  PATH.slice(0, 21).forEach((p) => lesson.sample(p));
  lesson.release();
  PATH.slice(21).forEach((p) => lesson.sample(p));
  assert.equal(lesson.state, 'retry');
  assert.equal(lesson.progress, 0);
  PATH.forEach((p) => lesson.sample(p));
  assert.equal(lesson.state, 'complete');
});
void test('rejects teleporting to the end and leaving the guide plane', () => {
  const lesson = new TraceLesson();
  lesson.sample(PATH[0]);
  lesson.sample(PATH[40]);
  assert.equal(lesson.state, 'retry');
  lesson.reset();
  lesson.sample(PATH[0]);
  lesson.sample({ ...PATH[1], z: 0.25 });
  assert.equal(lesson.state, 'retry');
});
void test('interpolates realistic frame gaps and tolerates small controller noise', () => {
  const lesson = new TraceLesson();
  PATH.filter((_, i) => i % 3 === 0 || i === 20 || i === 40).forEach((p) =>
    lesson.sample({ ...p, x: p.x + 0.008, y: p.y - 0.008, z: 0.02 }),
  );
  assert.equal(lesson.state, 'complete');
});
void test('a diagonal shortcut does not pass the corner', () => {
  const lesson = new TraceLesson();
  lesson.sample(PATH[0]);
  for (let i = 1; i <= 20; i++)
    lesson.sample({ x: -0.45 + i * 0.045, y: 0.45 - i * 0.045, z: 0 });
  assert.notEqual(lesson.state, 'complete');
});
void test('reset clears completion and allows another attempt', () => {
  const lesson = new TraceLesson();
  PATH.forEach((p) => lesson.sample(p));
  lesson.reset();
  assert.equal(lesson.state, 'ready');
  assert.equal(lesson.progress, 0);
  PATH.forEach((p) => lesson.sample(p));
  assert.equal(lesson.state, 'complete');
});
