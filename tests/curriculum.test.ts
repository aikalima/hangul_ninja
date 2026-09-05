import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRICULUM, followingLevel, cutDirection } from '../lib/curriculum.ts';
import { VowelLesson } from '../lib/levels.ts';

void test('all 40 characters are unique, playable, and bundled with sound/name clips', () => {
  assert.deepEqual(
    CURRICULUM.map((l) => l.length),
    [6, 9, 4, 5, 5, 11],
  );
  assert.equal(new Set(CURRICULUM.flat().map((c) => c.glyph)).size, 40);
  for (const c of CURRICULUM.flat()) {
    for (const file of new Set([c.file, c.nameFile])) {
      const wav = readFileSync(
        new URL(`../public/audio/${file}.wav`, import.meta.url),
      );
      assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
      assert.ok(wav.length > 4000, file);
    }
    const lesson = new VowelLesson(c.cuts);
    let time = 0;
    c.cuts.forEach((cut, i) => {
      assert.equal(cut.length, 21);
      cut.forEach((p) => {
        lesson.sample(p, time);
        time += 12;
      });
      assert.equal(lesson.completedCuts, i + 1, `${c.glyph} cut ${i + 1}`);
      assert.equal(lesson.state === 'complete', i === c.cuts.length - 1);
      lesson.release();
      time += 100;
    });
    assert.equal(lesson.progress, 100, c.glyph);
  }
});
void test('reverse sweeps and circle shortcuts cannot complete their characters', () => {
  for (const c of CURRICULUM.flat()) {
    const lesson = new VowelLesson(c.cuts);
    [...c.cuts[0]].reverse().forEach((p, i) => lesson.sample(p, i * 12));
    assert.equal(lesson.completedCuts, 0, c.glyph);
  }
  const c = CURRICULUM[1].find((c) => c.glyph === 'ㅇ')!;
  const lesson = new VowelLesson(c.cuts);
  lesson.sample(c.cuts[0][0], 0);
  lesson.sample(c.cuts[0][20], 80);
  assert.equal(lesson.completedCuts, 0);
  assert.equal(cutDirection(c.cuts[0]), '↶');
});
void test('level progression ends after Level 6', () => {
  assert.deepEqual(
    CURRICULUM.map((_, i) => followingLevel(i)),
    [1, 2, 3, 4, 5, null],
  );
});
