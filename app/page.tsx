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
import { FIGHTERS, type FighterId } from '@/lib/fighters';
import type { PronunciationMode } from '@/lib/voice-lines';
import type { DojoAPI, DojoStatus } from '@/components/dojo/engine';

export default function Home() {
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<DojoAPI | null>(null);
  const [status, setStatus] = useState<DojoStatus>({
    progress: 0,
    phase: 'ready',
    message: 'Sweep left to right through the guide.',
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
  const [fighter, setFighter] = useState<FighterId>('onyx');
  const [bodyVisible, setBodyVisible] = useState(true);
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
              LESSON 01 <span>/</span> BASIC CONSONANTS
            </p>
            <h1>
              Every stroke is a beginning<span>.</span>
            </h1>
          </div>
          <div className="prototype">
            <span /> WEBXR PROTOTYPE <b>v0.6</b>
          </div>
        </div>
        <div className="dojo-layout">
          <section className="viewport-shell" aria-label="Interactive 3D dojo">
            <div ref={host} className="scene" />
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
              {status.master && (
                <>
                  <span>MASTER</span>
                  <p lang="en">{status.master.en}</p>
                </>
              )}
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
                <MousePointer2 size={16} /> Drag right, then slash down
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
              <span>YOUR FIRST CHARACTER</span>
              <span className="lesson-number">01 / 01</span>
            </div>
            <div className="character-title">
              <span lang="ko">ㄱ</span>
              <div>
                <h2>Giyeok</h2>
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
                  Hear ㄱ
                </button>
                <p>
                  기역 <span>·</span> “g” / “k” sound
                </p>
              </div>
            </div>
            <fieldset className="pronunciation-choice" disabled={!loaded}>
              <legend>VOICE PRONUNCIATION</legend>
              <div>
                {(['sound', 'name'] as const).map((mode) => (
                  <label key={mode}>
                    <input
                      type="radio"
                      name="pronunciation"
                      value={mode}
                      checked={pronunciation === mode}
                      onChange={() => {
                        setPronunciation(mode);
                        api.current?.setPronunciation(mode);
                        api.current?.pronounce();
                      }}
                    />
                    {mode === 'sound' ? 'Sound · 그' : 'Name · 기역'}
                  </label>
                ))}
              </div>
              <p>
                Sound uses 그 (geu): ㄱ with a short vowel to make it audible.
              </p>
            </fieldset>
            <p className="lesson-intro">
              A single stroke. A sharp turn.
              <br />
              The first step in your Hangul journey.
            </p>
            <div className="divider" />
            <div className="section-label">
              <span>THE MOVEMENT</span>
              <span>2 CUT COMBO</span>
            </div>
            <div className={`movement ${status.progress >= 50 ? 'done' : ''}`}>
              <span className="step-number">01</span>
              <div>
                <strong>
                  {status.progress >= 50
                    ? '02 · Downward cut'
                    : '01 · Rightward slash'}
                </strong>
                <p>Sweep across. Recover. Strike down.</p>
              </div>
              <div className="direction">
                <ArrowRight size={18} />
                <ArrowDown size={18} />
              </div>
            </div>
            <div className="tip">
              <Sparkles size={17} />
              <p>
                Use broad, controlled katana arcs. Release between cuts to reset
                your stance. The first cut stays lit.
              </p>
            </div>
            <div className="master-caption" aria-live="polite">
              <span>THE MASTER</span>
              <strong lang="ko">{status.master?.ko ?? '준비됐느냐?'}</strong>
              <p>
                {status.master?.en ??
                  `Ready? Begin practice to hear ${pronunciation === 'sound' ? 'the ㄱ sound.' : 'giyeok.'}`}
              </p>
            </div>
            <div className="progress-section">
              <div>
                <span>
                  {status.phase === 'complete'
                    ? 'STROKE COMPLETE'
                    : 'STROKE PROGRESS'}
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
              disabled={!loaded}
              onClick={reset}
            >
              {status.phase === 'complete' ? (
                <RotateCcw size={18} />
              ) : (
                <Swords size={18} />
              )}{' '}
              {status.phase === 'complete'
                ? 'Practice again'
                : 'Begin flow practice'}
              <ArrowRight size={18} />
            </button>
            <button
              className="secondary-button"
              disabled={!loaded}
              onClick={() => api.current?.demonstrate()}
            >
              <Play size={15} /> Watch the stroke
            </button>
          </aside>
        </div>
        <section className="fighter-select" aria-label="Choose your fighter">
          <div>
            <span className="eyebrow">YOUR FIGHTER</span>
            <p>First-person outfits</p>
          </div>
          <div className="fighter-options">
            {FIGHTERS.map((f) => (
              <button
                disabled={!loaded}
                key={f.id}
                aria-pressed={fighter === f.id}
                onClick={() => {
                  api.current?.setFighter(f.id);
                  setFighter(f.id);
                }}
              >
                <span
                  className="outfit-swatch"
                  style={{ background: f.cloth, borderColor: f.trim }}
                >
                  <Swords size={21} style={{ color: f.trim }} />
                </span>
                <span>
                  <strong>{f.name}</strong>
                  <small>{f.description}</small>
                </span>
                {fighter === f.id && <Check size={15} />}
              </button>
            ))}
          </div>
          <label className="body-toggle">
            <input
              type="checkbox"
              checked={bodyVisible}
              disabled={!loaded}
              onChange={(e) => {
                setBodyVisible(e.target.checked);
                api.current?.showBody(e.target.checked);
              }}
            />
            Show arms & outfit
          </label>
        </section>
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
          Music and effects start with your first interaction. Headphones bring
          the sword sounds into your space.
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
          In Flow cuts, hold and drag right through the horizontal guide, then
          cut down the vertical guide. You can release between cuts to
          reposition. You can also use touch, or focus the dojo and use the
          arrow keys while holding Space. Press R to restart.
        </p>
        <h3>In Meta Quest</h3>
        <p>
          Open this page over HTTPS in Quest Browser, then select Enter VR. Stay
          in place. Hold either controller’s trigger and move the sword tip
          across the guide with a controlled rightward slash, then a downward
          cut. Flow cuts accepts natural arcs and preserves the first cut when
          you release. After completing, press the trigger to practice again.
          Squeeze the grip to recenter the guide in front of you.
        </p>
        <h3>The master</h3>
        <p>
          Choose Sound to hear ㄱ in 그 (geu), or Name to hear 기역 (giyeok).
          Your choice plays at the beginning of practice and after a completed
          character. Mistakes earn a stern Korean correction with English
          subtitles. Valid recovery between flow cuts is allowed. Use Hear ㄱ to
          replay your choice or the Master toggle to mute narration.
        </p>
        <h3>Your fighter</h3>
        <p>
          Choose Onyx, Cloud, or Ember below the dojo. Hands, sleeves, wrist
          guards, and robe details change together. In VR your hands follow the
          controllers; arms and torso are an estimated cosmetic pose. Look down
          to see your sash and robe. Turn off Show arms & outfit for an
          unobstructed lesson.
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
