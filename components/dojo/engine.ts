import { MASTER_WELCOME, VOICE_LINES } from '@/lib/voice-lines';
import * as THREE from 'three';
import { buildEnvironment } from './environment';
import { createKatana, KATANA_TIP, KATANA_TRAIL_INNER } from './katana';
import type { TraceState } from '@/lib/tracing';
import { LEVELS, VowelLesson } from '@/lib/levels';
import { CURRICULUM, cutDirection, followingLevel } from '@/lib/curriculum';
import { TimedReview, reviewPool } from '@/lib/review';
import { DojoAudio } from './audio';
import { MasterVoice } from './voice';
import { type PronunciationMode, type VoiceLine } from '@/lib/voice-lines';
import { createCelebration } from './celebration';
import { createEffects } from './effects';

export type DojoStatus = {
  progress: number;
  phase: TraceState | 'watching';
  message: string;
  master?: VoiceLine | null;
  characterIndex?: number;
  levelIndex?: number;
  nextLevelConfirmed?: boolean;
  stage?:
    | 'intro'
    | 'active'
    | 'character-complete'
    | 'level-complete'
    | 'review-ready'
    | 'review-countdown'
    | 'review-active'
    | 'review-between'
    | 'review-failed';
  reviewSeconds?: number;
  reviewRemaining?: number;
  reviewIndex?: number;
  reviewTotal?: number;
  cutIndex?: number;
};
export type DojoAPI = {
  reset: () => void;
  advance: () => void;
  setReviewSeconds: (seconds: number) => void;
  demonstrate: () => void;
  enterVR: () => Promise<void>;
  setSound: (v: boolean) => void;
  setVoice: (v: boolean) => void;
  setPronunciation: (mode: PronunciationMode) => void;
  pronounce: () => void;
  setMusic: (v: boolean) => void;
  setVolume: (v: number) => void;
  dispose: () => void;
};

export function createDojo(
  host: HTMLDivElement,
  onStatus: (s: DojoStatus) => void,
  onXR: (available: boolean) => void,
): DojoAPI {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#666c60');
  scene.fog = new THREE.FogExp2('#62695a', 0.037);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
  camera.position.set(0, 1.72, 0.85);
  camera.lookAt(0, 1.45, -1.3);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFramebufferScaleFactor(1);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    'Trace the glowing Hangul guide. Drag, or hold Space and use arrow keys. R resets.',
  );
  host.appendChild(canvas);
  const environment = buildEnvironment(scene, renderer);
  const { warm, lanternMat } = environment;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.728, 80),
    new THREE.MeshBasicMaterial({
      color: '#cbbb8b',
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.036, 0.1);
  scene.add(ring);
  const outer = ring.clone();
  outer.scale.setScalar(1.09);
  scene.add(outer);
  // Everything the learner needs in VR is real scene geometry, including text.
  const lessonRoot = new THREE.Group();
  lessonRoot.position.set(0, 1.5, -1.12);
  scene.add(lessonRoot);
  const guideMat = new THREE.MeshBasicMaterial({
    color: '#e6d6a6',
    transparent: true,
    opacity: 0.45,
  });
  const completeMat = new THREE.MeshBasicMaterial({ color: '#ffe1a0' });
  const glowMat = new THREE.MeshBasicMaterial({
    color: '#f5ca90',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  function segment(
    a: THREE.Vector3,
    b: THREE.Vector3,
    r: number,
    mat: THREE.Material,
    parent: THREE.Object3D,
  ) {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, d.length(), 8),
      mat,
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    parent.add(m);
    return m;
  }
  const review = new TimedReview();
  let levelIndex = 0;
  let characters = CURRICULUM[0];
  let characterIndex = 0;
  let nextLevelConfirmed = false;
  let nextCharacterAt = Infinity;
  let stage: NonNullable<DojoStatus['stage']> = 'intro';
  let PATH = characters[0].cuts.flat();
  const guideRoot = new THREE.Group();
  lessonRoot.add(guideRoot);
  const guideSegments: THREE.Mesh[] = [];
  function rebuildGuide() {
    for (const child of guideRoot.children) {
      (child as THREE.Mesh).geometry.dispose();
    }
    guideRoot.clear();
    guideSegments.length = 0;
    for (let i = 1; i < PATH.length; i++) {
      if (i % 21 === 0) continue;
      const a = new THREE.Vector3(PATH[i - 1].x, PATH[i - 1].y, 0),
        b = new THREE.Vector3(PATH[i].x, PATH[i].y, 0);
      guideSegments.push(segment(a, b, 0.011, guideMat, guideRoot));
      guideSegments.at(-1)!.userData.end = i;
      segment(a, b, 0.035, glowMat, guideRoot);
    }
  }
  rebuildGuide();
  const gridMat = new THREE.LineBasicMaterial({
    color: '#d6ceaa',
    transparent: true,
    opacity: 0.12,
  });
  const gridPts: THREE.Vector3[] = [];
  for (let i = -2; i <= 2; i++) {
    const p = i * 0.3;
    gridPts.push(
      new THREE.Vector3(p, -0.6, -0.018),
      new THREE.Vector3(p, 0.6, -0.018),
      new THREE.Vector3(-0.6, p, -0.018),
      new THREE.Vector3(0.6, p, -0.018),
    );
  }
  lessonRoot.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gridPts),
      gridMat,
    ),
  );
  const target = new THREE.Mesh(
    new THREE.TorusGeometry(0.044, 0.006, 6, 32),
    completeMat,
  );
  target.position.set(-0.45, 0.45, 0.012);
  lessonRoot.add(target);
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#fff0c6' }),
  );
  lessonRoot.add(spark);
  spark.position.copy(target.position);
  function makeText(width: number, height: number) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = height;
    const ctx = c.getContext('2d')!;
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    sprite.scale.set(width, (width * height) / 1024, 1);
    return { c, ctx, texture, sprite };
  }
  const heading = makeText(1.45, 160);
  heading.ctx.textAlign = 'center';
  heading.ctx.fillStyle = '#e6d5ac';
  heading.ctx.font = '500 33px Arial';
  heading.ctx.fillText('LEVEL 1 · BASIC VOWELS', 512, 63);
  heading.ctx.fillStyle = '#b9bbaa';
  heading.ctx.font = '19px Arial';
  heading.ctx.fillText('ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ', 512, 112);
  heading.texture.needsUpdate = true;
  heading.sprite.position.set(0, 0.89, 0);
  lessonRoot.add(heading.sprite);
  const subtitle = makeText(1.65, 224);
  subtitle.sprite.position.set(0, 1.02, 0.03);
  subtitle.sprite.visible = false;
  lessonRoot.add(subtitle.sprite);
  const reviewPanel = makeText(1.45, 360);
  lessonRoot.add(reviewPanel.sprite);
  reviewPanel.sprite.visible = false;
  const feedback = makeText(1.65, 192);
  feedback.sprite.position.set(0, -0.88, 0.01);
  lessonRoot.add(feedback.sprite);
  const arrow = makeText(0.8, 160);
  arrow.ctx.fillStyle = '#f5d196';
  arrow.ctx.font = '38px Arial';
  arrow.ctx.textAlign = 'center';
  arrow.ctx.fillText('START  →', 512, 90);
  arrow.texture.needsUpdate = true;
  arrow.sprite.position.set(-0.42, 0.59, 0.01);
  lessonRoot.add(arrow.sprite);
  const lesson = new VowelLesson(characters[0].cuts);
  const audio = new DojoAudio();
  const effects = createEffects(scene, lessonRoot);
  const celebration = createCelebration(
    lessonRoot,
    host.parentElement?.querySelector<HTMLElement>('[data-master-gesture]') ??
      null,
  );
  let demoPoint = 0;
  let lastStatus = '',
    demoStart = 0,
    disposed = false;
  let masterLine: VoiceLine | null = null;
  const voice = new MasterVoice(
    (line) => {
      if (disposed) return;
      masterLine =
        line ??
        (stage === 'intro'
          ? MASTER_WELCOME
          : stage === 'level-complete'
            ? followingLevel(levelIndex) === null
              ? VOICE_LINES.courseComplete
              : VOICE_LINES.levelComplete
            : (masterLine ?? MASTER_WELCOME));
      lastStatus = '';
      report();
    },
    (active) => audio.duck(active),
  );
  voice.setCharacter(characters[0]);
  let gestureStart = 0,
    gestureDistance = 0,
    gesturePrevious: THREE.Vector3 | null = null;
  function beginGesture() {
    if (stage === 'intro') advance();
    gestureStart = lesson.completedCuts;
    gestureDistance = 0;
    gesturePrevious = null;
    voice.intro();
  }
  function endGesture() {
    if (
      (stage === 'active' || stage === 'review-active') &&
      gestureDistance >= 0.18 &&
      lesson.completedCuts === gestureStart
    ) {
      celebration.reset();
      voice.mistake();
    }
    gestureDistance = 0;
    gesturePrevious = null;
    lesson.release();
    report();
  }
  const keys = new Set<string>();
  let keyboardHeld = false,
    pointerHeld = false,
    activeController = -1,
    needsCenter = false;
  const cursor = new THREE.Vector3(-0.45, 0.45, 0.025);
  const worldCursor = new THREE.Vector3();
  function report() {
    const watching = demoStart > 0;
    const phase = watching ? 'watching' : lesson.state;
    const progress = watching ? 0 : lesson.progress;
    const vowel = characters[characterIndex];
    const message =
      stage === 'review-ready'
        ? 'TIMED REVIEW · All six vowels. Pass to finish Level 1.'
        : stage === 'review-countdown'
          ? `GET READY · ${Math.ceil(review.remaining(performance.now()))}`
          : stage === 'review-active'
            ? `REVIEW ${review.index + 1}/${review.order.length} · ${review.remaining(performance.now()).toFixed(1)}s remaining`
            : stage === 'review-between'
              ? 'Correct! Next character…'
              : stage === 'review-failed'
                ? 'TIME UP · Retry the shuffled review to advance.'
                : stage === 'intro'
                  ? MASTER_WELCOME.en
                  : stage === 'level-complete'
                    ? followingLevel(levelIndex) === null
                      ? 'All six levels complete!'
                      : `Level ${levelIndex + 1} complete · Ready for Level ${levelIndex + 2}`
                    : stage === 'character-complete'
                      ? `${vowel.glyph} complete`
                      : watching
                        ? `Watch ${vowel.glyph}: follow each cut in order.`
                        : `${Math.min(lesson.completedCuts + 1, vowel.cuts.length)} / ${vowel.cuts.length} · ${vowel.directions[lesson.completedCuts] ?? 'Complete'}`;
    const timer = stage.startsWith('review-')
      ? review.remaining(performance.now()).toFixed(1)
      : '';
    const key = `${stage}:${levelIndex}:${characterIndex}:${phase}:${progress}:${timer}:${review.seconds}:${celebration.active}`;
    if (key === lastStatus) return;
    lastStatus = key;
    onStatus({
      phase,
      progress,
      message,
      master: masterLine,
      characterIndex,
      levelIndex,
      nextLevelConfirmed,
      stage,
      cutIndex: lesson.completedCuts,
      reviewSeconds: review.seconds,
      reviewRemaining: review.remaining(performance.now()),
      reviewIndex: review.index,
      reviewTotal: review.order.length || 6,
    });
    heading.ctx.clearRect(0, 0, 1024, 160);
    heading.ctx.textAlign = 'center';
    heading.ctx.fillStyle = '#e6d5ac';
    heading.ctx.font = '500 36px Arial';
    heading.ctx.fillText(
      stage.startsWith('review-')
        ? 'LEVEL 1 · TIMED REVIEW'
        : stage === 'level-complete'
          ? followingLevel(levelIndex) === null
            ? 'TRAINING COMPLETE'
            : `LEVEL ${levelIndex + 1} COMPLETE`
          : stage === 'intro'
            ? ''
            : `LEVEL ${levelIndex + 1} · ${characterIndex + 1}/${characters.length} · ${vowel.glyph} ${vowel.roman}`,
      512,
      63,
    );
    heading.ctx.font = '22px Arial';
    heading.ctx.fillText(
      stage.startsWith('review-')
        ? message
        : stage === 'level-complete'
          ? characters.map((c) => c.glyph).join('  ')
          : stage === 'intro'
            ? ''
            : vowel.directions.join(' · '),
      512,
      112,
    );
    heading.texture.needsUpdate = true;
    const panel = reviewPanel.ctx;
    panel.clearRect(0, 0, 1024, 360);
    panel.fillStyle = '#172720f5';
    panel.fillRect(0, 0, 1024, 360);
    panel.strokeStyle = '#d9b978';
    panel.lineWidth = 4;
    panel.strokeRect(2, 2, 1020, 356);
    panel.textAlign = 'center';
    panel.fillStyle = '#d9b978';
    panel.font = '28px Arial';
    panel.fillText(
      stage === 'level-complete'
        ? followingLevel(levelIndex) === null
          ? 'TRAINING COMPLETE'
          : `LEVEL ${levelIndex + 1} COMPLETE`
        : 'TIMED REVIEW · LEVEL 1',
      512,
      55,
    );
    panel.fillStyle = '#fff0cc';
    panel.font = 'bold 54px Arial';
    panel.fillText(
      stage === 'review-countdown'
        ? String(Math.ceil(review.remaining(performance.now())))
        : stage === 'review-active'
          ? `${review.remaining(performance.now()).toFixed(1)}s`
          : stage === 'review-failed'
            ? 'TIME’S UP'
            : stage === 'level-complete'
              ? followingLevel(levelIndex) === null
                ? 'ALL SIX LEVELS COMPLETE'
                : `READY FOR LEVEL ${levelIndex + 2}`
              : 'TEST YOUR TRAINING',
      512,
      140,
    );
    panel.font = '28px Arial';
    panel.fillText(
      stage === 'level-complete'
        ? `${characters.length} characters completed`
        : `${review.index} / ${review.order.length || 6} characters passed`,
      512,
      200,
    );
    panel.font = '25px Arial';
    panel.fillText(
      stage === 'review-active'
        ? 'Trace every stroke before time runs out'
        : stage === 'review-countdown'
          ? 'Get ready…'
          : stage === 'level-complete'
            ? followingLevel(levelIndex) === null
              ? 'Your Hangul foundation is complete'
              : `Next: ${LEVELS[levelIndex + 1].title}`
            : `${review.seconds} seconds per character · Shuffled order`,
      512,
      257,
    );
    panel.fillText(
      stage === 'review-ready'
        ? 'Press trigger to begin test'
        : stage === 'review-failed'
          ? 'Press trigger to retry'
          : stage === 'level-complete'
            ? followingLevel(levelIndex) === null
              ? 'Press trigger to train again'
              : 'Press trigger to confirm'
            : '',
      512,
      310,
    );
    reviewPanel.texture.needsUpdate = true;
    const sub = subtitle.ctx;
    sub.clearRect(0, 0, 1024, 224);
    if (masterLine) {
      const hasGesture = celebration.active;
      const textCenter = hasGesture ? 450 : 512;
      sub.fillStyle = '#141a17ee';
      sub.fillRect(0, 0, 1024, 224);
      sub.textAlign = 'center';
      sub.fillStyle = '#d9b978';
      sub.font = '22px Arial';
      sub.fillText('MASTER', textCenter, 40);
      sub.fillStyle = '#fff6e5';
      sub.font = '32px Arial';
      let line = '';
      let y = 95;
      for (const word of masterLine.en.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (sub.measureText(next).width > (hasGesture ? 780 : 940) && line) {
          sub.fillText(line, textCenter, y);
          y += 42;
          line = word;
        } else line = next;
      }
      sub.fillText(line, textCenter, y);
      celebration.position(0.67, 1.02);
    }
    subtitle.texture.needsUpdate = true;
    const c = feedback.ctx;
    c.clearRect(0, 0, 1024, 192);
    c.textAlign = 'center';
    c.fillStyle = phase === 'complete' ? '#d4eab0' : '#f1dec0';
    c.font = '28px Arial';
    c.fillText(message, 512, 65, 1000);
    c.fillStyle = '#c8cbbb';
    c.font = '21px Arial';
    c.fillText(
      renderer.xr.isPresenting
        ? phase === 'complete'
          ? stage === 'character-complete'
            ? ''
            : 'Press trigger to continue'
          : 'Hold trigger to cut · Release between strokes · Grip: recenter'
        : 'Drag along each numbered cut · Release to reposition',
      512,
      110,
    );
    c.font = '18px Arial';
    c.fillText(watching ? 'DEMONSTRATION' : `${progress}%  COMPLETE`, 512, 153);
    feedback.texture.needsUpdate = true;
  }
  const hitPosition = new THREE.Vector3();
  function sample(p: THREE.Vector3) {
    if ((stage !== 'active' && stage !== 'review-active') || demoStart) return;
    if (stage === 'review-active' && performance.now() >= review.deadline) {
      review.interrupt();
      syncReview();
      return;
    }
    if (gesturePrevious)
      gestureDistance += Math.min(0.5, gesturePrevious.distanceTo(p));
    gesturePrevious = p.clone();
    const before = lesson.completedCuts,
      previousState = lesson.state;
    lesson.sample(p);
    const crossedCorner = lesson.completedCuts > before;
    const complete =
      previousState !== 'complete' && lesson.state === 'complete';
    if (crossedCorner || complete) {
      const end = PATH[Math.max(0, lesson.next - 1)];
      hitPosition.set(end.x, end.y, 0);
      lessonRoot.localToWorld(hitPosition);
      audio.impact(hitPosition, complete);
      if (complete) {
        if (stage === 'review-active') {
          review.complete(performance.now());
          syncReview();
        } else
          stage =
            characterIndex === characters.length - 1
              ? 'level-complete'
              : 'character-complete';
        if (stage === 'character-complete')
          nextCharacterAt = performance.now() + 3000;
        voice.success(
          lesson.progress,
          stage === 'level-complete',
          followingLevel(levelIndex) === null,
        );
        celebration.play();
      }
      effects.cut(hitPosition, complete);
      const source =
        activeController >= 0
          ? (controllers[activeController].userData.source as XRInputSource)
          : undefined;
      source?.gamepad?.hapticActuators?.[0]
        ?.pulse(complete ? 0.65 : 0.4, complete ? 110 : 55)
        .catch(() => {});
    } else if (previousState === 'tracing' && lesson.state === 'retry') {
      hitPosition.copy(p);
      lessonRoot.localToWorld(hitPosition);
      audio.impact(hitPosition, false, true);
      celebration.reset();
      voice.mistake();
    }
    report();
  }
  function reset() {
    if (stage === 'level-complete') {
      stage = 'active';
      nextLevelConfirmed = false;
      characterIndex = 0;
      lesson.cuts = characters[0].cuts;
      PATH = characters[0].cuts.flat();
      rebuildGuide();
      voice.setCharacter(characters[0]);
    }
    if (stage.startsWith('review-')) {
      review.state = 'ready';
      stage = 'review-ready';
      voice.pause();
      lastStatus = '';
      report();
      return;
    }
    demoStart = 0;
    stage = 'active';
    lesson.reset();
    effects.reset();
    tipValid = false;
    audio.unlock();
    voice.beginCharacter();
    gestureDistance = 0;
    gesturePrevious = null;
    trailCount = 0;
    cursor.set(PATH[0].x, PATH[0].y, 0.025);
    lastStatus = '';
    report();
    if (!renderer.xr.isPresenting) canvas.focus({ preventScroll: true });
  }
  function loadReviewCharacter() {
    characterIndex = characters.findIndex(
      (v) => v.glyph === review.order[review.index],
    );
    const vowel = characters[characterIndex];
    lesson.cuts = vowel.cuts;
    PATH = vowel.cuts.flat();
    rebuildGuide();
    lesson.reset();
    effects.reset();
    pointerHeld = false;
    keyboardHeld = false;
    activeController = -1;
    keys.clear();
    gestureDistance = 0;
    gesturePrevious = null;
    trailCount = 0;
    tipValid = false;
    cursor.set(PATH[0].x, PATH[0].y, 0.025);
    voice.setCharacter(vowel);
    voice.beginCharacter();
  }
  function syncReview() {
    const desired =
      review.state === 'passed'
        ? 'level-complete'
        : review.state === 'ready'
          ? 'review-ready'
          : (`review-${review.state}` as NonNullable<DojoStatus['stage']>);
    const changed = stage !== desired;
    stage = desired;
    if (changed && review.state === 'active') loadReviewCharacter();
    if (changed && review.state === 'failed') {
      voice.pause();
      lesson.release();
      pointerHeld = false;
      keyboardHeld = false;
      activeController = -1;
    }
    report();
  }
  function advance(automatic = false) {
    if (stage === 'level-complete') {
      levelIndex = followingLevel(levelIndex) ?? 0;
      characters = CURRICULUM[levelIndex];
      characterIndex = 0;
      nextLevelConfirmed = false;
      stage = 'active';
      lesson.cuts = characters[0].cuts;
      PATH = characters[0].cuts.flat();
      rebuildGuide();
      voice.setCharacter(characters[0]);
      pointerHeld = false;
      keyboardHeld = false;
      activeController = -1;
      keys.clear();
      reset();
      return;
    }
    if (stage === 'character-complete' && !automatic) return;
    nextCharacterAt = Infinity;
    if (stage === 'review-ready' || stage === 'review-failed') {
      audio.unlock();
      voice.pause();
      review.start(reviewPool(0), performance.now());
      syncReview();
      return;
    }
    if (stage.startsWith('review-')) return;
    if (stage === 'active') {
      reset();
      return;
    }
    if (stage === 'character-complete') characterIndex++;

    const vowel = characters[characterIndex];
    lesson.cuts = vowel.cuts;
    PATH = vowel.cuts.flat();
    rebuildGuide();
    voice.setCharacter(vowel);
    reset();
  }
  const desktopSword = createKatana();
  scene.add(desktopSword);
  const controllers = [
    renderer.xr.getController(0),
    renderer.xr.getController(1),
  ];
  const grips = [
    renderer.xr.getControllerGrip(0),
    renderer.xr.getControllerGrip(1),
  ];
  controllers.forEach((controller, i) => {
    scene.add(controller, grips[i]);
    grips[i].add(createKatana());
    controller.addEventListener('connected', (e) => {
      controller.userData.source = e.data;
    });
    controller.addEventListener('disconnected', () => {
      delete controller.userData.source;
      if (activeController === i) {
        lesson.release();
        activeController = -1;
        report();
      }
    });
    controller.addEventListener('selectstart', () => {
      audio.unlock();
      if (activeController !== -1) return;
      activeController = i;
      tipValid = false;
      trailCount = 0;
      if (
        stage === 'review-ready' ||
        stage === 'review-failed' ||
        lesson.state === 'complete'
      ) {
        advance();
        return;
      }
      demoStart = 0;
      beginGesture();
    });
    controller.addEventListener('selectend', () => {
      if (activeController === i) {
        endGesture();
        activeController = -1;
      }
    });
    controller.addEventListener('squeezestart', () => {
      lesson.release();
      needsCenter = true;
    });
  });
  // A fixed-size ribbon records blade motion. No geometry is allocated per frame.
  const trailLength = 48,
    trailPositions = new Float32Array(trailLength * 18),
    trailColors = new Float32Array(trailLength * 18);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(trailPositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  trailGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(trailColors, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const trail = new THREE.Mesh(
    trailGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  trail.frustumCulled = false;
  scene.add(trail);
  const history = Array.from({ length: trailLength + 1 }, () => ({
    tip: new THREE.Vector3(),
    base: new THREE.Vector3(),
    time: 0,
  }));
  let trailCount = 0;
  const swordOffset = new THREE.Vector3(0.22, -0.27, 0.84)
    .normalize()
    .multiplyScalar(0.9);
  const tipWorld = new THREE.Vector3(),
    trailInnerWorld = new THREE.Vector3(),
    localTip = new THREE.Vector3(),
    temp = new THREE.Vector3();
  // Keep the ribbon on the final 6 cm of the blade, in both desktop and VR.
  function updateTrail(tip: THREE.Vector3, base: THREE.Vector3, time: number) {
    for (let i = Math.min(trailCount, trailLength); i > 0; i--) {
      history[i].tip.copy(history[i - 1].tip);
      history[i].base.copy(history[i - 1].base);
      history[i].time = history[i - 1].time;
    }
    history[0].tip.copy(tip);
    history[0].base.copy(base);
    history[0].time = time;
    trailCount = Math.min(trailCount + 1, trailLength);
    let offset = 0;
    for (let i = 0; i < trailCount - 1; i++) {
      const a = history[i],
        b = history[i + 1];
      const points = [a.tip, a.base, b.tip, a.base, b.base, b.tip];
      for (const p of points) {
        const sample = p === a.tip || p === a.base ? a : b;
        const life = Math.max(0, 1 - (time - sample.time) / 0.25);
        const inner = p === sample.base;
        const brightness = life * life;
        // Thin the tail as it fades, retaining the physical curved-tip trajectory.
        trailPositions[offset] = inner
          ? THREE.MathUtils.lerp(sample.tip.x, p.x, life)
          : p.x;
        trailColors[offset++] = brightness;
        trailPositions[offset] = inner
          ? THREE.MathUtils.lerp(sample.tip.y, p.y, life)
          : p.y;
        trailColors[offset++] = brightness * 0.57;
        trailPositions[offset] = inner
          ? THREE.MathUtils.lerp(sample.tip.z, p.z, life)
          : p.z;
        trailColors[offset++] = brightness * 0.18;
      }
    }
    trailGeometry.setDrawRange(0, offset / 3);
    trailGeometry.attributes.position.needsUpdate = true;
    trailGeometry.attributes.color.needsUpdate = true;
  }
  const raycaster = new THREE.Raycaster(),
    plane = new THREE.Plane(),
    normal = new THREE.Vector3(0, 0, 1),
    ndc = new THREE.Vector2();
  function movePointer(e: PointerEvent) {
    if (renderer.xr.isPresenting) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    plane.setFromNormalAndCoplanarPoint(normal, lessonRoot.position);
    if (raycaster.ray.intersectPlane(plane, temp)) {
      cursor.copy(lessonRoot.worldToLocal(temp));
      cursor.z = 0.025;
      if (pointerHeld && !demoStart) sample(cursor);
    }
  }
  function pointerDown(e: PointerEvent) {
    audio.unlock();
    if (e.button !== 0 || renderer.xr.isPresenting) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    pointerHeld = true;
    demoStart = 0;
    if (
      stage === 'review-ready' ||
      stage === 'review-failed' ||
      lesson.state === 'complete'
    ) {
      advance();
      return;
    }
    beginGesture();
    movePointer(e);
  }
  function pointerUp() {
    if (!pointerHeld) return;
    pointerHeld = false;
    endGesture();
  }
  function keyDown(e: KeyboardEvent) {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
        e.code,
      )
    ) {
      e.preventDefault();
      keys.add(e.code);
      if (e.code === 'Space' && !keyboardHeld) {
        audio.unlock();
        keyboardHeld = true;
        demoStart = 0;
        if (
          stage === 'review-ready' ||
          stage === 'review-failed' ||
          lesson.state === 'complete'
        ) {
          advance();
          return;
        }
        beginGesture();
        sample(cursor);
      }
    }
    if (e.code === 'KeyR') reset();
  }
  function keyUp(e: KeyboardEvent) {
    keys.delete(e.code);
    if (e.code === 'Space') {
      if (!keyboardHeld) return;
      keyboardHeld = false;
      endGesture();
    }
  }
  function blur() {
    keys.clear();
    keyboardHeld = false;
    pointerHeld = false;
    lesson.release();
    report();
  }
  function visibilityChanged() {
    audio.pause(document.hidden);
    if (document.hidden) {
      voice.pause();
      if (stage.startsWith('review-')) {
        review.interrupt();
        syncReview();
      }
    }
    blur();
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  canvas.addEventListener('pointermove', movePointer);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('keyup', keyUp);
  canvas.addEventListener('blur', blur);
  const mobileLayout = window.matchMedia('(max-width: 720px)');
  const resize = new ResizeObserver(() => {
    if (renderer.xr.isPresenting) return;
    const { width, height } = host.getBoundingClientRect();
    camera.aspect = width / height;
    // Slightly widen the desktop view; preserve the mobile character scale.
    camera.fov = mobileLayout.matches ? 58 : 64;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resize.observe(host);
  renderer.xr.addEventListener('sessionstart', () => {
    needsCenter = true;
    desktopSword.visible = false;
    lastStatus = '';
    report();
  });
  renderer.xr.addEventListener('sessionend', () => {
    if (stage.startsWith('review-')) {
      review.interrupt();
      syncReview();
    }
    activeController = -1;
    desktopSword.visible = true;
    lessonRoot.position.set(0, 1.5, -1.12);
    lessonRoot.rotation.set(0, 0, 0);
    camera.position.set(0, 1.72, 0.85);
    camera.lookAt(0, 1.45, -1.3);
    lastStatus = '';
    report();
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height);
  });
  if (navigator.xr)
    navigator.xr
      .isSessionSupported('immersive-vr')
      .then((v) => {
        if (!disposed) onXR(v);
      })
      .catch(() => {});
  const listenerPosition = new THREE.Vector3(),
    listenerForward = new THREE.Vector3(),
    listenerUp = new THREE.Vector3();
  const previousTip = new THREE.Vector3();
  let tipValid = false,
    swordSpeed = 0;
  let lastArrowKey = '';
  let lastFrame = 0,
    elapsed = 0;
  renderer.setAnimationLoop((time) => {
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
    lastFrame = time;
    elapsed += dt;
    if (
      stage === 'character-complete' &&
      !document.hidden &&
      performance.now() >= nextCharacterAt
    ) {
      pointerHeld = false;
      keyboardHeld = false;
      activeController = -1;
      keys.clear();
      advance(true);
    }
    if (
      stage.startsWith('review-') &&
      !['review-ready', 'review-failed'].includes(stage)
    ) {
      review.tick(performance.now());
      syncReview();
    }
    if (needsCenter && renderer.xr.isPresenting) {
      const xrCamera = renderer.xr.getCamera();
      xrCamera.getWorldPosition(temp);
      const direction = new THREE.Vector3();
      xrCamera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      lessonRoot.position.copy(temp).addScaledVector(direction, 1.05);
      lessonRoot.position.y = temp.y - 0.15;
      lessonRoot.rotation.y = Math.atan2(-direction.x, -direction.z);
      lessonRoot.updateMatrixWorld(true);
      needsCenter = false;
    }
    if (demoStart) {
      const t =
        (elapsed - demoStart) /
        Math.max(3, characters[characterIndex].cuts.length * 0.8);
      const p = Math.min(PATH.length - 1, Math.max(0, t * (PATH.length - 1))),
        i = Math.floor(p),
        next = i % 21 === 20 ? i : Math.min(PATH.length - 1, i + 1);
      demoPoint = p;
      cursor.set(
        THREE.MathUtils.lerp(PATH[i].x, PATH[next].x, p - i),
        THREE.MathUtils.lerp(PATH[i].y, PATH[next].y, p - i),
        0.025,
      );
      if (t >= 1.2) {
        demoStart = 0;
        lesson.reset();
        report();
      }
    } else if (!renderer.xr.isPresenting) {
      const speed = 0.42 * dt;
      cursor.x +=
        (Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'))) *
        speed;
      cursor.y +=
        (Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'))) * speed;
      if (keyboardHeld) sample(cursor);
    }
    if (renderer.xr.isPresenting) {
      const i =
        activeController >= 0
          ? activeController
          : controllers.findIndex(
              (c) => c.userData.source?.handedness === 'right',
            );
      const index = i >= 0 ? i : 0;
      grips[index].updateWorldMatrix(true, false);
      tipWorld.copy(KATANA_TIP).applyMatrix4(grips[index].matrixWorld);
      trailInnerWorld
        .copy(KATANA_TRAIL_INNER)
        .applyMatrix4(grips[index].matrixWorld);
      if (controllers[index].userData.source) {
        updateTrail(tipWorld, trailInnerWorld, elapsed);
        if (activeController >= 0) {
          localTip.copy(tipWorld);
          lessonRoot.worldToLocal(localTip);
          sample(localTip);
        }
      }
    } else {
      worldCursor.copy(cursor);
      lessonRoot.localToWorld(worldCursor);
      desktopSword.position.copy(worldCursor).add(swordOffset);
      desktopSword.lookAt(worldCursor);
      desktopSword.rotateY(Math.PI);
      desktopSword.updateWorldMatrix(true, false);
      // Correct the grip position for the curved tip's lateral offset.
      temp.copy(KATANA_TIP).applyMatrix4(desktopSword.matrixWorld);
      desktopSword.position.add(temp.sub(worldCursor).negate());
      desktopSword.updateWorldMatrix(true, false);
      tipWorld.copy(KATANA_TIP).applyMatrix4(desktopSword.matrixWorld);
      trailInnerWorld
        .copy(KATANA_TRAIL_INNER)
        .applyMatrix4(desktopSword.matrixWorld);
      updateTrail(tipWorld, trailInnerWorld, elapsed);
    }
    if (tipValid && dt > 0) {
      const distance = previousTip.distanceTo(tipWorld);
      swordSpeed = distance < 1.6 ? Math.min(12, distance / dt) : 0;
      if (!demoStart) audio.swish(swordSpeed, tipWorld);
    }
    previousTip.copy(tipWorld);
    tipValid = true;
    const view = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    view.getWorldPosition(listenerPosition);
    view.getWorldDirection(listenerForward);
    listenerUp.set(0, 1, 0).transformDirection(view.matrixWorld);
    audio.listener(listenerPosition, listenerForward, listenerUp);
    audio.tick(lesson.progress / 100);
    effects.update(dt, elapsed, false, lesson.progress);
    celebration.update(dt, renderer.xr.isPresenting);
    warm.intensity =
      9 + Math.sin(elapsed * 1.6) * 0.6 + Math.min(swordSpeed, 5) * 0.2;
    lanternMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 2.1) * 0.1;
    glowMat.opacity = 0.18 + Math.min(swordSpeed, 5) * 0.025;
    (trail.material as THREE.MeshBasicMaterial).opacity =
      0.45 + Math.min(swordSpeed, 5) * 0.07;
    const idx = Math.min(PATH.length - 1, lesson.next);
    target.position.set(PATH[idx].x, PATH[idx].y, 0.014);
    target.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.15);
    target.visible = lesson.state !== 'complete';
    arrow.sprite.visible =
      (stage === 'active' || stage === 'review-active') && !demoStart;
    const activeCut =
      characters[characterIndex].cuts[
        Math.min(
          lesson.completedCuts,
          characters[characterIndex].cuts.length - 1,
        )
      ];
    arrow.sprite.position.set(activeCut[0].x, activeCut[0].y + 0.13, 0.02);
    const arrowKey = `${levelIndex}:${characterIndex}:${lesson.completedCuts}`;
    if (arrowKey !== lastArrowKey) {
      lastArrowKey = arrowKey;
      arrow.ctx.clearRect(0, 0, 1024, 160);
      arrow.ctx.fillStyle = '#f5d196';
      arrow.ctx.fillText(
        `${Math.min(lesson.completedCuts + 1, characters[characterIndex].cuts.length)} · ${cutDirection(activeCut)}`,
        512,
        90,
      );
      arrow.texture.needsUpdate = true;
    }
    if (demoStart) spark.position.copy(cursor);
    else spark.position.copy(target.position);
    spark.visible = lesson.state !== 'complete';
    guideSegments.forEach((m) => {
      m.material =
        m.userData.end < (demoStart ? demoPoint : lesson.next)
          ? completeMat
          : guideMat;
    });
    subtitle.sprite.visible = !!masterLine && renderer.xr.isPresenting;
    heading.sprite.visible =
      !subtitle.sprite.visible &&
      (stage.startsWith('review-') || stage === 'level-complete');
    feedback.sprite.visible =
      stage !== 'intro' && (renderer.xr.isPresenting || !mobileLayout.matches);
    const reviewScreen =
      stage.startsWith('review-') || stage === 'level-complete';
    const blockingReview =
      reviewScreen && stage !== 'review-active' && stage !== 'review-between';
    reviewPanel.sprite.visible = reviewScreen && renderer.xr.isPresenting;
    reviewPanel.sprite.position.set(0, blockingReview ? 0.05 : 0.9, 0.06);
    guideRoot.visible = !blockingReview;
    if (blockingReview) {
      target.visible = false;
      spark.visible = false;
      arrow.sprite.visible = false;
    }
    if (reviewScreen) {
      heading.sprite.visible = false;
      feedback.sprite.visible = false;
    }
    subtitle.sprite.position.y =
      reviewScreen && stage !== 'level-complete' ? -0.88 : 1.02;
    renderer.render(scene, camera);
  });
  report();
  return {
    reset,
    advance,
    setReviewSeconds(seconds) {
      if (review.state === 'ready' || review.state === 'failed') {
        review.seconds = Math.max(1, Math.min(10, Math.round(seconds)));
        lastStatus = '';
        report();
      }
    },
    demonstrate() {
      if (stage.startsWith('review-')) return;
      reset();
      demoStart = Math.max(0.001, elapsed);
      report();
    },
    async enterVR() {
      audio.unlock();
      if (!window.isSecureContext)
        throw new Error(
          'VR needs HTTPS. Open the hosted dojo in Meta Quest Browser.',
        );
      if (
        !navigator.xr ||
        !(await navigator.xr.isSessionSupported('immersive-vr'))
      )
        throw new Error(
          'No VR headset detected. Open this dojo in Meta Quest Browser, or use the desktop preview above.',
        );
      if (renderer.xr.isPresenting) return;
      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
        });
        try {
          await renderer.xr.setSession(session);
          session.addEventListener('visibilitychange', () => {
            audio.pause(session.visibilityState !== 'visible');
            if (session.visibilityState !== 'visible') {
              if (stage.startsWith('review-')) {
                review.interrupt();
                syncReview();
              }
              voice.pause();
              lesson.release();
              activeController = -1;
              report();
            }
          });
        } catch (error) {
          await session.end();
          throw error;
        }
      } catch {
        throw new Error(
          'VR could not start. Allow VR access in Quest Browser and try again.',
        );
      }
    },
    setVoice(v) {
      voice.setEnabled(v);
    },
    setPronunciation(mode) {
      voice.setPronunciation(mode);
    },
    pronounce() {
      audio.unlock();
      voice.replay();
    },
    setSound(v) {
      audio.setEffects(v);
    },
    setMusic(v) {
      audio.setMusic(v);
    },
    setVolume(v) {
      audio.setVolume(v);
      voice.setVolume(v);
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      void renderer.xr.getSession()?.end();
      voice.dispose();
      celebration.dispose();
      audio.dispose();
      environment.dispose();
      document.removeEventListener('visibilitychange', visibilityChanged);
      const geometries = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Line ||
          o instanceof THREE.Points ||
          o instanceof THREE.Sprite
        ) {
          if ('geometry' in o) geometries.add(o.geometry);
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => mats.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      [heading, feedback, arrow, subtitle, reviewPanel].forEach((t) =>
        t.texture.dispose(),
      );
      renderer.dispose();
      canvas.remove();
    },
  };
}
