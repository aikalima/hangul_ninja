import * as THREE from 'three';

// Shared physical landmarks keep tracing and the tip-only ribbon on the curved blade.
export const KATANA_TIP = new THREE.Vector3(0.055, 0, -0.9);
export const KATANA_TRAIL_INNER = new THREE.Vector3(0.046, 0, -0.84);
// Hold the forward part of the grip, 5 cm toward the guard.
export const KATANA_TOUCH_POINT = new THREE.Vector3(0, 0, -0.05);
// Desktop pose points the blade up and left, away from the held grip.
export const DESKTOP_SWORD_OFFSET = new THREE.Vector3(0.22, -0.27, 0.84)
  .normalize()
  .multiplyScalar(0.9);
export const DESKTOP_TIP_OFFSET = KATANA_TIP.clone().sub(KATANA_TOUCH_POINT).applyQuaternion(
  new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(
      DESKTOP_SWORD_OFFSET,
      new THREE.Vector3(),
      new THREE.Vector3(0, 1, 0),
    ),
  ),
);

export function tipFromGrip(grip: THREE.Vector3, target: THREE.Vector3) {
  return target.copy(grip).add(DESKTOP_TIP_OFFSET);
}

export function createKatana() {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: '#dce5e7',
    metalness: 0.82,
    roughness: 0.23,
    emissive: '#5c6a73',
    emissiveIntensity: 0.12,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: '#f4f4e9',
    metalness: 0.74,
    roughness: 0.17,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: '#303638',
    metalness: 0.72,
    roughness: 0.4,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: '#ab915d',
    metalness: 0.72,
    roughness: 0.35,
  });
  const wrap = new THREE.MeshStandardMaterial({
    color: '#24303a',
    roughness: 0.93,
  });
  const same = new THREE.MeshStandardMaterial({
    color: '#d7c9a5',
    roughness: 0.9,
  });
  function add(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  // A slightly curved, diamond-section blade with a tapered kissaki.
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36,
      curve = 0.055 * t * t,
      width = 0.035 * (t > 0.89 ? (1 - t) / 0.11 : 1 - 0.14 * t),
      thickness = 0.0055 * (1 - t * 0.6),
      z = -0.18 - 0.72 * t;
    vertices.push(
      curve - width * 0.5,
      0,
      z,
      curve,
      thickness,
      z,
      curve + width * 0.5,
      0,
      z,
      curve,
      -thickness,
      z,
    );
    if (i < 36)
      for (let face = 0; face < 4; face++) {
        const a = i * 4 + face,
          b = i * 4 + ((face + 1) % 4),
          c = a + 4,
          d = b + 4;
        indices.push(a, b, c, b, d, c);
      }
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  blade.setIndex(indices);
  blade.computeVertexNormals();
  add(blade, steel);
  const hamon: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i++) {
    const t = i / 70;
    hamon.push(
      new THREE.Vector3(
        0.055 * t * t + 0.008 + Math.sin(t * 85) * 0.0013,
        0.003,
        -0.18 - 0.72 * t,
      ),
    );
  }
  add(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(hamon),
      64,
      0.0009,
      3,
      false,
    ),
    edge,
  );
  // Oval iron tsuba and brass habaki/fuchi, perpendicular to the blade.
  const guard = add(
    new THREE.CylinderGeometry(0.065, 0.065, 0.009, 32),
    iron,
    0,
    0,
    -0.15,
  );
  guard.rotation.x = Math.PI / 2;
  guard.scale.z = 0.82;
  const rim = add(
    new THREE.TorusGeometry(0.063, 0.002, 6, 32),
    brass,
    0,
    0,
    -0.145,
  );
  rim.scale.y = 0.82;
  add(new THREE.BoxGeometry(0.035, 0.018, 0.03), brass, 0, 0, -0.174);
  const handle = add(
    new THREE.CylinderGeometry(0.019, 0.022, 0.25, 12),
    same,
    0,
    0,
    -0.005,
  );
  handle.rotation.x = Math.PI / 2;
  handle.scale.z = 0.8;
  for (let i = 0; i < 10; i++)
    for (const side of [-1, 1]) {
      const band = add(
        new THREE.BoxGeometry(0.044, 0.005, 0.012),
        wrap,
        0,
        side * 0.017,
        -0.115 + i * 0.024,
      );
      band.rotation.y = side * 0.64;
    }
  for (const z of [-0.128, 0.12]) {
    const fitting = add(
      new THREE.CylinderGeometry(0.023, 0.023, 0.017, 12),
      brass,
      0,
      0,
      z,
    );
    fitting.rotation.x = Math.PI / 2;
    fitting.scale.z = 0.78;
  }
  return group;
}
