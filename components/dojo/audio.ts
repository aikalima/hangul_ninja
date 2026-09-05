type Position = { x: number; y: number; z: number };

/** Original procedural score and spatial effects. Nothing downloads or autoplays. */
export class DojoAudio {
  private readonly createContext: () => AudioContext;
  constructor(createContext: () => AudioContext = () => new AudioContext()) {
    this.createContext = createContext;
  }
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private effects = true;
  private music = false;
  private ducked = false;
  private volume = 0.5;
  private nextBeat = 0;
  private beat = 0;
  private lastSwish = 0;
  private disposed = false;

  unlock() {
    if (this.disposed) return;
    if (!this.context) {
      const ctx = this.createContext();
      this.context = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -16;
      limiter.ratio.value = 8;
      this.master.connect(limiter).connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.effectsBus = ctx.createGain();
      this.musicBus.gain.value = this.music ? (this.ducked ? 0.18 : 0.65) : 0;
      this.effectsBus.gain.value = this.effects ? 0.8 : 0;
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      // A soft wind bed under the plucked melody and low drum pulse.
      const wind = ctx.createBufferSource();
      wind.buffer = this.noise;
      wind.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const gain = ctx.createGain();
      gain.gain.value = 0.025;
      wind.connect(filter).connect(gain).connect(this.musicBus);
      wind.start();
      this.nextBeat = ctx.currentTime + 0.08;
    }
    void this.context.resume().catch(() => {});
  }
  setEffects(value: boolean) {
    this.effects = value;
    this.unlock();
    this.effectsBus?.gain.setTargetAtTime(
      value ? 0.8 : 0,
      this.context!.currentTime,
      0.025,
    );
  }
  setMusic(value: boolean) {
    this.music = value;
    this.unlock();
    this.musicBus?.gain.setTargetAtTime(
      value ? (this.ducked ? 0.18 : 0.65) : 0,
      this.context!.currentTime,
      0.08,
    );
  }
  duck(active: boolean) {
    this.ducked = active;
    if (this.context)
      this.musicBus?.gain.setTargetAtTime(
        this.music ? (active ? 0.18 : 0.65) : 0,
        this.context.currentTime,
        0.08,
      );
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.unlock();
    this.master?.gain.setTargetAtTime(
      this.volume,
      this.context!.currentTime,
      0.025,
    );
  }
  private note(
    frequency: number,
    at: number,
    duration: number,
    level: number,
    drum = false,
  ) {
    const ctx = this.context!,
      oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = drum ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, at);
    if (drum) oscillator.frequency.exponentialRampToValueAtTime(45, at + 0.2);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(this.musicBus!);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  tick(energy: number) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    if (this.nextBeat < ctx.currentTime - 0.2)
      this.nextBeat = ctx.currentTime + 0.03;
    const melody = [
      293.66, 0, 349.23, 440, 0, 523.25, 440, 0, 349.23, 0, 293.66, 261.63, 0,
      220, 261.63, 0,
    ];
    while (this.nextBeat < ctx.currentTime + 0.15) {
      if (this.music) {
        const note = melody[this.beat % melody.length];
        if (note) this.note(note, this.nextBeat, 1.35, 0.075);
        if (this.beat % 4 === 0)
          this.note(115, this.nextBeat, 0.45, 0.18, true);
        if (energy > 0.35 && this.beat % 4 === 2)
          this.note(155, this.nextBeat, 0.22, 0.07, true);
        if (this.beat % 16 === 0) this.note(146.83, this.nextBeat, 5.5, 0.035);
      }
      this.beat++;
      this.nextBeat += 60 / 88 / 2;
    }
  }
  listener(position: Position, forward: Position, up: Position) {
    const listener = this.context?.listener;
    if (!listener) return;
    listener.positionX.value = position.x;
    listener.positionY.value = position.y;
    listener.positionZ.value = position.z;
    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;
    listener.upX.value = up.x;
    listener.upY.value = up.y;
    listener.upZ.value = up.z;
  }
  private spatial(position: Position) {
    const panner = this.context!.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.rolloffFactor = 0.6;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    panner.connect(this.effectsBus!);
    return panner;
  }
  swish(speed: number, position: Position) {
    const ctx = this.context;
    if (
      !ctx ||
      ctx.state !== 'running' ||
      !this.effects ||
      speed < 0.7 ||
      ctx.currentTime - this.lastSwish < 0.19
    )
      return;
    this.lastSwish = ctx.currentTime;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain(),
      panner = this.spatial(position);
    source.buffer = this.noise;
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(
      800 + Math.min(speed, 8) * 180,
      ctx.currentTime,
    );
    filter.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.23);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.min(0.32, 0.06 + speed * 0.035),
      ctx.currentTime + 0.035,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.27);
    source.connect(filter).connect(gain).connect(panner);
    source.start();
    source.stop(ctx.currentTime + 0.29);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }
  impact(position: Position, complete = false, miss = false) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.effects) return;
    const notes = miss
      ? [130]
      : complete
        ? [440, 554.37, 659.25, 880]
        : [330, 660];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        panner = this.spatial(position),
        at = ctx.currentTime + index * 0.055;
      oscillator.type = miss ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.exponentialRampToValueAtTime(miss ? 0.12 : 0.15, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        at + (complete ? 1.3 : 0.45),
      );
      oscillator.connect(gain).connect(panner);
      oscillator.start(at);
      oscillator.stop(at + 1.4);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        panner.disconnect();
      };
    });
  }
  pause(hidden: boolean) {
    if (!this.context || this.disposed) return;
    void (hidden ? this.context.suspend() : this.context.resume()).catch(
      () => {},
    );
  }
  dispose() {
    this.disposed = true;
    void this.context?.close().catch(() => {});
  }
}
