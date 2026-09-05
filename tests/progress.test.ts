import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM } from '../lib/curriculum.ts';
import { parseProgress, progressCheckpoint, PROGRESS_COOKIE } from '../lib/progress.ts';
const cookie = (value: unknown) => `${PROGRESS_COOKIE}=${encodeURIComponent(JSON.stringify(value))}`;

void test('progress survives cookie encoding and unrelated cookies', () => {
  const saved = progressCheckpoint(2, 1, 1);
  assert.deepEqual(parseProgress(`theme=dark; ${cookie(saved)}; other=value`), saved);
});
void test('completed characters resume at the next character, while level endings wait', () => {
  for (let level = 0; level < CURRICULUM.length; level++) {
    const characters = CURRICULUM[level];
    for (let index = 0; index < characters.length; index++) {
      const saved = progressCheckpoint(level, index, characters[index].cuts.length);
      assert.equal(saved.levelIndex, level);
      assert.equal(saved.characterIndex, Math.min(index + 1, characters.length - 1));
      assert.equal(saved.completedCuts, index === characters.length - 1 ? characters[index].cuts.length : 0);
      assert.deepEqual(parseProgress(cookie(saved)), saved);
    }
  }
});
void test('invalid, outdated and out-of-range progress is ignored', () => {
  for (const invalid of [null, {}, {version: 2},
    {version: 1, levelIndex: -1, characterIndex: 0, completedCuts: 0},
    {version: 1, levelIndex: 6, characterIndex: 0, completedCuts: 0},
    {version: 1, levelIndex: 0, characterIndex: 50, completedCuts: 0},
    {version: 1, levelIndex: 0, characterIndex: 0, completedCuts: -1},
    {version: 1, levelIndex: 0, characterIndex: 0, completedCuts: 999},
    {version: 1, levelIndex: 0, characterIndex: 0.5, completedCuts: 0},
  ]) assert.equal(parseProgress(cookie(invalid)), null);
  assert.equal(parseProgress(`${PROGRESS_COOKIE}=%broken`), null);
  assert.equal(parseProgress(''), null);
});
