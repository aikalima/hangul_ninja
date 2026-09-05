import * as THREE from 'three';

export function createEffects(scene: THREE.Scene, lessonRoot: THREE.Group) {
  const count = 160,
    positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3),
    lives = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const sparks = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sparks.frustumCulled = false;
  scene.add(sparks);
  const motePositions = new Float32Array(96 * 3);
  for (let i = 0; i < 96; i++) {
    motePositions[i * 3] = Math.sin(i * 7.1) * 4;
    motePositions[i * 3 + 1] = (i % 23) / 7;
    motePositions[i * 3 + 2] = -5 + Math.cos(i * 4.3) * 3;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(motePositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  const motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      color: '#edd6a0',
      size: 0.018,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(motes);
  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: '#ffc875',
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.365, 64),
    pulseMaterial,
  );
  lessonRoot.add(pulse);
  pulse.position.z = 0.025;
  let head = 0,
    pulseAge = 10;
  const gates = [new THREE.Group(), new THREE.Group()];
  const gateMaterial = new THREE.MeshStandardMaterial({
    color: '#dab578',
    emissive: '#986429',
    emissiveIntensity: 0.45,
    metalness: 0.35,
    roughness: 0.45,
  });
  const halves: THREE.Mesh[][] = [];
  const ages = [-1, -1];
  gates.forEach((group, i) => {
    group.position.set(0.45, i === 0 ? 0.45 : -0.45, 0);
    lessonRoot.add(group);
    const pair = [-1, 1].map((side) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, 0.065),
        gateMaterial,
      );
      m.position.x = side * 0.035;
      group.add(m);
      return m;
    });
    halves.push(pair);
  });
  function burst(position: THREE.Vector3, complete: boolean) {
    const total = complete ? 95 : 38;
    for (let j = 0; j < total; j++) {
      const i = head++ % count,
        offset = i * 3;
      lives[i] = 0.6 + Math.random() * 0.5;
      positions[offset] = position.x;
      positions[offset + 1] = position.y;
      positions[offset + 2] = position.z;
      velocity[offset] = (Math.random() - 0.5) * (complete ? 3 : 1.7);
      velocity[offset + 1] = Math.random() * 1.8;
      velocity[offset + 2] = (Math.random() - 0.5) * 1.5;
    }
    if (complete) {
      pulseAge = 0;
      pulse.scale.setScalar(1);
    }
  }
  return {
    cut(position: THREE.Vector3, complete: boolean) {
      ages[complete ? 1 : 0] = 0;
      burst(position, complete);
    },
    reset() {
      ages.fill(-1);
      lives.fill(0);
      pulseAge = 10;
    },
    update(dt: number, time: number, flow: boolean, progress: number) {
      pulseAge += dt;
      pulse.scale.setScalar(1 + pulseAge * 2);
      pulseMaterial.opacity = Math.max(0, 0.5 - pulseAge * 0.45);
      gates.forEach((gate, i) => {
        gate.visible = flow;
        const active =
          i === 0 ? progress < 50 : progress >= 50 && progress < 100;
        if (ages[i] >= 0) ages[i] += dt;
        const age = ages[i];
        gate.rotation.z = active ? Math.sin(time * 2) * 0.1 : 0;
        halves[i].forEach((half, j) => {
          const side = j === 0 ? -1 : 1;
          half.position.set(
            side * (0.035 + Math.max(0, age) * 0.65),
            age < 0 ? 0 : -age * age * 0.8,
            0,
          );
          half.rotation.z = age < 0 ? 0 : side * age * 2;
          half.visible = age < 1;
        });
      });
      for (let i = 0; i < count; i++) {
        const o = i * 3;
        lives[i] = Math.max(0, lives[i] - dt);
        if (lives[i] > 0) {
          positions[o] += velocity[o] * dt;
          positions[o + 1] += velocity[o + 1] * dt;
          positions[o + 2] += velocity[o + 2] * dt;
          velocity[o + 1] -= 1.8 * dt;
        }
        const fade = Math.min(1, lives[i]);
        colors[o] = fade;
        colors[o + 1] = fade * 0.63;
        colors[o + 2] = fade * 0.23;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      for (let i = 0; i < 96; i++) {
        const o = i * 3;
        motePositions[o] += Math.sin(time * 0.35 + i) * dt * 0.04;
        motePositions[o + 1] += dt * 0.018;
        if (motePositions[o + 1] > 3.5) motePositions[o + 1] = 0.1;
      }
      moteGeometry.attributes.position.needsUpdate = true;
    },
  };
}
