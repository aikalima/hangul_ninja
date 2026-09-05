import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isFailedGesture, VOICE_LINES } from '../lib/voice-lines.ts';
void test('the master permits completed flow cuts and ignores clicks', () => {
  assert.equal(isFailedGesture(0, 21, 1), false);
  assert.equal(isFailedGesture(21, 41, 1), false);
  assert.equal(isFailedGesture(0, 0, 0.05), false);
  assert.equal(isFailedGesture(0, 41, 2), false);
});
void test('the master corrects wrong, incomplete, and interrupted gestures', () => {
  assert.equal(isFailedGesture(0, 0, 1), true);
  assert.equal(isFailedGesture(0, 10, 0.5), true);
  assert.equal(isFailedGesture(21, 30, 0.5), true);
});
void test('all voiced Korean lines have English captions and nonempty PCM assets', () => {
  for (const line of Object.values(VOICE_LINES)) {
    assert.match(line.ko, /[가-힣]/);
    assert.ok(line.en.length > 5);
    const wav = readFileSync(
      new URL(`../public/audio/${line.file}.wav`, import.meta.url),
    );
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    let found = false;
    for (let at = 12; at + 8 < wav.length;) {
      const size = wav.readUInt32LE(at + 4);
      if (wav.toString('ascii', at, at + 4) === 'data') {
        assert.ok(size > 4000);
        found = true;
        break;
      }
      at += 8 + size + (size % 2);
    }
    assert.equal(found, true);
  }
  assert.match(VOICE_LINES.intro.ko, /기역/);
  assert.match(VOICE_LINES.success.ko, /기역/);
});
