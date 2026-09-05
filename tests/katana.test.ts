import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createKatana,
  KATANA_TIP,
  KATANA_TRAIL_INNER,
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
