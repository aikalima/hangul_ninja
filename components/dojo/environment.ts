import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Reference-inspired room built as real geometry, with deterministic material detail. */
export function buildEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  let seed = 1749;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function surface(kind: 'wood' | 'mat' | 'plaster') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle =
      kind === 'wood' ? '#8b6140' : kind === 'mat' ? '#b5a77d' : '#aaa08c';
    ctx.fillRect(0, 0, 512, 512);
    if (kind === 'wood') {
      for (let i = 0; i < 460; i++) {
        const x = random() * 512;
        ctx.strokeStyle = `rgba(${random() > 0.5 ? '38,23,14' : '208,166,112'},${0.04 + random() * 0.2})`;
        ctx.lineWidth = 0.4 + random() * 1.6;
        ctx.beginPath();
        for (let y = 0; y <= 512; y += 8) {
          const px =
            x + Math.sin(y * 0.025 + x) * 3 + Math.sin(y * 0.007 + x) * 7;
          if (y === 0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const x = random() * 512,
          y = random() * 512;
        for (let j = 1; j < 9; j++) {
          ctx.strokeStyle = 'rgba(42,25,14,.14)';
          ctx.beginPath();
          ctx.ellipse(x, y, 2 + j * 1.8, 5 + j * 5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (kind === 'mat') {
      for (let y = 0; y < 512; y += 3) {
        ctx.fillStyle = y % 6 ? '#a49970' : '#c5b78f';
        ctx.fillRect(0, y, 512, 1);
      }
      for (let x = 0; x < 512; x += 8) {
        ctx.fillStyle = 'rgba(78,73,43,.17)';
        ctx.fillRect(x, 0, 1, 512);
      }
    }
    for (let i = 0; i < 16000; i++) {
      ctx.fillStyle = `rgba(${random() > 0.5 ? '240,223,188' : '44,33,23'},${random() * 0.09})`;
      ctx.fillRect(
        random() * 512,
        random() * 512,
        1 + random() * 3,
        1 + random() * 2,
      );
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const grain = surface('wood'),
    weave = surface('mat'),
    plasterTexture = surface('plaster');
  const wood = new THREE.MeshStandardMaterial({
    map: grain,
    bumpMap: grain,
    bumpScale: 0.016,
    color: '#95795e',
    roughness: 0.86,
  });
  const dark = new THREE.MeshStandardMaterial({
    map: grain,
    bumpMap: grain,
    bumpScale: 0.008,
    color: '#514031',
    roughness: 0.85,
  });
  const border = new THREE.MeshStandardMaterial({
    color: '#373b2c',
    roughness: 1,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: '#847244',
    metalness: 0.62,
    roughness: 0.62,
  });
  const paper = new THREE.MeshStandardMaterial({
    map: plasterTexture,
    color: '#e0dbba',
    emissive: '#b8cccd',
    emissiveIntensity: 0.42,
    roughness: 1,
  });
  const mats = ['#d1c299', '#c5b58e', '#b8aa82'].map(
    (color) =>
      new THREE.MeshStandardMaterial({
        map: weave,
        bumpMap: weave,
        bumpScale: 0.006,
        color,
        roughness: 0.98,
      }),
  );
  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#ffdda0',
    emissive: '#ffc379',
    emissiveIntensity: 0.8,
    roughness: 0.8,
  });
  const room = new THREE.Group();
  scene.add(room);
  function mesh(
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    cast = true,
  ) {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    room.add(m);
    return m;
  }
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = wood,
    cast = true,
  ) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, cast);
  }
  function cylinder(
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = wood,
  ) {
    return mesh(new THREE.CylinderGeometry(r * 0.94, r, h, 16), mat, x, y, z);
  }
  // Raised timber floor and individually bound woven mats, with an outside walkway.
  box(9.6, 0.2, 11.4, 0, -0.16, -0.8, dark, false);
  for (let x = -4.5; x <= 4.5; x += 0.3)
    box(0.29, 0.05, 11, x, -0.035, -0.8, wood, false);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 7; col++) {
      const x = (col - 3) * 1.05,
        z = -3.95 + row * 2.02;
      box(1.035, 0.058, 2, x, -0.005, z, border, false);
      box(0.974, 0.06, 1.91, x, 0.001, z, mats[(col + row * 2) % 3], false);
      // Cloth piping catches the light at each mat edge.
      box(0.012, 0.007, 1.94, x - 0.487, 0.035, z, border, false);
      box(0.012, 0.007, 1.94, x + 0.487, 0.035, z, border, false);
    }
  // Closed back wall, low side paneling, and clerestory windows all around.
  box(9.4, 3.25, 0.18, 0, 1.56, -6.3, dark);
  for (let x = -4.5; x < 4.6; x += 0.19)
    box(0.17, 1.25, 0.08, x, 1.42, -6.16, wood);
  box(9.4, 0.18, 0.28, 0, 0.22, -6.12);
  box(9.4, 0.2, 0.25, 0, 2.83, -6.12);
  for (const side of [-1, 1]) {
    const x = side * 4.65;
    box(0.18, 1.05, 11, x, 0.48, -0.8, dark);
    box(0.21, 0.14, 11, x, 1.02, -0.8, wood);
    // Large translucent shoji panels create believable window depth.
    for (let section = 0; section < 4; section++) {
      const z = -4.85 + section * 2.62;
      box(0.045, 2.1, 2.35, x, 2.12, z, paper, false);
      for (let j = -3; j <= 3; j++)
        box(0.09, 2.1, 0.035, x - side * 0.035, 2.12, z + j * 0.32, dark);
      for (let y = 1.15; y < 3.2; y += 0.29)
        box(0.09, 0.025, 2.4, x - side * 0.04, y, z, dark);
      box(0.2, 3.4, 0.18, x, 1.65, z - 1.25, dark);
    }
    box(0.045, 0.84, 10.7, x, 3.8, -0.8, paper, false);
    for (let z = -6; z < 4.6; z += 0.18)
      box(0.1, 0.86, 0.033, x - side * 0.04, 3.8, z, wood);
    for (let y = 3.45; y < 4.22; y += 0.18)
      box(0.1, 0.026, 10.7, x - side * 0.04, y, -0.8, wood);
    box(0.24, 0.25, 11, x, 3.28, -0.8, wood);
    box(0.16, 0.12, 11, x, 4.28, -0.8, wood);
  }
  // The reference's heavy paired pillars and pegged overhead timber.
  for (const x of [-1.85, 1.85]) {
    cylinder(0.25, 3.1, x, 1.49, -5.25);
    cylinder(0.29, 0.16, x, 0.04, -5.25, dark);
    box(0.62, 0.47, 0.67, x, 2.98, -5.25, wood);
    box(0.65, 0.065, 0.69, x, 2.75, -5.25, brass);
    box(0.65, 0.065, 0.69, x, 3.21, -5.25, brass);
    cylinder(0.235, 1.25, x, 3.9, -5.25);
    for (const dx of [-0.2, 0.2]) {
      const peg = cylinder(0.036, 0.04, x + dx, 2.98, -4.9, brass);
      peg.rotation.x = Math.PI / 2;
    }
  }
  box(4.32, 0.44, 0.55, 0, 2.99, -5.25, wood);
  box(2.8, 0.07, 0.62, 0, 2.74, -5.25, dark);
  for (const x of [-4.48, 4.48])
    for (const z of [-5.9, -2.3, 1.3, 4.5]) {
      box(0.25, 4.5, 0.25, x, 2.18, z, dark);
      box(0.38, 0.18, 0.38, x, 3.3, z, wood);
    }
  for (const z of [-6, -2.3, 1.3, 4.5]) box(9.4, 0.22, 0.25, 0, 4.32, z, wood);
  for (let x = -4.5; x <= 4.5; x += 0.38)
    box(0.36, 0.1, 11.2, x, 4.56, -0.8, dark);
  // Upper rear lattice: pale sky behind closely spaced wooden mullions.
  for (const z of [-6.24, 4.7]) {
    box(9.15, 0.9, 0.06, 0, 3.79, z, paper, false);
    for (let x = -4.4; x <= 4.4; x += 0.16)
      box(0.035, 0.92, 0.095, x, 3.79, z + (z < 0 ? 0.06 : -0.06), wood);
    for (let y = 3.42; y < 4.22; y += 0.17)
      box(9.2, 0.029, 0.1, 0, y, z + (z < 0 ? 0.06 : -0.06), wood);
    box(9.4, 0.18, 0.25, 0, 3.27, z, wood);
    box(9.4, 0.15, 0.25, 0, 4.3, z, wood);
  }
  // Rear wall behind the player's start position keeps the room convincing in 360°.
  box(9.4, 3.2, 0.16, 0, 1.54, 4.8, dark);
  box(1.6, 2.5, 0.06, 0, 1.22, 4.68, paper, false);
  for (let x = -0.8; x <= 0.8; x += 0.2)
    box(0.035, 2.5, 0.08, x, 1.22, 4.62, dark);
  box(9.3, 0.16, 0.22, 0, 2.98, 4.65, wood);
  // Low benches and wooden practice-sword racks.
  for (const x of [-3.15, 0, 3.15]) {
    box(2.1, 0.13, 0.58, x, 0.56, -5.88, wood);
    for (const dx of [-0.84, 0.84])
      box(0.11, 0.51, 0.43, x + dx, 0.25, -5.88, dark);
    box(1.85, 0.075, 0.075, x, 0.21, -5.66, wood);
  }
  for (const x of [-3.5, -2.95, -2.4]) {
    const weapon = cylinder(0.027, 1.1, x, 1.02, -5.86, dark);
    weapon.rotation.z = -0.18;
    box(0.18, 0.035, 0.075, x + 0.06, 1.32, -5.86, wood);
  }
  // A solid wooden training dummy, with staggered arms and a braced base.
  const dummyX = 3.23,
    dummyZ = -3.65;
  box(0.95, 0.11, 0.85, dummyX, 0.09, dummyZ, dark);
  cylinder(0.145, 1.9, dummyX, 1.06, dummyZ, wood);
  cylinder(0.17, 0.08, dummyX, 2.04, dummyZ, dark);
  for (let i = 0; i < 3; i++) {
    const arm = cylinder(
      0.046,
      0.68,
      dummyX + (i % 2 ? 0.19 : -0.18),
      1.58 - i * 0.25,
      dummyZ + 0.2,
      wood,
    );
    arm.rotation.x = Math.PI / 2;
    arm.rotation.z = i % 2 ? 0.4 : -0.4;
  }
  const leg = cylinder(0.055, 0.67, dummyX, 0.48, dummyZ + 0.22, dark);
  leg.rotation.x = 0.65;
  // Rolled training mats and a storage chest in the quiet corners.
  for (let i = 0; i < 3; i++) {
    const roll = cylinder(0.14, 1.05, -3.7 + i * 0.32, 0.22, -4.65, mats[i]);
    roll.rotation.z = Math.PI / 2;
  }
  box(0.95, 0.52, 0.6, 3.78, 0.3, 3.55, dark);
  box(1, 0.08, 0.66, 3.78, 0.6, 3.55, wood);
  for (const x of [3.45, 4.1]) box(0.045, 0.53, 0.63, x, 0.32, 3.55, brass);
  function artwork(scroll: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = scroll ? 1024 : 512;
    const c = canvas.getContext('2d')!;
    c.fillStyle = scroll ? '#b8a17c' : '#9e8964';
    c.fillRect(0, 0, canvas.width, canvas.height);
    if (scroll) {
      c.fillStyle = '#302b24';
      c.textAlign = 'center';
      c.font = '115px serif';
      c.fillText('수', 256, 370);
      c.fillText('련', 256, 555);
      c.fillStyle = '#853b29';
      c.fillRect(330, 680, 40, 42);
    } else {
      for (let layer = 0; layer < 4; layer++) {
        c.fillStyle = `rgba(46,49,38,${0.16 + layer * 0.13})`;
        c.beginPath();
        c.moveTo(0, 430);
        for (let x = 0; x <= 512; x += 12)
          c.lineTo(
            x,
            270 + layer * 34 - Math.abs(Math.sin(x * 0.009 + layer)) * 130,
          );
        c.lineTo(512, 512);
        c.lineTo(0, 512);
        c.fill();
      }
      c.fillStyle = '#c4ad80';
      c.beginPath();
      c.arc(370, 125, 31, 0, Math.PI * 2);
      c.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  }
  const painting = artwork(false);
  for (const x of [-3.15, 3.15]) {
    box(1.65, 1.08, 0.1, x, 2.08, -6.02, dark);
    box(1.48, 0.92, 0.03, x, 2.08, -5.955, brass);
    mesh(new THREE.PlaneGeometry(1.35, 0.8), painting, x, 2.08, -5.932, false);
  }
  mesh(
    new THREE.PlaneGeometry(0.62, 1.38),
    artwork(true),
    0,
    1.84,
    -6.02,
    false,
  );
  for (const y of [1.13, 2.55]) {
    const rod = cylinder(0.032, 0.77, 0, y, -5.99, dark);
    rod.rotation.z = Math.PI / 2;
  }
  // Small shaded lanterns; daylight remains the dominant light source.
  for (const x of [-3.25, 3.25]) {
    cylinder(0.018, 0.34, x, 3.75, -2.5, dark);
    cylinder(0.15, 0.33, x, 3.42, -2.5, lanternMat);
    box(0.35, 0.045, 0.35, x, 3.61, -2.5, dark);
    box(0.35, 0.045, 0.35, x, 3.24, -2.5, dark);
  }
  // Bake static shadow casters once. Merge by material AND shadow behavior.
  const batches = new Map<
    THREE.Material,
    Map<boolean, THREE.BufferGeometry[]>
  >();
  room.updateMatrixWorld(true);
  room.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mat = o.material as THREE.Material;
      const groups =
        batches.get(mat) || new Map<boolean, THREE.BufferGeometry[]>();
      const list = groups.get(o.castShadow) || [];
      list.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
      groups.set(o.castShadow, list);
      batches.set(mat, groups);
      o.geometry.dispose();
    }
  });
  room.clear();
  for (const [mat, groups] of batches)
    for (const [cast, geometries] of groups) {
      const geometry = mergeGeometries(geometries, false);
      if (geometry) {
        const m = new THREE.Mesh(geometry, mat);
        m.castShadow = cast;
        m.receiveShadow = true;
        room.add(m);
      }
      geometries.forEach((g) => g.dispose());
    }
  scene.background = new THREE.Color('#bac5bf');
  scene.fog = new THREE.FogExp2('#9f9b84', 0.013);
  scene.add(new THREE.HemisphereLight('#d5e4e7', '#64503a', 1.5));
  const sun = new THREE.DirectionalLight('#ffdfaa', 3.3);
  sun.position.set(-8, 7, 1.5);
  sun.target.position.set(0, 0, -2);
  scene.add(sun, sun.target);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 26;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  const warm = new THREE.PointLight('#ffcf93', 9, 11, 2);
  warm.position.set(0, 3, -2);
  scene.add(warm);
  const textures = [grain, weave, plasterTexture, painting.map];
  room.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const material = o.material as THREE.MeshStandardMaterial;
      if (material.map && !textures.includes(material.map))
        textures.push(material.map);
    }
  });
  return {
    wood,
    dark,
    warm,
    lanternMat,
    dispose() {
      textures.forEach((t) => t?.dispose());
      sun.shadow.map?.dispose();
    },
  };
}
