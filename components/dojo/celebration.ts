import * as THREE from 'three';

const STYLES = [
  'FINGER HEART',
  'OVERHEAD HEART',
  'CHEEK OK',
  'THUMBS UP + BOW',
];

// A canvas-backed mascot works in both eyes in WebXR, without DOM overlays.
export function createCelebration(root: THREE.Group, slot: HTMLElement | null) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  canvas.hidden = true;
  slot?.appendChild(canvas);
  const c = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, 0.92, 0.055);
  sprite.visible = false;
  root.add(sprite);
  let age = 0;
  let active = false;
  let next = 0;
  let style = 0;
  const skin = '#ffd2b1';
  function shape(points: number[][], fill: string) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = '#182339';
    c.lineWidth = 6;
    c.lineJoin = 'round';
    c.stroke();
  }
  function stroke(points: number[][], color: string, width: number) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
  }
  function oval(x: number, y: number, rx: number, ry: number, color: string) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }
  function heart(x: number, y: number, size: number) {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    c.beginPath();
    c.moveTo(0, 0.9);
    c.bezierCurveTo(-1.7, -0.2, -0.7, -1.3, 0, -0.5);
    c.bezierCurveTo(0.7, -1.3, 1.7, -0.2, 0, 0.9);
    c.fillStyle = '#ff8fab';
    c.fill();
    c.restore();
  }
  function arm(points: number[][]) {
    stroke(points, '#172338', 59);
    stroke(points, '#354766', 45);
  }
  function ok(x: number, y: number, flip: number) {
    c.save();
    c.translate(x, y);
    c.scale(flip, 1);
    oval(0, 14, 27, 29, skin);
    stroke(
      [
        [2, 6],
        [0, -55],
      ],
      skin,
      13,
    );
    stroke(
      [
        [15, 8],
        [22, -51],
      ],
      skin,
      13,
    );
    stroke(
      [
        [25, 17],
        [42, -33],
      ],
      skin,
      12,
    );
    c.beginPath();
    c.arc(-15, -7, 18, 0, Math.PI * 2);
    c.strokeStyle = skin;
    c.lineWidth = 13;
    c.stroke();
    c.restore();
  }
  function draw(t: number) {
    c.clearRect(0, 0, 768, 768);
    const bob = Math.sin(t * 4) * 5;
    c.save();
    c.translate(0, bob);
    // Angular, cel-shaded ninja jacket and a loose scarf tail.
    shape(
      [
        [398, 465],
        [507, 477],
        [561, 451 + Math.sin(t * 5) * 9],
        [524, 508],
        [444, 497],
      ],
      '#f16b69',
    );
    shape(
      [
        [315, 455],
        [369, 437],
        [444, 453],
        [481, 522],
        [462, 584],
        [299, 584],
        [281, 519],
      ],
      '#354766',
    );
    shape(
      [
        [383, 462],
        [444, 453],
        [481, 522],
        [462, 584],
        [404, 584],
      ],
      '#23304b',
    );
    stroke(
      [
        [335, 454],
        [402, 539],
        [420, 575],
      ],
      '#d7b578',
      12,
    );
    stroke(
      [
        [430, 455],
        [374, 528],
      ],
      '#f0dec0',
      10,
    );
    stroke(
      [
        [300, 561],
        [468, 561],
      ],
      '#d7b578',
      19,
    );
    if (style === 1) {
      arm([
        [311, 466],
        [239, 366],
        [265, 232],
        [341, 204],
      ]);
      arm([
        [457, 466],
        [529, 366],
        [503, 232],
        [427, 204],
      ]);
      stroke(
        [
          [341, 204],
          [367, 215],
          [384, 239],
        ],
        skin,
        29,
      );
      stroke(
        [
          [427, 204],
          [401, 215],
          [384, 239],
        ],
        skin,
        29,
      );
      heart(384, 190, 28 + Math.sin(t * 5) * 3);
    } else if (style === 2) {
      arm([
        [306, 472],
        [249, 443],
        [265, 388],
      ]);
      arm([
        [462, 472],
        [519, 443],
        [503, 388],
      ]);
    } else {
      arm([
        [307, 476],
        [264, 507],
        [292, 532],
      ]);
      arm([
        [462, 478],
        [520, 463],
        [509, 386],
      ]);
      oval(292, 532, 27, 22, skin);
    }
    // A gentle bow is the fourth celebration's distinctive motion.
    const bow =
      style === 3
        ? Math.sin(Math.min(1, Math.max(0, (t - 0.35) / 1.3)) * Math.PI)
        : 0;
    c.save();
    c.translate(384, 382 + bow * 34);
    c.scale(1, 1 - bow * 0.16);
    // Silver spikes and a tapered face silhouette read clearly at icon size.
    shape(
      [
        [-74, -34],
        [-92, -71],
        [-60, -66],
        [-67, -111],
        [-34, -92],
        [-12, -126],
        [6, -101],
        [42, -124],
        [43, -91],
        [82, -101],
        [69, -64],
        [90, -49],
        [68, -16],
      ],
      '#d8ecf4',
    );
    shape(
      [
        [-64, -55],
        [63, -55],
        [68, 12],
        [44, 48],
        [0, 72],
        [-45, 46],
        [-69, 9],
      ],
      skin,
    );
    shape(
      [
        [40, -49],
        [63, -55],
        [68, 12],
        [44, 48],
        [0, 72],
        [22, 40],
      ],
      '#eaa084',
    );
    // Headband with an original diamond crest.
    shape(
      [
        [-76, -64],
        [70, -64],
        [73, -33],
        [-71, -31],
      ],
      '#182b47',
    );
    shape(
      [
        [-24, -63],
        [24, -63],
        [24, -32],
        [-24, -32],
      ],
      '#b7d7e1',
    );
    shape(
      [
        [0, -58],
        [12, -48],
        [0, -38],
        [-12, -48],
      ],
      '#48d7d1',
    );
    shape(
      [
        [-68, -80],
        [-28, -92],
        [-40, -49],
      ],
      '#f1f9ff',
    );
    shape(
      [
        [31, -94],
        [68, -80],
        [52, -45],
      ],
      '#f1f9ff',
    );
    // A confident anime eye and playful wink, with bright iris highlights.
    shape(
      [
        [-49, -10],
        [-32, -18],
        [-12, -9],
        [-21, 9],
        [-40, 8],
      ],
      '#f5fbff',
    );
    oval(-29, -2, 9, 13, '#30bfc4');
    oval(-28, -1, 4, 9, '#172338');
    oval(-32, -8, 4, 4, '#ffffff');
    stroke(
      [
        [-50, -12],
        [-32, -19],
        [-11, -9],
      ],
      '#172338',
      7,
    );
    if (style === 1) {
      shape(
        [
          [13, -10],
          [32, -18],
          [50, -10],
          [41, 9],
          [23, 9],
        ],
        '#f5fbff',
      );
      oval(31, -1, 9, 13, '#30bfc4');
      oval(32, -1, 4, 9, '#172338');
      oval(28, -8, 4, 4, '#ffffff');
    } else
      stroke(
        [
          [15, 0],
          [31, -9],
          [49, 0],
        ],
        '#172338',
        7,
      );
    stroke(
      [
        [-47, -27],
        [-17, -23],
      ],
      '#172338',
      6,
    );
    stroke(
      [
        [18, -24],
        [45, -30],
      ],
      '#172338',
      6,
    );
    stroke(
      [
        [-12, 32],
        [6, 37],
        [25, 27],
      ],
      '#853f43',
      5,
    );
    stroke(
      [
        [-9, 32],
        [8, 33],
      ],
      '#fff8eb',
      5,
    );
    // Small cheek marks retain the friendly celebration tone.
    stroke(
      [
        [-49, 20],
        [-43, 26],
      ],
      '#e17e82',
      4,
    );
    stroke(
      [
        [-38, 19],
        [-32, 25],
      ],
      '#e17e82',
      4,
    );
    c.restore();
    if (style === 0) {
      // Folded fingers, with thumb crossing the upright index finger.
      oval(508, 390, 30, 35, skin);
      stroke(
        [
          [505, 390],
          [489, 331],
        ],
        '#d79674',
        18,
      );
      stroke(
        [
          [489, 331],
          [500, 366],
        ],
        skin,
        15,
      );
      stroke(
        [
          [485, 387],
          [520, 345],
        ],
        skin,
        19,
      );
      stroke(
        [
          [499, 406],
          [516, 408],
        ],
        '#d79674',
        3,
      );
      heart(506, 301 - Math.sin(t * 4) * 5, 24 + Math.sin(t * 5) * 3);
    } else if (style === 2) {
      ok(265, 361, 1);
      ok(503, 361, -1);
    } else if (style === 3) {
      oval(513, 390, 32, 34, skin);
      stroke(
        [
          [491, 392],
          [480, 367],
          [487, 325],
        ],
        skin,
        21,
      );
      for (let i = 0; i < 3; i++)
        stroke(
          [
            [514, 374 + i * 14],
            [534, 374 + i * 14],
          ],
          '#d79674',
          3,
        );
    }
    c.restore();
    texture.needsUpdate = true;
  }
  return {
    get active() {
      return active;
    },
    play() {
      style = next;
      next = (next + 1) % STYLES.length;
      age = 0;
      active = true;
      canvas.hidden = false;
    },
    reset() {
      active = false;
      sprite.visible = false;
      canvas.hidden = true;
    },
    position(x: number, y: number) {
      sprite.position.set(x, y, 0.055);
    },
    update(dt: number, vr: boolean) {
      const animate = age < 2;
      age = Math.min(2, age + dt);
      const visible = active;
      sprite.visible = visible && vr;
      canvas.hidden = !visible || vr;
      if (!visible) return;
      const enter = Math.min(1, age / 0.2);
      sprite.scale.setScalar(0.33);
      material.opacity = enter;
      canvas.style.opacity = String(material.opacity);
      if (animate) draw(age);
    },
    dispose() {
      canvas.remove();
      root.remove(sprite);
      material.dispose();
      texture.dispose();
    },
  };
}
