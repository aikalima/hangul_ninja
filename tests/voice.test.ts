import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isFailedGesture,
  pronunciationLine,
  VOICE_LINES,
} from '../lib/voice-lines.ts';
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

void test('pronunciation choice selects sound or name for both lesson cues', () => {
  for (const cue of ['intro', 'success'] as const) {
    assert.match(pronunciationLine('name', cue).ko, /기역/);
    assert.match(pronunciationLine('sound', cue).ko, /그/);
    assert.doesNotMatch(pronunciationLine('sound', cue).ko, /기역/);
    assert.notEqual(
      pronunciationLine('name', cue).file,
      pronunciationLine('sound', cue).file,
    );
  }
});

void test('success repeats pronunciation without spoken praise', () => {
  for (const mode of ['sound', 'name'] as const) {
    const line = pronunciationLine(mode, 'success');
    assert.equal(line.file, pronunciationLine(mode, 'intro').file);
    assert.doesNotMatch(line.ko, /잘했다/);
    assert.doesNotMatch(line.en, /well done/i);
  }
});

void test('character narration plays once at start and only at full completion', async () => {
  const { MasterVoice } = await import('../components/dojo/voice.ts');
  const originalAudio = globalThis.Audio;
  const played: string[] = [];
  class FakeAudio {
    src = '';
    volume = 1;
    preload = '';
    onended = null;
    onerror = null;
    play() {
      played.push(this.src);
      return Promise.resolve();
    }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  const voice = new MasterVoice(
    () => {},
    () => {},
  );
  try {
    voice.beginCharacter();
    voice.intro();
    voice.success(50);
    voice.intro();
    assert.deepEqual(played, ['/audio/geu.wav']);
    voice.success(100);
    voice.success(100);
    assert.deepEqual(played, ['/audio/geu.wav', '/audio/geu.wav']);
    voice.beginCharacter();
    assert.equal(played.length, 3);
  } finally {
    voice.dispose();
    globalThis.Audio = originalAudio;
  }
});

void test('encouragement appears every third completion and rotates all five phrases', async () => {
  const { encouragementFor } = await import('../lib/voice-lines.ts');
  const ids = [];
  for (let i = 1; i <= 18; i++) {
    const line = encouragementFor(i);
    if (i % 3) assert.equal(line, null);
    else ids.push(line?.id);
  }
  assert.deepEqual(ids, [
    'praise-polite',
    'praise-casual',
    'praise-awesome',
    'praise-keep-going',
    'praise-best',
    'praise-polite',
  ]);
});
