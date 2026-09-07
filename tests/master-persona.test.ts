import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { masterAudioPath } from '../lib/master-persona.ts';
import { CURRICULUM } from '../lib/curriculum.ts';
import { EXAMPLE_WORDS } from '../lib/example-words.ts';
import { VOICE_LINES } from '../lib/voice-lines.ts';

void test('both masters have playable audio for all letters, words and comments', () => {
  const files = new Set([
    ...CURRICULUM.flatMap((level) => level.flatMap((c) => [c.file, c.nameFile])),
    ...Object.values(EXAMPLE_WORDS).map((e) => e.file),
    ...Object.values(VOICE_LINES).map((line) => line.file),
  ]);
  for (const file of files) {
    for (const persona of ['yuna', 'minho'] as const) {
      const wav = readFileSync(`public${masterAudioPath(file, persona)}`);
      assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
      assert.ok(wav.length > 4000, `${persona}: ${file}`);
    }
    assert.notDeepEqual(readFileSync(`public${masterAudioPath(file, 'yuna')}`), readFileSync(`public${masterAudioPath(file, 'minho')}`));
  }
});
