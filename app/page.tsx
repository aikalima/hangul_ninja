'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
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
import { VOWELS } from '@/lib/levels';
import type { DojoAPI, DojoStatus } from '@/components/dojo/engine';

export default function Home() {
  const dialog = useRef<HTMLDialogElement>(null);
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
  const [music, setMusic] = useState(false);
  const [masterVoice, setMasterVoice] = useState(true);
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
  const reset = () => api.current?.reset();
  const index = status.characterIndex ?? 0;
  const vowel = VOWELS[index];
  const stage = status.stage ?? 'intro';
  const finished = stage === 'level-complete';
  const reviewing = false;
  const timed = false;
  const doneCount =
    finished || reviewing
      ? 6
      : index + (stage === 'character-complete' ? 1 : 0);
  const advance = () => api.current?.advance();
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Hangul Ninja home">
          <span className="brand-mark">
            <Swords size={25} />
          </span>
          HANGUL<span className="brand-light">NINJA</span>
          <span className="brand-period">.</span>
        </Link>
        <div className="top-center">
          <span className="active-dot" /> THE DOJO
        </div>
        <button className="text-button" onClick={() => setHelp(true)}>
          How to play <span>↗</span>
        </button>
      </header>
      <section className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              LEVEL 01 <span>/</span> BASIC VOWELS
            </p>
            <h1>
              Every stroke is a beginning<span>.</span>
            </h1>
          </div>
          <div className="prototype">
            <span /> WEBXR PROTOTYPE <b>v1.0</b>
          </div>
        </div>
        <div className="dojo-layout">
          <section className="viewport-shell" aria-label="Interactive 3D dojo">
            <div ref={host} className="scene" />
            {finished && (
              <section className="review-overlay" aria-label="Level complete">
                <span className="eyebrow">LEVEL 1 COMPLETE</span>
                <h2>Ready for Level 2</h2>
                <p>
                  {status.nextLevelConfirmed
                    ? 'You’re all set. Level 2 is coming soon.'
                    : 'Six vowels mastered. Confirm when you’re ready for the next level.'}
                </p>
                <button
                  className="primary-button"
                  disabled={!loaded || status.nextLevelConfirmed}
                  onClick={advance}
                >
                  {status.nextLevelConfirmed
                    ? 'Confirmed · Coming soon'
                    : 'I’m ready'}{' '}
                  <ArrowRight size={18} />
                </button>
                <button className="secondary-button" onClick={reset}>
                  Practice Level 1 again
                </button>
              </section>
            )}
            <div className="scene-top">
              <span className="mode-pill">
                <span /> DESKTOP PREVIEW
              </span>
              <span className="scene-location">
                고요한 도장 <span>·</span> THE QUIET DOJO
              </span>
            </div>
            <div
              className="master-subtitle"
              aria-live="polite"
              aria-atomic="true"
            >
              <span hidden={!status.master}>MASTER</span>
              <p lang="en" hidden={!status.master}>
                {status.master?.en}
              </p>
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
                <MousePointer2 size={16} /> Follow the numbered cuts
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
                  <Maximize2 size={17} />
                </button>
              </div>
            </div>
          </section>
          <aside className="lesson-panel">
            <div className="lesson-overline">
              <span>LEVEL 1 · BASIC VOWELS</span>
              <span className="lesson-number">{index + 1} / 06</span>
            </div>
            <div
              className="vowel-progress"
              aria-label={`${doneCount} of 6 lesson characters complete`}
            >
              {VOWELS.map((v, i) => (
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
                ? 'Level 1 complete · Ready for Level 2.'
                : reviewing
                  ? 'Timed review · Pass every character to finish the level.'
                  : stage === 'intro'
                    ? 'Level 1 begins · Six basic vowels'
                    : `${doneCount} / 6 characters complete`}
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
            <p className="lesson-intro">
              {vowel.cuts.length}{' '}
              {vowel.cuts.length === 1 ? 'flow cut' : 'flow cuts'}. One vowel.
              <br />
              Sound and letter name are the same for these vowels.
            </p>
            <div className="divider" />
            <div className="section-label">
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
                {vowel.cuts.map((cut, i) =>
                  cut[20].x > cut[0].x ? (
                    <ArrowRight key={i} size={18} />
                  ) : (
                    <ArrowDown key={i} size={18} />
                  ),
                )}
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
                      ? 'Replay Level 1'
                      : stage === 'intro'
                        ? 'Begin Level 1'
                        : stage === 'character-complete'
                          ? `Next: ${VOWELS[Math.min(5, index + 1)].glyph} in 3 seconds`
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
          Begin Level 1, then hold and drag along each numbered stroke in order.
          Release between cuts to reposition. Completed strokes stay lit. Use
          arrow keys while holding Space for keyboard practice. Press R to
          restart a character.
        </p>
        <h3>In Meta Quest</h3>
        <p>
          Enter VR and press a trigger to begin the level. Follow the numbered
          cuts with the katana tip. After completing a character, release the
          trigger. The next character appears automatically after three seconds.
          After the sixth vowel, the master congratulates you. Confirm in the
          center panel or press the trigger when ready for the next level.
          Squeeze the grip to recenter the guide.
        </p>
        <h3>The master</h3>
        <p>
          Hear the vowel once at the beginning and once at full completion.
          Every third completion adds Korean encouragement with English
          subtitles. Use Hear {vowel.glyph} to replay or Master to mute. Levels
          2–6 are upcoming.
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
