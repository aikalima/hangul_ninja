import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEVELS, VOWELS, VowelLesson } from '../lib/levels.ts';
void test('six levels preserve the requested curriculum and vowel order', () => {
  assert.equal(LEVELS.length, 6);
  assert.deepEqual(
    VOWELS.map((v) => v.glyph),
    ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ'],
  );
  assert.deepEqual(
    VOWELS.map((v) => v.cuts.length),
    [2, 2, 2, 2, 1, 1],
  );
});
void test('all six vowels accept ordered sweeps and finish only on the final cut', () => {
  for (const vowel of VOWELS) {
    const lesson = new VowelLesson(vowel.cuts);
    let time = 0;
    vowel.cuts.forEach((cut, i) => {
      const a = cut[0],
        b = cut[20],
        dx = b.x - a.x,
        dy = b.y - a.y;
      lesson.sample({ ...a, x: a.x - dx * 0.15, y: a.y - dy * 0.15 }, time);
      lesson.sample(
        { ...b, x: b.x + dx * 0.15, y: b.y + dy * 0.15 },
        time + 80,
      );
      assert.equal(lesson.completedCuts, i + 1, vowel.glyph);
      assert.equal(
        lesson.state === 'complete',
        i === vowel.cuts.length - 1,
        vowel.glyph,
      );
      lesson.release();
      time += 500;
    });
    assert.equal(lesson.progress, 100);
    lesson.reset();
    assert.equal(lesson.progress, 0);
  }
});
void test('vowels reject reversed cuts and do not connect across releases or tracking gaps', () => {
  for (const vowel of VOWELS) {
    const lesson = new VowelLesson(vowel.cuts),
      a = vowel.cuts[0][0],
      b = vowel.cuts[0][20];
    lesson.sample(b, 0);
    lesson.sample(a, 80);
    assert.equal(lesson.progress, 0);
    lesson.reset();
    lesson.sample(a, 100);
    lesson.release();
    lesson.sample(b, 150);
    assert.equal(lesson.progress, 0);
    lesson.reset();
    lesson.sample(a, 200);
    lesson.sample(b, 700);
    assert.equal(lesson.progress, 0);
  }
});
void test('a partial second cut resets only that cut; out-of-order strokes cannot complete a vowel', () => {
  const vowel = VOWELS[0],
    lesson = new VowelLesson(vowel.cuts);
  lesson.sample(vowel.cuts[1][0], 0);
  lesson.sample(vowel.cuts[1][20], 80);
  assert.equal(lesson.progress, 0);
  lesson.release();
  lesson.sample(vowel.cuts[0][0], 100);
  lesson.sample(vowel.cuts[0][20], 180);
  lesson.release();
  lesson.sample(vowel.cuts[1][0], 200);
  lesson.sample(vowel.cuts[1][5], 260);
  lesson.release();
  assert.equal(lesson.completedCuts, 1);
  assert.equal(lesson.progress, 50);
});
void test('each vowel has a nonempty bundled pronunciation', () => {
  for (const vowel of VOWELS) {
    const wav = readFileSync(
      new URL(`../public/audio/vowel-${vowel.roman}.wav`, import.meta.url),
    );
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.ok(wav.length > 4000);
  }
});
