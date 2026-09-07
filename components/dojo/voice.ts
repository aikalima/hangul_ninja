import { masterAudioPath, type MasterPersona } from '../../lib/master-persona.ts';
import { EXAMPLE_WORDS } from '../../lib/example-words.ts';
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
  private persona: MasterPersona = 'yuna';
  setPersona(persona: MasterPersona) {
    this.persona = persona;
  }
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
  private examplePriority = false;
  private speaking = false;
  get completionPending() {
    return this.completed && (this.completionTimer !== undefined || this.examplePriority || this.speaking);
  }
  private commentTimer: ReturnType<typeof setTimeout> | undefined;
  private lastMistake = -Infinity;
  private mistakeIndex = 0;
  private mistakes = 0;
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
      this.speaking = false;
      clearTimeout(this.timer);
      clearTimeout(this.commentTimer);
      this.duck(false);
      if (this.pendingPraise && this.enabled && !this.disposed) {
        // Keep the word's priority through a full second of silence.
        this.commentTimer = setTimeout(() => {
          this.commentTimer = undefined;
          const praise = this.pendingPraise;
          this.pendingPraise = null;
          this.examplePriority = false;
          if (praise && this.enabled && !this.disposed) this.speak(praise);
        }, 1000);
        return;
      }
      this.examplePriority = false;
      this.timer = setTimeout(() => this.clear(), 1800);
    };
    this.player.onerror = () => {
      this.speaking = false;
      this.examplePriority = false;
      clearTimeout(this.commentTimer);
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
    if (this.examplePriority && line.id !== 'example') {
      this.pendingPraise ??= line;
      return;
    }
    this.cancelCompletion();
    clearTimeout(this.commentTimer);
    this.commentTimer = undefined;
    if (line.id !== 'example') this.pendingPraise = null;
    this.player.pause();
    this.speaking = false;
    this.clear();
    this.current = line;
    this.onLine(line);
    this.timer = setTimeout(() => {
      this.pause();
    }, 8000);
    if (!this.enabled) {
      this.examplePriority = false;
      return;
    }
    this.player.src = masterAudioPath(line.file, this.persona);
    this.duck(true);
    this.speaking = true;
    void this.player.play().catch(() => {
      if (this.current === line) {
        this.speaking = false;
        this.examplePriority = false;
        this.pendingPraise = null;
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
    const example = this.character && EXAMPLE_WORDS[this.character.glyph];
    const line = example
      ? { id: 'example', file: example.file, ko: example.word, en: example.meaning }
      : this.characterLine('success');
    const praise = this.enabled
      ? levelFinished
        ? courseFinished
          ? VOICE_LINES.courseComplete
          : VOICE_LINES.levelComplete
        : encouragementFor(++this.completions)
      : null;
    const interruptedComment = this.speaking && this.current && !['intro', 'success', 'example'].includes(this.current.id)
      ? this.current : null;
    const queuedComment = praise ?? this.pendingPraise ?? interruptedComment;
    this.pause();
    this.examplePriority = !!example;
    this.pendingPraise = this.enabled ? queuedComment : null;
    this.completionTimer = setTimeout(() => {
      this.completionTimer = undefined;
      this.speak(line);
      if (!example) this.pendingPraise = this.enabled ? queuedComment : null;
    }, 500);
  }
  replayExample() {
    const example = this.character && EXAMPLE_WORDS[this.character.glyph];
    if (example) {
      if (this.speaking && this.current && !['intro', 'success', 'example'].includes(this.current.id))
        this.pendingPraise ??= this.current;
      this.examplePriority = true;
      this.speak({ id: 'example', file: example.file, ko: example.word, en: example.meaning });
    }
  }
  mistake() {
    if (++this.mistakes % 3 !== 0) return;
    const now = performance.now();
    if (now - this.lastMistake < 12000) return;
    this.lastMistake = now;
    this.speak([VOICE_LINES.focus, VOICE_LINES.sword][this.mistakeIndex++ % 2]);
  }
  setPronunciation(value: PronunciationMode) {
    this.pause();
    this.pronunciation = value;
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) this.pause();
  }
  setVolume(value: number) {
    this.player.volume = Math.max(0, Math.min(1, value));
  }
  pause() {
    this.speaking = false;
    this.examplePriority = false;
    clearTimeout(this.commentTimer);
    this.commentTimer = undefined;
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
