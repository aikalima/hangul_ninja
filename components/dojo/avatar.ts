import * as THREE from 'three';
import { FIGHTERS, type FighterId } from '@/lib/fighters';

/** Cosmetic first-person body. Hands are tracked; elbow/shoulder poses are inferred. */
export function createAvatar(scene: THREE.Scene) {
  const cloth = new THREE.MeshStandardMaterial({
    color: FIGHTERS[0].cloth,
    roughness: 0.96,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: FIGHTERS[0].trim,
    roughness: 0.88,
  });
  const glove = new THREE.MeshStandardMaterial({
    color: FIGHTERS[0].glove,
    roughness: 0.92,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: FIGHTERS[0].metal,
    metalness: 0.6,
    roughness: 0.45,
  });
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  scene.add(root);
  function piece(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    return piece(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }
  piece(
    body,
    new THREE.CylinderGeometry(0.22, 0.26, 0.46, 8),
    cloth,
    0,
    0,
    0,
  ).scale.z = 0.6;
  const lapels = [-1, 1].map((side) => {
    const m = box(body, 0.065, 0.4, 0.018, trim, side * 0.065, 0.02, -0.147);
    m.rotation.z = side * 0.25;
    return m;
  });
  box(body, 0.47, 0.1, 0.32, trim, 0, -0.22, 0);
  box(body, 0.11, 0.09, 0.04, metal, 0.11, -0.22, -0.18);
  const panels = [-1, 1].map((side) => {
    const m = box(body, 0.22, 0.44, 0.22, cloth, side * 0.125, -0.48, 0);
    m.rotation.z = side * 0.055;
    return m;
  });
  const sash = box(body, 0.075, 0.35, 0.026, trim, -0.16, -0.43, -0.15);
  const arms = [-1, 1].map((side) => {
    const hand = new THREE.Group();
    root.add(hand);
    const palm = piece(
      hand,
      new THREE.SphereGeometry(1, 16, 12),
      glove,
      side * 0.029,
      0.004,
      -0.04,
    );
    palm.scale.set(0.03, 0.034, 0.064);
    for (let i = 0; i < 4; i++) {
      const z = -0.09 + i * 0.025;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.047, 0.018, z),
        new THREE.Vector3(side * 0.04, -0.02, z),
        new THREE.Vector3(side * 0.012, -0.033, z),
        new THREE.Vector3(-side * 0.023, -0.012, z),
      ]);
      piece(hand, new THREE.TubeGeometry(path, 12, 0.009, 8, false), glove);
      const knuckle = piece(
        hand,
        new THREE.SphereGeometry(0.01, 10, 8),
        glove,
        side * 0.04,
        -0.019,
        z,
      );
      knuckle.scale.y = 0.8;
    }
    piece(
      hand,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.046, 0.027, 0.004),
          new THREE.Vector3(side * 0.014, 0.038, -0.028),
          new THREE.Vector3(-side * 0.018, 0.019, -0.055),
        ]),
        12,
        0.012,
        8,
        false,
      ),
      glove,
    );
    piece(
      hand,
      new THREE.CylinderGeometry(0.043, 0.048, 0.065, 10),
      trim,
      0,
      0,
      0.049,
    ).rotation.x = Math.PI / 2;
    box(hand, 0.057, 0.012, 0.075, metal, side * 0.012, 0.042, -0.015);
    const profile = (radii: number[]) =>
      new THREE.LatheGeometry(
        radii.map((r, i) => new THREE.Vector2(r, i / (radii.length - 1) - 0.5)),
        20,
      );
    const upper = piece(
      root,
      profile([0.079, 0.087, 0.084, 0.086, 0.075, 0.062, 0.06, 0.052]),
      cloth,
    );
    const fore = piece(
      root,
      profile([0.054, 0.067, 0.068, 0.064, 0.06, 0.052, 0.047, 0.04]),
      cloth,
    );
    const joint = piece(root, new THREE.SphereGeometry(0.057, 16, 12), cloth);
    const bracer = piece(
      root,
      new THREE.CylinderGeometry(
        0.043,
        0.055,
        1,
        16,
        1,
        true,
        -Math.PI * 0.42,
        Math.PI * 0.84,
      ),
      metal,
    );
    return { hand, upper, fore, bracer, joint, side };
  });
  const up = new THREE.Vector3(0, 1, 0),
    position = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    shoulder = new THREE.Vector3(),
    wrist = new THREE.Vector3(),
    elbow = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    mid = new THREE.Vector3(),
    axis = new THREE.Vector3(),
    pole = new THREE.Vector3();
  let enabled = true,
    yaw = 0,
    width = 0.082;
  function bridge(
    mesh: THREE.Mesh,
    a: THREE.Vector3,
    b: THREE.Vector3,
    scale: number,
  ) {
    delta.subVectors(b, a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(scale, Math.max(0.001, delta.length()), scale);
    mesh.quaternion.setFromUnitVectors(up, delta.normalize());
  }
  return {
    select(id: FighterId) {
      const f = FIGHTERS.find((f) => f.id === id)!;
      cloth.color.set(f.cloth);
      trim.color.set(f.trim);
      glove.color.set(f.glove);
      metal.color.set(f.metal);
      width = f.width;
      panels.forEach((p) => (p.scale.y = f.skirt / 0.44));
      lapels.forEach((p) => (p.scale.x = id === 'cloud' ? 1.35 : 1));
    },
    show(value: boolean) {
      enabled = value;
      root.visible = value;
    },
    update(
      view: THREE.Camera,
      desktopSword: THREE.Group,
      grips: THREE.Group[],
      sources: (XRInputSource | undefined)[],
      vr: boolean,
      time: number,
    ) {
      if (!enabled) return;
      view.getWorldPosition(position);
      view.getWorldDirection(direction);
      if (Math.hypot(direction.x, direction.z) > 0.15)
        yaw = Math.atan2(-direction.x, -direction.z);
      body.position.copy(position);
      body.position.y -= 0.63;
      body.rotation.y = yaw;
      body.updateMatrixWorld(true);
      sash.rotation.x = Math.sin(time * 1.8) * 0.035;
      for (const arm of arms) {
        const index = sources.findIndex(
          (s) => s?.handedness === (arm.side < 0 ? 'left' : 'right'),
        );
        const visible = !vr || index >= 0;
        arm.hand.visible =
          arm.upper.visible =
          arm.fore.visible =
          arm.joint.visible =
          arm.bracer.visible =
            visible;
        if (!visible) continue;
        if (vr) {
          grips[index].getWorldPosition(arm.hand.position);
          grips[index].getWorldQuaternion(arm.hand.quaternion);
        } else if (arm.side > 0) {
          desktopSword.getWorldPosition(arm.hand.position);
          desktopSword.getWorldQuaternion(arm.hand.quaternion);
        } else {
          arm.hand.position
            .set(-0.28, -0.34, -0.5)
            .applyMatrix4(view.matrixWorld);
          arm.hand.quaternion.copy(view.quaternion);
          arm.hand.rotateZ(-0.25);
          arm.hand.rotateY(-0.25);
        }
        wrist
          .set(0, 0, 0.085)
          .applyQuaternion(arm.hand.quaternion)
          .add(arm.hand.position);
        shoulder
          .set(arm.side * 0.21, 0.34, 0.02)
          .applyMatrix4(body.matrixWorld);
        axis.subVectors(wrist, shoulder);
        const distance = Math.max(0.01, axis.length());
        axis.normalize();
        // Two-segment elbow bend with a stable outward/downward pole.
        // Accommodate uncalibrated users without moving their tracked hands.
        const reachScale = Math.max(1, distance / 0.64),
          upperLength = 0.34 * reachScale,
          foreLength = 0.31 * reachScale;
        const along = THREE.MathUtils.clamp(
          (upperLength * upperLength -
            foreLength * foreLength +
            distance * distance) /
            (2 * distance),
          0,
          upperLength,
        );
        const bend = Math.sqrt(
          Math.max(0, upperLength * upperLength - along * along),
        );
        pole.set(
          Math.cos(yaw) * arm.side * 0.45,
          -1,
          -Math.sin(yaw) * arm.side * 0.45,
        );
        pole.addScaledVector(axis, -pole.dot(axis));
        if (pole.lengthSq() < 0.001) pole.set(Math.cos(yaw), 0, -Math.sin(yaw));
        pole.normalize();
        elbow
          .copy(shoulder)
          .addScaledVector(axis, along)
          .addScaledVector(pole, bend);
        arm.joint.position.copy(elbow);
        arm.joint.scale.setScalar(width / 0.082);
        bridge(arm.upper, shoulder, elbow, width / 0.095);
        bridge(arm.fore, elbow, wrist, width / 0.085);
        mid.copy(elbow).lerp(wrist, 0.62);
        bridge(arm.bracer, mid, wrist, 0.92);
      }
    },
  };
}
