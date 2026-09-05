import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewPool, TimedReview } from '../lib/review.ts';
import { LEVELS } from '../lib/levels.ts';
void test('review includes current and previous level, with no earlier levels', () => {
  assert.deepEqual(reviewPool(0), LEVELS[0].characters.split(' '));
  assert.deepEqual(reviewPool(1), [
    ...LEVELS[0].characters.split(' '),
    ...LEVELS[1].characters.split(' '),
  ]);
  assert.deepEqual(reviewPool(2), [
    ...LEVELS[1].characters.split(' '),
    ...LEVELS[2].characters.split(' '),
  ]);
});
void test('three second default applies to each character and passing requires the whole shuffled set', () => {
  const r = new TimedReview();
  r.start(reviewPool(0), 0, () => 0);
  assert.equal(r.seconds, 3);
  assert.equal(new Set(r.order).size, 6);
  assert.notDeepEqual(r.order, reviewPool(0));
  r.complete(100);
  assert.equal(r.index, 0);
  r.tick(3000);
  assert.equal(r.state, 'active');
  assert.equal(r.deadline, 6000);
  let now = 4000;
  for (let i = 0; i < 6; i++) {
    r.complete(now);
    assert.equal(r.index, i + 1);
    if (i < 5) {
      assert.equal(r.state, 'between');
      r.tick(now + 749);
      assert.equal(r.state, 'between');
      now += 750;
      r.tick(now);
      assert.equal(r.deadline, now + 3000);
      now += 500;
    }
  }
  assert.equal(r.state, 'passed');
});
void test('timeout including exact deadline fails, and retry resets the whole review', () => {
  const r = new TimedReview();
  r.start(['ㅏ', 'ㅓ'], 0);
  r.tick(3000);
  r.complete(6000);
  assert.equal(r.state, 'failed');
  r.start(['ㅏ', 'ㅓ'], 7000);
  assert.equal(r.index, 0);
  r.tick(10000);
  r.tick(13001);
  assert.equal(r.state, 'failed');
});
void test('custom timer and interruptions cannot grant a pass', () => {
  const r = new TimedReview();
  r.seconds = 5;
  r.start(['ㅏ'], 0);
  r.tick(3000);
  assert.equal(r.deadline, 8000);
  r.interrupt();
  r.complete(4000);
  assert.equal(r.state, 'failed');
});
