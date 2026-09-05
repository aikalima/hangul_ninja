import * as THREE from 'three';
import { buildEnvironment } from './environment';
import { createAvatar } from './avatar';
import { createKatana, KATANA_TIP, KATANA_TRAIL_INNER } from './katana';
import type { FighterId } from '@/lib/fighters';
import { PATH, FlowLesson, type TraceState } from '@/lib/tracing';
import { DojoAudio } from './audio';
import { MasterVoice } from './voice';
import {
  isFailedGesture,
  type PronunciationMode,
  type VoiceLine,
} from '@/lib/voice-lines';
import { createCelebration } from './celebration';
import { createEffects } from './effects';

export type DojoStatus = {
  progress: number;
  phase: TraceState | 'watching';
  message: string;
  master?: VoiceLine | null;
};
export type DojoAPI = {
  reset: () => void;
  demonstrate: () => void;
  enterVR: () => Promise<void>;
  setSound: (v: boolean) => void;
  setVoice: (v: boolean) => void;
  setPronunciation: (mode: PronunciationMode) => void;
  pronounce: () => void;
  setMusic: (v: boolean) => void;
  setVolume: (v: number) => void;
  setFighter: (id: FighterId) => void;
  showBody: (visible: boolean) => void;
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
    color: '#c0b487',
    transparent: true,
    opacity: 0.3,
  });
  const completeMat = new THREE.MeshBasicMaterial({ color: '#ffe1a0' });
  const glowMat = new THREE.MeshBasicMaterial({
    color: '#edb779',
    transparent: true,
    opacity: 0.13,
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
  const guideSegments: THREE.Mesh[] = [];
  for (let i = 1; i < PATH.length; i++) {
    const a = new THREE.Vector3(PATH[i - 1].x, PATH[i - 1].y, 0),
      b = new THREE.Vector3(PATH[i].x, PATH[i].y, 0);
    guideSegments.push(segment(a, b, 0.011, guideMat, lessonRoot));
    segment(a, b, 0.035, glowMat, lessonRoot);
  }
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
  heading.ctx.fillText('ㄱ   /   GIYEOK', 512, 63);
  heading.ctx.fillStyle = '#b9bbaa';
  heading.ctx.font = '19px Arial';
  heading.ctx.fillText('ONE STROKE. ACROSS, THEN DOWN.', 512, 112);
  heading.texture.needsUpdate = true;
  heading.sprite.position.set(0, 0.89, 0);
  lessonRoot.add(heading.sprite);
  const subtitle = makeText(1.9, 224);
  subtitle.sprite.position.set(0, 0.92, 0.03);
  subtitle.sprite.visible = false;
  lessonRoot.add(subtitle.sprite);
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
  const lesson = new FlowLesson();
  const audio = new DojoAudio();
  const effects = createEffects(scene, lessonRoot);
  const celebration = createCelebration(
    lessonRoot,
    host.parentElement?.querySelector<HTMLElement>('[data-master-gesture]') ??
      null,
  );
  let lastStatus = '',
    demoStart = 0,
    disposed = false;
  let masterLine: VoiceLine | null = null;
  const voice = new MasterVoice(
    (line) => {
      if (disposed) return;
      masterLine = line;
      lastStatus = '';
      report();
    },
    (active) => audio.duck(active),
  );
  let gestureStart = 0,
    gestureDistance = 0,
    gesturePrevious: THREE.Vector3 | null = null;
  function beginGesture() {
    gestureStart = lesson.next;
    gestureDistance = 0;
    gesturePrevious = null;
    voice.intro();
  }
  function endGesture() {
    if (isFailedGesture(gestureStart, lesson.next, gestureDistance))
      voice.mistake();
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
    const message = watching
      ? 'Watch: right, then down.'
      : phase === 'complete'
        ? 'Combo complete. Two cuts, one character.'
        : progress >= 50
          ? 'Slash landed! Now cut downward.'
          : 'Sweep left to right through the guide.';
    const key = `${phase}:${progress}`;
    if (key === lastStatus) return;
    lastStatus = key;
    onStatus({ phase, progress, message, master: masterLine });
    const sub = subtitle.ctx;
    sub.clearRect(0, 0, 1024, 224);
    if (masterLine) {
      const hasGesture =
        masterLine.id === 'success' || masterLine.id === 'sound-success';
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
      celebration.position(0.78, 0.92);
    }
    subtitle.texture.needsUpdate = true;
    const c = feedback.ctx;
    c.clearRect(0, 0, 1024, 192);
    c.textAlign = 'center';
    c.fillStyle = phase === 'complete' ? '#d4eab0' : '#f1dec0';
    c.font = '28px Arial';
    c.fillText(masterLine?.ko ?? message, 512, 65);
    c.fillStyle = '#c8cbbb';
    c.font = '21px Arial';
    c.fillText(
      masterLine?.en ??
        (renderer.xr.isPresenting
          ? phase === 'complete'
            ? 'Press trigger to practice again'
            : 'Hold trigger to cut · Release to recover · Grip: recenter'
          : 'Drag right, then down · Release between cuts if needed'),
      512,
      110,
    );
    c.font = '18px Arial';
    c.fillText(watching ? 'DEMONSTRATION' : `${progress}%  COMPLETE`, 512, 153);
    feedback.texture.needsUpdate = true;
  }
  const hitPosition = new THREE.Vector3();
  function sample(p: THREE.Vector3) {
    if (gesturePrevious)
      gestureDistance += Math.min(0.5, gesturePrevious.distanceTo(p));
    gesturePrevious = p.clone();
    const before = lesson.next,
      previousState = lesson.state;
    lesson.sample(p);
    const crossedCorner = before < 21 && lesson.next >= 21;
    const complete =
      previousState !== 'complete' && lesson.state === 'complete';
    if (crossedCorner || complete) {
      hitPosition.set(0.45, complete ? -0.45 : 0.45, 0);
      lessonRoot.localToWorld(hitPosition);
      audio.impact(hitPosition, complete);
      if (complete) {
        voice.success(lesson.progress);
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
      voice.mistake();
    }
    report();
  }
  function reset() {
    demoStart = 0;
    lesson.reset();
    effects.reset();
    celebration.reset();
    tipValid = false;
    audio.unlock();
    voice.beginCharacter();
    gestureDistance = 0;
    gesturePrevious = null;
    trailCount = 0;
    cursor.set(-0.45, 0.45, 0.025);
    lastStatus = '';
    report();
    if (!renderer.xr.isPresenting) canvas.focus({ preventScroll: true });
  }
  const desktopSword = createKatana();
  scene.add(desktopSword);
  const avatar = createAvatar(scene);
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
      if (lesson.state === 'complete') reset();
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
      reset();
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
    if (lesson.state === 'complete') reset();
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
        if (lesson.state === 'complete') reset();
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
    if (document.hidden) voice.pause();
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
  const resize = new ResizeObserver(() => {
    if (renderer.xr.isPresenting) return;
    const { width, height } = host.getBoundingClientRect();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resize.observe(host);
  renderer.xr.addEventListener('sessionstart', () => {
    needsCenter = true;
    desktopSword.visible = false;
    reset();
  });
  renderer.xr.addEventListener('sessionend', () => {
    activeController = -1;
    desktopSword.visible = true;
    lessonRoot.position.set(0, 1.5, -1.12);
    lessonRoot.rotation.set(0, 0, 0);
    camera.position.set(0, 1.72, 0.85);
    camera.lookAt(0, 1.45, -1.3);
    reset();
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
  let lastFrame = 0,
    elapsed = 0;
  renderer.setAnimationLoop((time) => {
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
    lastFrame = time;
    elapsed += dt;
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
      const t = (elapsed - demoStart) / 3;
      const p = Math.min(40, Math.max(0, t * 40)),
        i = Math.floor(p),
        next = Math.min(40, i + 1);
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
    avatar.update(
      view,
      desktopSword,
      grips,
      controllers.map((c) => c.userData.source as XRInputSource | undefined),
      renderer.xr.isPresenting,
      elapsed,
    );
    audio.listener(listenerPosition, listenerForward, listenerUp);
    audio.tick(lesson.progress / 100);
    effects.update(dt, elapsed, true, lesson.progress);
    celebration.update(
      dt,
      renderer.xr.isPresenting,
      masterLine?.id === 'success' || masterLine?.id === 'sound-success',
    );
    warm.intensity =
      9 + Math.sin(elapsed * 1.6) * 0.6 + Math.min(swordSpeed, 5) * 0.2;
    lanternMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 2.1) * 0.1;
    glowMat.opacity = 0.13 + Math.min(swordSpeed, 5) * 0.025;
    (trail.material as THREE.MeshBasicMaterial).opacity =
      0.45 + Math.min(swordSpeed, 5) * 0.07;
    const idx =
      lesson.next === 21 ? 20 : Math.min(PATH.length - 1, lesson.next);
    target.position.set(PATH[idx].x, PATH[idx].y, 0.014);
    target.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.15);
    target.visible = lesson.state !== 'complete';
    arrow.sprite.visible = lesson.next < 2 && !demoStart;
    if (demoStart) spark.position.copy(cursor);
    else spark.position.copy(target.position);
    spark.visible = lesson.state !== 'complete';
    guideSegments.forEach((m, i) => {
      m.material = i < lesson.next - 1 ? completeMat : guideMat;
    });
    subtitle.sprite.visible = !!masterLine && renderer.xr.isPresenting;
    heading.sprite.visible = !subtitle.sprite.visible;
    renderer.render(scene, camera);
  });
  report();
  return {
    reset,
    setFighter(id) {
      avatar.select(id);
    },
    showBody(visible) {
      avatar.show(visible);
    },
    demonstrate() {
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
      [heading, feedback, arrow, subtitle].forEach((t) => t.texture.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
