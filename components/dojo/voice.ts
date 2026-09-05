import {
  VOICE_LINES,
  pronunciationLine,
  encouragementFor,
  type PronunciationMode,
  type VoiceLine,
} from '../../lib/voice-lines.ts';

export class MasterVoice {
  private player: HTMLAudioElement;
  private enabled = true;
  private pronunciation: PronunciationMode = 'sound';
  private introduced = false;
  private completed = false;
  private character: {
    spoken: string;
    roman: string;
    glyph: string;
    file?: string;
    name?: string;
    nameFile?: string;
  } | null = null;
  setCharacter(value: NonNullable<MasterVoice['character']>) {
    this.pause();
    this.character = value;
  }
  private characterLine(cue: 'intro' | 'success'): VoiceLine {
    if (!this.character) return pronunciationLine(this.pronunciation, cue);
    const named = this.pronunciation === 'name';
    return {
      id: cue,
      file:
        (named ? this.character.nameFile : this.character.file) ??
        'vowel-' + this.character.roman,
      ko: (named ? this.character.name : undefined) ?? this.character.spoken,
      en:
        this.character.glyph +
        ' · ' +
        (named
          ? (this.character.name ?? this.character.spoken)
          : this.character.roman),
    };
  }
  private completions = 0;
  private pendingPraise: VoiceLine | null = null;
  private lastMistake = -Infinity;
  private mistakeIndex = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private completionTimer: ReturnType<typeof setTimeout> | undefined;
  private cancelCompletion() {
    clearTimeout(this.completionTimer);
    this.completionTimer = undefined;
  }
  private disposed = false;
  constructor(
    privateLine: (line: VoiceLine | null) => void,
    privateDuck: (active: boolean) => void,
  ) {
    this.onLine = privateLine;
    this.duck = privateDuck;
    this.player = new Audio('/audio/geu.wav');
    this.player.preload = 'auto';
    this.player.volume = 0.5;
    this.player.onended = () => {
      const praise = this.pendingPraise;
      this.pendingPraise = null;
      if (praise && this.enabled && !this.disposed) {
        this.speak(praise);
        return;
      }
      this.duck(false);
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.clear(), 1800);
    };
    this.player.onerror = () => {
      this.pendingPraise = null;
      this.duck(false);
      this.onLine(
        this.current
          ? {
              ...this.current,
              en: this.current.en + ' (Voice unavailable; try Hear.)',
            }
          : null,
      );
    };
  }
  private onLine: (line: VoiceLine | null) => void;
  private duck: (active: boolean) => void;
  private current: VoiceLine | null = null;
  private clear() {
    if (this.timer) clearTimeout(this.timer);
    this.current = null;
    this.duck(false);
    this.onLine(null);
  }
  private speak(line: VoiceLine) {
    if (this.disposed) return;
    this.cancelCompletion();
    this.pendingPraise = null;
    this.player.pause();
    this.clear();
    this.current = line;
    this.onLine(line);
    this.timer = setTimeout(() => {
      this.player.pause();
      this.clear();
    }, 8000);
    if (!this.enabled) return;
    this.player.src = `/audio/${line.file}.wav`;
    this.duck(true);
    void this.player.play().catch(() => {
      if (this.current?.id === line.id) {
        this.duck(false);
        this.onLine({
          ...line,
          en: line.en + ' (Tap Hear to enable voice.)',
        });
      }
    });
  }
  intro() {
    if (!this.introduced) {
      this.introduced = true;
      this.speak(this.characterLine('intro'));
    }
  }
  beginCharacter() {
    this.introduced = false;
    this.completed = false;
    this.intro();
  }
  replay() {
    this.speak(this.characterLine('intro'));
  }
  success(progress: number, levelFinished = false, courseFinished = false) {
    if (progress < 100 || this.completed) return;
    this.completed = true;
    const line = this.characterLine('success');
    const praise = this.enabled
      ? levelFinished
        ? courseFinished
          ? VOICE_LINES.courseComplete
          : VOICE_LINES.levelComplete
        : encouragementFor(++this.completions)
      : null;
    this.completionTimer = setTimeout(() => {
      this.completionTimer = undefined;
      this.speak(line);
      this.pendingPraise = this.enabled ? praise : null;
    }, 500);
  }
  mistake() {
    const now = performance.now();
    if (now - this.lastMistake < 4500) return;
    this.lastMistake = now;
    this.speak([VOICE_LINES.focus, VOICE_LINES.sword][this.mistakeIndex++ % 2]);
  }
  setPronunciation(value: PronunciationMode) {
    this.pause();
    this.pronunciation = value;
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      this.cancelCompletion();
      this.pendingPraise = null;
      this.player.pause();
      this.duck(false);
    }
  }
  setVolume(value: number) {
    this.player.volume = Math.max(0, Math.min(1, value));
  }
  pause() {
    this.cancelCompletion();
    this.pendingPraise = null;
    this.player.pause();
    this.clear();
  }
  dispose() {
    this.disposed = true;
    this.pause();
    this.player.onended = null;
    this.player.onerror = null;
    this.player.removeAttribute('src');
    this.player.load();
  }
}
