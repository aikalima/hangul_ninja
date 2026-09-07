import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CURRICULUM } from '../lib/curriculum.ts';
import { EXAMPLE_WORDS, EXAMPLE_DISPLAY_MS } from '../lib/example-words.ts';

void test('every lesson letter has a correctly highlighted Korean syllable and playable word audio', () => {
  const initial = Array.from('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
  const medial = Array.from('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ');
  assert.equal(Object.keys(EXAMPLE_WORDS).length, 40);
  for (const { glyph } of CURRICULUM.flat()) {
    const example = EXAMPLE_WORDS[glyph];
    assert.ok(example, glyph);
    const block = example.word.codePointAt(example.syllableIndex)! - 0xac00;
    assert.ok(block >= 0 && block < 11172, example.word);
    assert.ok([initial[Math.floor(block / 588)], medial[Math.floor(block / 28) % 21]].includes(glyph), `${glyph} in ${example.word}`);
    const wav = readFileSync(new URL(`../public/audio/${example.file}.wav`, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    let audioBytes = 0;
    for (let at = 12; at + 8 <= wav.length;) {
      const size = wav.readUInt32LE(at + 4);
      if (wav.toString('ascii', at, at + 4) === 'data') audioBytes = size;
      at += 8 + size + (size % 2);
    }
    assert.ok(audioBytes > 4000, `${example.word}: nonempty PCM audio`);
    // Generated audio is 22.05 kHz, 16-bit mono; allow time for praise afterward.
    assert.ok(audioBytes / 44100 * 1000 < EXAMPLE_DISPLAY_MS - 3500, example.word);
  }
});

void test('completion reads the example word once after the delay and reset cancels it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { MasterVoice } = await import('../components/dojo/voice.ts');
  const originalAudio = globalThis.Audio;
  const played: string[] = [];
  class FakeAudio {
    src = '';
    play() { played.push(this.src); return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  const voice = new MasterVoice(() => {}, () => {});
  try {
    voice.setCharacter(CURRICULUM[0][0]);
    voice.beginCharacter();
    played.length = 0;
    voice.success(50);
    t.mock.timers.tick(500);
    assert.equal(played.length, 0);
    voice.success(100);
    voice.success(100);
    t.mock.timers.tick(499);
    assert.equal(played.length, 0);
    t.mock.timers.tick(1);
    assert.deepEqual(played, ['/audio/example-1.wav']);
    voice.beginCharacter();
    voice.success(100);
    voice.setCharacter(CURRICULUM[0][1]);
    const count = played.length;
    t.mock.timers.tick(500);
    assert.equal(played.length, count);
  } finally {
    voice.dispose();
    globalThis.Audio = originalAudio;
  }
});

void test('example words take priority and queued comments follow after one second, including replay', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { MasterVoice } = await import('../components/dojo/voice.ts');
  const { VOICE_LINES } = await import('../lib/voice-lines.ts');
  const originalAudio = globalThis.Audio;
  const played: string[] = [];
  const players: FakeAudio[] = [];
  class FakeAudio {
    src = '';
    onended: (() => void) | null = null;
    constructor() { players.push(this); }
    play() { played.push(this.src); return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  const voice = new MasterVoice(() => {}, () => {});
  try {
    voice.setCharacter(CURRICULUM[0][0]);
    voice.success(100, true);
    t.mock.timers.tick(500);
    const word = '/audio/example-1.wav';
    assert.deepEqual(played, [word]);
    for (let i = 0; i < 3; i++) voice.mistake();
    t.mock.timers.tick(2000);
    assert.deepEqual(played, [word], 'comments cannot interrupt the word');
    players.at(-1)!.onended!();
    t.mock.timers.tick(999);
    assert.deepEqual(played, [word]);
    assert.equal(voice.completionPending, true, 'auto-advance waits during the gap');
    voice.replayExample();
    t.mock.timers.tick(1);
    assert.deepEqual(played, [word, word], 'replay cancels the earlier comment timer');
    players.at(-1)!.onended!();
    t.mock.timers.tick(999);
    assert.equal(played.length, 2);
    t.mock.timers.tick(1);
    assert.deepEqual(played, [word, word, `/audio/${VOICE_LINES.levelComplete.file}.wav`]);
    assert.equal(voice.completionPending, true, 'auto-advance waits for the comment');
    players.at(-1)!.onended!();
    assert.equal(voice.completionPending, false);
  } finally {
    voice.dispose();
    globalThis.Audio = originalAudio;
  }
});

void test('reset, mute and disposal cancel comments waiting after the word', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { MasterVoice } = await import('../components/dojo/voice.ts');
  const originalAudio = globalThis.Audio;
  const played: string[] = [];
  const players: FakeAudio[] = [];
  class FakeAudio {
    src = '';
    onended: (() => void) | null = null;
    constructor() { players.push(this); }
    play() { played.push(this.src); return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  try {
    for (const action of ['reset', 'mute', 'dispose']) {
      const voice = new MasterVoice(() => {}, () => {});
      voice.setCharacter(CURRICULUM[0][0]);
      voice.success(100, true);
      t.mock.timers.tick(500);
      players.at(-1)!.onended!();
      if (action === 'reset') voice.setCharacter(CURRICULUM[0][1]);
      else if (action === 'mute') voice.setEnabled(false);
      else voice.dispose();
      const count = played.length;
      t.mock.timers.tick(1000);
      assert.equal(played.length, count, action);
      assert.equal(voice.completionPending, false, action);
      voice.dispose();
    }
  } finally {
    globalThis.Audio = originalAudio;
  }
});
