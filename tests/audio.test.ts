import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DojoAudio } from '../components/dojo/audio.ts';

// Verify scheduling/lifecycle and independent buses without browser audio hardware.
function mockAudio() {
  const param = () => ({
    value: 0,
    setValueAtTime(v: number) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    },
    setTargetAtTime(v: number) {
      this.value = v;
    },
  });
  const gains: ReturnType<typeof node>[] = [];
  let starts = 0,
    closes = 0,
    creates = 0;
  function node() {
    return {
      gain: param(),
      frequency: param(),
      Q: param(),
      threshold: param(),
      ratio: param(),
      positionX: param(),
      positionY: param(),
      positionZ: param(),
      connect(other: unknown) {
        return other;
      },
      disconnect() {},
      start() {
        starts++;
      },
      stop() {},
      onended: null,
    };
  }
  const context = {
    currentTime: 0,
    state: 'running',
    sampleRate: 1000,
    destination: node(),
    listener: {
      positionX: param(),
      positionY: param(),
      positionZ: param(),
      forwardX: param(),
      forwardY: param(),
      forwardZ: param(),
      upX: param(),
      upY: param(),
      upZ: param(),
    },
    createGain() {
      const gain = node();
      gains.push(gain);
      return gain;
    },
    createDynamicsCompressor: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createOscillator: node,
    createPanner: node,
    createBuffer() {
      return {
        getChannelData() {
          return new Float32Array(500);
        },
      };
    },
    async resume() {
      this.state = 'running';
    },
    async suspend() {
      this.state = 'suspended';
    },
    async close() {
      closes++;
      this.state = 'closed';
    },
  };
  const audio = new DojoAudio(() => {
    creates++;
    return context as unknown as AudioContext;
  });
  return { audio, context, gains, stats: () => ({ starts, closes, creates }) };
}
void test('audio stays locked until interaction and initializes only once', () => {
  const { audio, stats } = mockAudio();
  audio.tick(1);
  assert.equal(stats().creates, 0);
  audio.unlock();
  audio.unlock();
  assert.equal(stats().creates, 1);
  const before = stats().starts;
  audio.tick(1);
  assert.ok(stats().starts > before);
  audio.dispose();
  assert.equal(stats().closes, 1);
});
void test('music and effects mute independently and volume clamps', () => {
  const { audio, gains, context, stats } = mockAudio();
  audio.unlock();
  audio.setMusic(false);
  assert.equal(gains[1].gain.value, 0);
  assert.equal(gains[2].gain.value, 0.8);
  const before = stats().starts;
  audio.tick(1);
  assert.equal(stats().starts, before);
  audio.impact({ x: 0, y: 1, z: -1 });
  assert.ok(stats().starts > before);
  audio.setEffects(false);
  const muted = stats().starts;
  audio.impact({ x: 0, y: 1, z: -1 }, true);
  context.currentTime = 1;
  audio.swish(5, { x: 0, y: 1, z: -1 });
  assert.equal(stats().starts, muted);
  audio.setVolume(2);
  assert.equal(gains[0].gain.value, 1);
  audio.setVolume(-1);
  assert.equal(gains[0].gain.value, 0);
  audio.setMusic(true);
  assert.equal(gains[1].gain.value, 0.65);
  assert.equal(gains[2].gain.value, 0);
  audio.dispose();
});
void test('swishes are speed-gated and throttled; hidden audio pauses', () => {
  const { audio, context, stats } = mockAudio();
  audio.unlock();
  context.currentTime = 1;
  const before = stats().starts;
  audio.swish(0.1, { x: 0, y: 0, z: 0 });
  assert.equal(stats().starts, before);
  audio.swish(4, { x: 0, y: 0, z: 0 });
  assert.equal(stats().starts, before + 1);
  audio.swish(6, { x: 0, y: 0, z: 0 });
  assert.equal(stats().starts, before + 1);
  audio.pause(true);
  assert.equal(context.state, 'suspended');
  audio.tick(1);
  assert.equal(stats().starts, before + 1);
  audio.pause(false);
  assert.equal(context.state, 'running');
  audio.dispose();
  audio.unlock();
  assert.equal(context.state, 'closed');
});
