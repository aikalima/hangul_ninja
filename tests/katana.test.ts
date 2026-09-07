import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createKatana,
  KATANA_TIP,
  KATANA_TRAIL_INNER,
  DESKTOP_SWORD_OFFSET,
} from '../components/dojo/katana.ts';

void test('katana scoring landmark matches the modeled curved tip', () => {
  const katana = createKatana();
  const blade = katana.children[0] as THREE.Mesh;
  const points = blade.geometry.getAttribute('position');
  let tips = 0;
  for (let i = 0; i < points.count; i++)
    if (Math.abs(points.getZ(i) - KATANA_TIP.z) < 1e-6) {
      assert.ok(Math.abs(points.getX(i) - KATANA_TIP.x) < 1e-6);
      tips++;
    }
  assert.equal(tips, 4);
  assert.ok(KATANA_TIP.x > 0.04);
  const length = KATANA_TIP.distanceTo(KATANA_TRAIL_INNER);
  assert.ok(length >= 0.06 && length < 0.065);
  katana.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
});
void test('desktop reanchoring keeps the curved katana tip on the tracing cursor', () => {
  for (const target of [
    new THREE.Vector3(-0.45, 1.95, -1.12),
    new THREE.Vector3(0.45, 1.05, -1.12),
  ]) {
    const grip = new THREE.Group();
    grip.position
      .copy(target)
      .add(
        new THREE.Vector3(0.22, -0.27, 0.84).normalize().multiplyScalar(0.9),
      );
    grip.lookAt(target);
    grip.rotateY(Math.PI);
    grip.updateMatrixWorld(true);
    const tip = KATANA_TIP.clone().applyMatrix4(grip.matrixWorld);
    grip.position.add(tip.sub(target).negate());
    grip.updateMatrixWorld(true);
    assert.ok(
      KATANA_TIP.clone().applyMatrix4(grip.matrixWorld).distanceTo(target) <
        1e-8,
    );
  }
});

void test('physical blade tip stays under the pointer on mobile and desktop', () => {
  for (const aspect of [0.5, 1.6]) {
    const camera = new THREE.PerspectiveCamera(64, aspect, 0.01, 100);
    camera.position.set(0, 1.72, 0.85);
    camera.lookAt(0, 1.5, -1.12);
    camera.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    for (const pointer of [new THREE.Vector2(-0.3, -0.4), new THREE.Vector2(0.3, 0.2)]) {
      raycaster.setFromCamera(pointer, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(-1.12 + 0.025));
      const target = raycaster.ray.intersectPlane(plane, new THREE.Vector3())!;
      const sword = new THREE.Group();
      sword.position.copy(target).add(DESKTOP_SWORD_OFFSET);
      sword.lookAt(target);
      sword.rotateY(Math.PI);
      sword.updateMatrixWorld(true);
      const tip = KATANA_TIP.clone().applyMatrix4(sword.matrixWorld);
      sword.position.sub(tip.sub(target));
      sword.updateMatrixWorld(true);
      const projectedTip = KATANA_TIP.clone().applyMatrix4(sword.matrixWorld).project(camera);
      assert.ok(Math.abs(projectedTip.x - pointer.x) < 1e-8);
      assert.ok(Math.abs(projectedTip.y - pointer.y) < 1e-8);
      const actualTip = KATANA_TIP.clone().applyMatrix4(sword.matrixWorld);
      assert.ok(actualTip.distanceTo(target) < 1e-8);
      assert.ok(Math.abs(actualTip.z - (-1.12 + 0.025)) < 1e-8);
    }
  }
});
