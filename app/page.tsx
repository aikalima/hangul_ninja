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
  MousePointer2,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { DojoAPI, DojoStatus } from '@/components/dojo/engine';

export default function Home() {
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<DojoAPI | null>(null);
  const [status, setStatus] = useState<DojoStatus>({
    progress: 0,
    phase: 'ready',
    message: 'Start at the glowing circle.',
  });
  const [loaded, setLoaded] = useState(false);
  const [xr, setXR] = useState(false);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(false);
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
            <span /> WEBXR PROTOTYPE <b>v0.1</b>
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
            {!loaded && (
              <div className="loading">{error || 'Lighting the lanterns…'}</div>
            )}
            <div className="scene-caption">
              <span className="scene-line" />
              <span>STAY PRESENT. FOLLOW THE STROKE.</span>
            </div>
            <div className="scene-bottom">
              <span>
                <MousePointer2 size={16} /> Hold & drag to trace
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
                <p>
                  기역 <span>·</span> “g” / “k” sound
                </p>
              </div>
            </div>
            <p className="lesson-intro">
              A single stroke. A sharp turn.
              <br />
              The first step in your Hangul journey.
            </p>
            <div className="divider" />
            <div className="section-label">
              <span>THE MOVEMENT</span>
              <span>1 CONTINUOUS STROKE</span>
            </div>
            <div className={`movement ${status.progress >= 50 ? 'done' : ''}`}>
              <span className="step-number">01</span>
              <div>
                <strong>Across, then down</strong>
                <p>Start left. Move right. Turn down.</p>
              </div>
              <div className="direction">
                <ArrowRight size={18} />
                <ArrowDown size={18} />
              </div>
            </div>
            <div className="tip">
              <Sparkles size={17} />
              <p>
                Keep your sword moving through the corner. One smooth, unbroken
                stroke.
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
                : 'Begin practice'}
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
        <div className="underbar">
          <div className="comfort">
            <Crosshair size={18} />
            <span>Stationary practice</span>
            <i />
            No locomotion
            <i />
            Take it at your pace
          </div>
          <button
            className="sound-button"
            onClick={() => {
              api.current?.setSound(!sound);
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}Sound{' '}
            {sound ? 'on' : 'off'}
          </button>
        </div>
        <section className="vr-strip">
          <div className="vr-icon">
            <Headset size={27} />
          </div>
          <div>
            <h3>Step inside the dojo</h3>
            <p>
              Pick up your sword in Meta Quest Browser. Your space, your pace.
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
          Hold the mouse button at the glowing start circle. Drag right, then
          down without releasing. You can also use touch, or focus the dojo and
          use the arrow keys while holding Space. Press R to restart.
        </p>
        <h3>In Meta Quest</h3>
        <p>
          Open this page over HTTPS in Quest Browser, then select Enter VR. Stay
          in place. Hold either controller’s trigger and move the sword tip
          along the guide. Release to retry. After completing, press the trigger
          to practice again. Squeeze the grip to recenter the guide in front of
          you.
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
