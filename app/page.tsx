'use client';
import Link from 'next/link';
import { EXAMPLE_WORDS } from '@/lib/example-words';
import { readProgress } from '@/lib/progress';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Crosshair,
  Headset,
  Maximize2,
  Music2,
  MousePointer2,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { MASTER_WELCOME } from '@/lib/voice-lines';
import { LEVELS } from '@/lib/levels';
import { CURRICULUM, cutDirection } from '@/lib/curriculum';
import type { PronunciationMode } from '@/lib/voice-lines';
import type { DojoAPI, DojoStatus } from '@/components/dojo/engine';

export default function Home() {
  const dialog = useRef<HTMLDialogElement>(null);
  const welcomeDialog = useRef<HTMLDialogElement>(null);
  const demoSeen = useRef(false);
  const [onboarding, setOnboarding] = useState<
    'closed' | 'welcome' | 'watching' | 'ready'
  >('closed');
  useEffect(() => {
    if (readProgress()) return;
    try {
      if (localStorage.getItem('hangul-ninja-welcome-v1') === 'done') return;
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    const timer = window.setTimeout(() => setOnboarding('welcome'), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (onboarding === 'closed' || onboarding === 'watching')
      welcomeDialog.current?.close();
    else if (!welcomeDialog.current?.open) welcomeDialog.current?.showModal();
  }, [onboarding]);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<DojoAPI | null>(null);
  const [status, setStatus] = useState<DojoStatus>({
    progress: 0,
    phase: 'ready',
    message: 'Level 1 · Six basic vowels',
    master: MASTER_WELCOME,
    stage: 'intro',
    characterIndex: 0,
    cutIndex: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [xr, setXR] = useState(false);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [masterVoice, setMasterVoice] = useState(true);
  const [pronunciation, setPronunciation] =
    useState<PronunciationMode>('sound');
  const [volume, setVolume] = useState(50);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    let disposed = false;
    import('@/components/dojo/engine')
      .then(({ createDojo }) => {
        if (disposed || !host.current) return;
        api.current = createDojo(host.current, setStatus, setXR);
        setLoaded(true);
      })
      .catch(() =>
        setError(
          'The 3D dojo could not start. Enable WebGL in your browser and reload.',
        ),
      );
    return () => {
      disposed = true;
      api.current?.dispose();
      api.current = null;
    };
  }, []);
  useEffect(() => {
    if (help) dialog.current?.showModal();
    else dialog.current?.close();
  }, [help]);
  useEffect(() => {
    if (onboarding !== 'watching') return;
    if (status.phase === 'watching') demoSeen.current = true;
    else if (demoSeen.current) setOnboarding('ready');
  }, [onboarding, status.phase]);
  const showTutorial = () => {
    demoSeen.current = false;
    setOnboarding('watching');
    api.current?.demonstrate();
  };
  const finishWelcome = () => {
    try {
      localStorage.setItem('hangul-ninja-welcome-v1', 'done');
    } catch {
      /* Keep this visit usable without storage. */
    }
    welcomeDialog.current?.close();
    setOnboarding('closed');
    api.current?.advance();
  };
  const reset = () => api.current?.reset();
  const index = status.characterIndex ?? 0;
  const levelIndex = status.levelIndex ?? 0;
  const level = LEVELS[levelIndex];
  const characters = CURRICULUM[levelIndex];
  const vowel = characters[index];
  const example = EXAMPLE_WORDS[vowel.glyph];
  const courseFinished = levelIndex === LEVELS.length - 1;
  const stage = status.stage ?? 'intro';
  const finished = stage === 'level-complete';
  const reviewing = false;
  const timed = false;
  const doneCount =
    finished || reviewing
      ? characters.length
      : index + (stage === 'character-complete' ? 1 : 0);
  const advance = () => api.current?.advance();
  return (
    <main>
      <dialog
        ref={welcomeDialog}
        className="welcome-dialog"
        aria-labelledby="welcome-title"
        onCancel={(e) => {
          e.preventDefault();
          if (onboarding !== 'watching') finishWelcome();
        }}
      >
        <p className="eyebrow">YOUR FIRST DAY IN THE DOJO</p>
        <h2 id="welcome-title">
          {onboarding === 'watching'
            ? 'Watch the katana trace ㅏ'
            : onboarding === 'ready'
              ? 'Ready to start?'
              : 'Welcome, Hangul Ninja.'}
        </h2>
        <p>
          {onboarding === 'watching'
            ? 'First, cut down. Then sweep right from the middle. Release between cuts to reposition.'
            : onboarding === 'ready'
              ? 'Your turn. Follow the glowing cuts with your katana. Start with ㅏ (a), then learn 40 Korean letters across six levels.'
              : 'Learn the Korean alphabet through katana cuts in a peaceful VR dojo. Follow glowing guides, hear each letter in Korean, and build your skills one character at a time. You can also play here with a mouse—no headset needed.'}
        </p>
        {onboarding !== 'watching' && (
          <div className="welcome-actions">
            <button
              className="primary-button"
              disabled={!loaded}
              onClick={onboarding === 'ready' ? finishWelcome : showTutorial}
            >
              {onboarding === 'ready' ? 'Ready — begin training' : 'Show me'}{' '}
              <Play size={18} />
            </button>
            <button
              className="secondary-button"
              disabled={!loaded}
              onClick={onboarding === 'ready' ? showTutorial : finishWelcome}
            >
              {onboarding === 'ready' ? 'Show me again' : 'Skip tutorial'}
            </button>
          </div>
        )}
        {onboarding === 'watching' && (
          <output className="eyebrow">DEMONSTRATION · NO CUTS REQUIRED</output>
        )}
        {!loaded && <output>{error || 'Preparing your katana…'}</output>}
      </dialog>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Hangul Ninja home">
          <span className="brand-mark">
            <Swords size={25} />
          </span>
          HANGUL<span className="brand-light">NINJA</span>
          <span className="brand-period">.</span>
        </Link>
        <h1 className="header-level">
          <span>Level {levelIndex + 1}</span> · {level.title}
        </h1>
        <button className="text-button" onClick={() => setHelp(true)}>
          How to play <span>↗</span>
        </button>
      </header>
      <section className="workspace">
        <div className="dojo-layout">
          <section className="viewport-shell" aria-label="Interactive 3D dojo">
            <div ref={host} className="scene" />
            {stage === 'character-complete' && (
              <section className="example-word" aria-label="Example word" aria-live="polite">
                <p className="example-letter"><strong lang="ko">{vowel.glyph}</strong> IN A WORD</p>
                <p className="example-korean" lang="ko">
                  {Array.from(example.word).map((block, i) => i === example.syllableIndex
                    ? <strong key={i}>{block}</strong> : <span key={i}>{block}</span>)}
                </p>
                <p className="example-meaning">{example.meaning}</p>
                <div className="example-actions">
                  <button className="secondary-button" onClick={() => api.current?.replayExample()}>
                    <Volume2 size={18} /> Hear word again
                  </button>
                  <button className="primary-button" onClick={() => api.current?.nextExample()}>
                    Next
                  </button>
                </div>
              </section>
            )}
            {finished && (
              <section className="review-overlay" aria-label="Level complete">
                <span className="eyebrow">LEVEL {levelIndex + 1} COMPLETE</span>
                <h2>
                  {courseFinished
                    ? 'All six levels complete!'
                    : `Ready for Level ${levelIndex + 2}`}
                </h2>
                <p>
                  {courseFinished
                    ? 'You’ve completed all 40 characters. Return to Level 1 for another round.'
                    : `${characters.length} characters completed. Next: ${LEVELS[levelIndex + 1].title}. Confirm when you’re ready.`}
                </p>
                <button
                  className="primary-button"
                  disabled={!loaded}
                  onClick={advance}
                >
                  {courseFinished ? 'Train again from Level 1' : 'I’m ready'}{' '}
                  <ArrowRight size={18} />
                </button>
                <button className="secondary-button" onClick={reset}>
                  Practice this level again
                </button>
              </section>
            )}
            <div className="scene-top">
              <span className="scene-location">
                고요한 도장 <span>·</span> THE QUIET DOJO
              </span>
            </div>
            <div
              className="master-subtitle"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>MASTER</span>
              <p lang="en">{status.master?.en ?? MASTER_WELCOME.en}</p>
              <span data-master-gesture aria-hidden="true" />
            </div>
            {!loaded && (
              <div className="loading">{error || 'Lighting the lanterns…'}</div>
            )}
            <div className="scene-caption">
              <span className="scene-line" />
              <span>SWEEP. RECOVER. STRIKE.</span>
            </div>
            <div className="scene-bottom">
              <span>
                <MousePointer2 size={16} /> Drag the tip through the numbered cuts
              </span>
              <div>
                <button
                  title="Reset lesson"
                  aria-label="Reset lesson"
                  onClick={reset}
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  className="fullscreen-dojo-button"
                  title="Fullscreen dojo"
                  aria-label="Fullscreen dojo"
                  onClick={() =>
                    host.current?.parentElement
                      ?.requestFullscreen()
                      .catch(() =>
                        setError('Fullscreen is unavailable in this browser.'),
                      )
                  }
                >
                  <Maximize2 size={18} aria-hidden="true" />
                  <span>Fullscreen dojo</span>
                </button>
              </div>
            </div>
          </section>
          <aside className="lesson-panel">
            <div className="lesson-overline">
              <span>
                LEVEL {levelIndex + 1} · {level.title.toUpperCase()}
              </span>
              <span className="lesson-number">
                {index + 1} / {characters.length}
              </span>
            </div>
            <div
              className="vowel-progress"
              aria-label={`${doneCount} of ${characters.length} lesson characters complete`}
            >
              {characters.map((v, i) => (
                <span
                  key={v.roman}
                  lang="ko"
                  aria-current={i === index ? 'step' : undefined}
                  className={
                    i === index && !finished
                      ? 'current'
                      : i < doneCount
                        ? 'learned'
                        : ''
                  }
                >
                  {v.glyph}
                  <small>{i < doneCount ? '✓' : v.roman}</small>
                </span>
              ))}
            </div>
            <p className="level-status" aria-live="polite">
              {finished
                ? courseFinished
                  ? 'All six levels complete.'
                  : `Level ${levelIndex + 1} complete · Ready for Level ${levelIndex + 2}.`
                : reviewing
                  ? 'Timed review · Pass every character to finish the level.'
                  : stage === 'intro'
                    ? `Level ${levelIndex + 1} begins · ${characters.length} characters`
                    : `${doneCount} / ${characters.length} characters complete`}
            </p>
            <div className="character-title">
              <span lang="ko">{vowel.glyph}</span>
              <div>
                <h2>{vowel.roman}</h2>
                <button
                  className="hear-character"
                  disabled={!loaded}
                  onClick={() => {
                    api.current?.setVoice(true);
                    setMasterVoice(true);
                    api.current?.pronounce();
                  }}
                >
                  <Volume2 size={14} />
                  Hear {vowel.glyph}
                </button>
                <p>
                  {vowel.spoken} <span>·</span> {vowel.roman} sound
                </p>
              </div>
            </div>
            {vowel.name !== vowel.spoken && (
              <fieldset className="pronunciation-choice" disabled={!loaded}>
                <legend>PRONUNCIATION</legend>
                <div>
                  {(['sound', 'name'] as const).map((mode) => (
                    <label key={mode}>
                      <input
                        type="radio"
                        name="pronunciation"
                        checked={pronunciation === mode}
                        onChange={() => {
                          setPronunciation(mode);
                          api.current?.setPronunciation(mode);
                          api.current?.pronounce();
                        }}
                      />
                      {mode === 'sound' ? 'Sound' : 'Letter name'}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <p className="lesson-intro">
              {vowel.cuts.length}{' '}
              {vowel.cuts.length === 1 ? 'flow cut' : 'flow cuts'}. One
              character.
              <br />
              {vowel.note}
            </p>
            <div className="divider" />
            <div className="section-label movement-heading">
              <span>THE MOVEMENT</span>
              <span>
                {vowel.cuts.length} CUT{vowel.cuts.length > 1 ? 'S' : ''}
              </span>
            </div>
            <div className={`movement ${status.progress >= 50 ? 'done' : ''}`}>
              <span className="step-number">
                {Math.min((status.cutIndex ?? 0) + 1, vowel.cuts.length)}
              </span>
              <div>
                <strong>
                  {status.phase === 'complete'
                    ? 'Character complete'
                    : vowel.directions[status.cutIndex ?? 0]}
                </strong>
                <p>Follow each numbered cut in order.</p>
              </div>
              <div className="direction">
                <span aria-label="Current cut direction">
                  {cutDirection(
                    vowel.cuts[
                      Math.min(status.cutIndex ?? 0, vowel.cuts.length - 1)
                    ],
                  )}
                </span>
              </div>
            </div>
            <div className="tip">
              <Sparkles size={17} />
              <p>
                Use broad, controlled katana arcs. Release between cuts to reset
                your stance. Completed cuts stay lit.
              </p>
            </div>
            <div className="progress-section">
              <div>
                <span>
                  {status.phase === 'complete'
                    ? 'CHARACTER COMPLETE'
                    : 'CHARACTER PROGRESS'}
                </span>
                <strong>
                  {status.progress}
                  <small>%</small>
                </strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${status.progress}%` }} />
              </div>
              <p
                aria-live="polite"
                className={status.phase === 'complete' ? 'success' : ''}
              >
                {status.phase === 'complete' ? (
                  <Check size={15} />
                ) : (
                  <span className="tiny-dot" />
                )}
                {status.message}
              </p>
            </div>
            <button
              className="primary-button"
              hidden={reviewing || finished}
              disabled={!loaded || timed || stage === 'character-complete'}
              onClick={advance}
            >
              {status.phase === 'complete' ? (
                <RotateCcw size={18} />
              ) : (
                <Swords size={18} />
              )}{' '}
              {stage === 'review-ready'
                ? 'Start timed review'
                : stage === 'review-failed'
                  ? 'Retry timed review'
                  : timed
                    ? 'Review in progress'
                    : finished
                      ? 'Replay this level'
                      : stage === 'intro'
                        ? `Begin Level ${levelIndex + 1}`
                        : stage === 'character-complete'
                          ? 'Character complete'
                          : 'Restart character'}
              <ArrowRight size={18} />
            </button>
            <button
              className="secondary-button"
              disabled={!loaded || finished || reviewing}
              onClick={() => api.current?.demonstrate()}
            >
              <Play size={15} /> Watch this character
            </button>
          </aside>
        </div>

        <div className="underbar">
          <div className="comfort">
            <Crosshair size={18} />
            <span>Stationary practice</span>
            <i />
            No locomotion
            <i />
            Take it at your pace
          </div>
          <div className="audio-controls">
            <button
              disabled={!loaded}
              aria-pressed={masterVoice}
              className="sound-button"
              onClick={() => {
                setMasterVoice(!masterVoice);
                api.current?.setVoice(!masterVoice);
              }}
            >
              <Volume2 size={17} />
              Master {masterVoice ? 'on' : 'off'}
            </button>
            <button
              disabled={!loaded}
              aria-pressed={sound}
              className="sound-button"
              onClick={() => {
                api.current?.setSound(!sound);
                setSound(!sound);
              }}
            >
              {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}Effects{' '}
              {sound ? 'on' : 'off'}
            </button>
            <button
              disabled={!loaded}
              aria-pressed={music}
              className="sound-button"
              onClick={() => {
                api.current?.setMusic(!music);
                setMusic(!music);
              }}
            >
              <Music2 size={17} />
              Music {music ? 'on' : 'off'}
            </button>
            <label className="volume-control">
              Volume
              <input
                aria-label="Audio volume"
                disabled={!loaded}
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setVolume(value);
                  api.current?.setVolume(value / 100);
                }}
              />
            </label>
          </div>
        </div>
        <p className="audio-hint">
          Music is off by default. Turn it on anytime. Headphones bring the
          sword sounds into your space.
        </p>
        <section className="vr-strip">
          <div className="vr-icon">
            <Headset size={27} />
          </div>
          <div>
            <h3>Step inside the dojo</h3>
            <p>
              Pick up your katana in Meta Quest Browser. Your space, your pace.
            </p>
          </div>
          <button
            className="vr-button"
            disabled={!loaded}
            onClick={async () => {
              setError('');
              try {
                await api.current?.enterVR();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Unable to enter VR.',
                );
              }
            }}
          >
            <Headset size={18} />
            {xr ? 'Enter VR' : 'Connect a headset'}
            <ArrowRight size={17} />
          </button>
        </section>
        {error && (
          <p className="error" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="Dismiss message">
              <X size={15} />
            </button>
          </p>
        )}
        <footer>
          <span>
            HANGUL NINJA <span>한글 닌자</span>
          </span>
          <span>A little focus. A little flow.</span>
          <span>DESIGNED FOR META QUEST</span>
        </footer>
      </section>
      <dialog
        ref={dialog}
        onClose={() => setHelp(false)}
        aria-labelledby="help-title"
        className="help-modal"
      >
        <button
          autoFocus
          className="close"
          aria-label="Close instructions"
          onClick={() => setHelp(false)}
        >
          <X />
        </button>
        <p className="eyebrow">WELCOME TO THE DOJO</p>
        <h2 id="help-title">One stroke at a time.</h2>
        <h3>On desktop</h3>
        <p>
          Begin a level, then touch or click and drag the katana tip along each numbered cut in order.
          Release between cuts to reposition. Curves and corners use separate
          game cuts, rather than handwriting stroke counts. Completed cuts stay
          lit. Use arrow keys while holding Space for keyboard practice. Press R
          to restart a character.
        </p>
        <h3>In Meta Quest</h3>
        <p>
          Enter VR and press a trigger to begin the level. Follow the numbered
          cuts with the katana tip. After completing a character, release the
          trigger. The next character appears automatically after three seconds.
          After the last character in each level, the master congratulates you.
          Confirm in the center panel or press the trigger when ready for the
          next level. Squeeze the grip to recenter the guide.
        </p>
        <h3>The master</h3>
        <p>
          Hear the character once at the beginning and once at full completion.
          Every third completion adds Korean encouragement with English
          subtitles. Use Hear {vowel.glyph} to replay or Master to mute. All six
          levels are available.
        </p>
        <h3>Your katana</h3>
        <p>
          In VR, your controller holds the katana directly. Desktop and VR show
          only the katana, keeping the guide clear.
        </p>
        <h3>Sound & atmosphere</h3>
        <p>
          An original plucked melody, low drums, and wind accompany your
          practice. Sword swishes follow your swing speed and position;
          successful cuts ring out. Music and effects can be muted separately.
        </p>
        <p className="help-note">
          Keep a clear arm’s-length area around you. Use the Quest system menu
          to leave VR.
        </p>
        <button className="primary-button" onClick={() => setHelp(false)}>
          Back to practice
          <ArrowRight size={18} />
        </button>
      </dialog>
    </main>
  );
}
