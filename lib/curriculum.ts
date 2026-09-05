import { LEVELS, VOWELS } from './levels.ts';
import type { TracePoint } from './tracing.ts';
export type Character = {
  glyph: string;
  roman: string;
  spoken: string;
  name: string;
  file: string;
  nameFile: string;
  note: string;
  cuts: TracePoint[][];
  directions: string[];
};
const line = (ax: number, ay: number, bx: number, by: number) =>
  Array.from({ length: 21 }, (_, i) => ({
    x: ax + ((bx - ax) * i) / 20,
    y: ay + ((by - ay) * i) / 20,
    z: 0,
  }));
const L = line;
const circle = (x = 0, y = 0, rx = 0.34, ry = 0.4) =>
  Array.from({ length: 4 }, (_, j) =>
    Array.from({ length: 21 }, (_, i) => {
      const a = Math.PI / 2 + ((j + i / 20) * Math.PI) / 2;
      return { x: x + rx * Math.cos(a), y: y + ry * Math.sin(a), z: 0 };
    }),
  );
const transform = (
  cuts: TracePoint[][],
  sx: number,
  sy: number,
  x: number,
  y = 0,
) =>
  cuts.map((c) => c.map((p) => ({ x: p.x * sx + x, y: p.y * sy + y, z: 0 })));
const shapes: Record<string, TracePoint[][]> = Object.fromEntries(
  VOWELS.map((v) => [v.glyph, v.cuts]),
);
Object.assign(shapes, {
  ㄱ: [L(-0.4, 0.4, 0.4, 0.4), L(0.4, 0.4, 0.4, -0.4)],
  ㄴ: [L(-0.4, 0.4, -0.4, -0.4), L(-0.4, -0.4, 0.4, -0.4)],
  ㄷ: [
    L(-0.4, 0.4, 0.4, 0.4),
    L(-0.4, 0.4, -0.4, -0.4),
    L(-0.4, -0.4, 0.4, -0.4),
  ],
  ㄹ: [
    L(-0.4, 0.4, 0.4, 0.4),
    L(0.4, 0.4, 0.4, 0),
    L(0.4, 0, -0.4, 0),
    L(-0.4, 0, -0.4, -0.4),
    L(-0.4, -0.4, 0.4, -0.4),
  ],
  ㅁ: [
    L(-0.4, 0.4, -0.4, -0.4),
    L(-0.4, 0.4, 0.4, 0.4),
    L(0.4, 0.4, 0.4, -0.4),
    L(-0.4, -0.4, 0.4, -0.4),
  ],
  ㅂ: [
    L(-0.35, 0.45, -0.35, -0.4),
    L(0.35, 0.45, 0.35, -0.4),
    L(-0.35, 0.02, 0.35, 0.02),
    L(-0.35, -0.4, 0.35, -0.4),
  ],
  ㅅ: [L(0, 0.45, -0.4, -0.4), L(-0.06, 0.32, 0.4, -0.4)],
  ㅇ: circle(),
  ㅈ: [L(-0.4, 0.4, 0.4, 0.4), L(0.3, 0.4, -0.4, -0.4), L(0, 0.06, 0.4, -0.4)],
  ㅑ: [L(0, 0.45, 0, -0.45), L(0, 0.18, 0.4, 0.18), L(0, -0.18, 0.4, -0.18)],
  ㅕ: [L(-0.4, 0.18, 0, 0.18), L(-0.4, -0.18, 0, -0.18), L(0, 0.45, 0, -0.45)],
  ㅛ: [L(-0.18, 0.4, -0.18, 0), L(0.18, 0.4, 0.18, 0), L(-0.45, 0, 0.45, 0)],
  ㅠ: [L(-0.45, 0, 0.45, 0), L(-0.18, 0, -0.18, -0.4), L(0.18, 0, 0.18, -0.4)],
  ㅋ: [L(-0.4, 0.4, 0.4, 0.4), L(0.4, 0.4, 0.4, -0.4), L(-0.4, 0, 0.4, 0)],
  ㅌ: [
    L(-0.4, 0.4, 0.4, 0.4),
    L(-0.4, 0, 0.4, 0),
    L(-0.4, 0.4, -0.4, -0.4),
    L(-0.4, -0.4, 0.4, -0.4),
  ],
  ㅍ: [
    L(-0.45, 0.35, 0.45, 0.35),
    L(-0.25, 0.35, -0.25, -0.35),
    L(0.25, 0.35, 0.25, -0.35),
    L(-0.45, -0.35, 0.45, -0.35),
  ],
  ㅎ: [
    L(-0.14, 0.48, 0.14, 0.48),
    L(-0.4, 0.25, 0.4, 0.25),
    ...circle(0, -0.18, 0.28, 0.24),
  ],
});
shapes['ㅊ'] = [
  L(-0.13, 0.52, 0.13, 0.52),
  ...transform(shapes['ㅈ'], 1, 0.8, 0, -0.08),
];
for (const [double, base] of [
  ['ㄲ', 'ㄱ'],
  ['ㄸ', 'ㄷ'],
  ['ㅃ', 'ㅂ'],
  ['ㅆ', 'ㅅ'],
  ['ㅉ', 'ㅈ'],
])
  shapes[double] = [
    ...transform(shapes[base], 0.48, 1, -0.25),
    ...transform(shapes[base], 0.48, 1, 0.25),
  ];
for (const [g, base] of [
  ['ㅐ', 'ㅏ'],
  ['ㅔ', 'ㅓ'],
  ['ㅒ', 'ㅑ'],
  ['ㅖ', 'ㅕ'],
])
  shapes[g] = [
    ...transform(shapes[base], 0.65, 1, -0.16).map((c) =>
      (base === 'ㅏ' || base === 'ㅑ') && Math.abs(c[0].y - c[20].y) < 0.01
        ? L(c[0].x, c[0].y, 0.34, c[20].y)
        : c,
    ),
    L(0.34, 0.45, 0.34, -0.45),
  ];
for (const [g, left, right] of [
  ['ㅘ', 'ㅗ', 'ㅏ'],
  ['ㅝ', 'ㅜ', 'ㅓ'],
  ['ㅚ', 'ㅗ', 'ㅣ'],
  ['ㅟ', 'ㅜ', 'ㅣ'],
  ['ㅙ', 'ㅗ', 'ㅐ'],
  ['ㅞ', 'ㅜ', 'ㅔ'],
  ['ㅢ', 'ㅡ', 'ㅣ'],
]) {
  shapes[g] = [
    ...transform(
      shapes[left],
      0.55,
      0.7,
      -0.23,
      left === 'ㅗ' ? -0.2 : left === 'ㅜ' ? 0.18 : 0,
    ),
    ...transform(shapes[right], 0.48, 1, 0.26),
  ];
}
const sounds: Record<string, [string, string, string]> = {
  ㄱ: ['g/k', '그', '기역'],
  ㄴ: ['n', '느', '니은'],
  ㄷ: ['d/t', '드', '디귿'],
  ㄹ: ['r/l', '르', '리을'],
  ㅁ: ['m', '므', '미음'],
  ㅂ: ['b/p', '브', '비읍'],
  ㅅ: ['s', '스', '시옷'],
  ㅇ: ['silent / ng', '응', '이응'],
  ㅈ: ['j', '즈', '지읒'],
  ㅑ: ['ya', '야', '야'],
  ㅕ: ['yeo', '여', '여'],
  ㅛ: ['yo', '요', '요'],
  ㅠ: ['yu', '유', '유'],
  ㅋ: ['k', '크', '키읔'],
  ㅌ: ['t', '트', '티읕'],
  ㅍ: ['p', '프', '피읖'],
  ㅊ: ['ch', '츠', '치읓'],
  ㅎ: ['h', '흐', '히읗'],
  ㄲ: ['kk', '끄', '쌍기역'],
  ㄸ: ['tt', '뜨', '쌍디귿'],
  ㅃ: ['pp', '쁘', '쌍비읍'],
  ㅆ: ['ss', '쓰', '쌍시옷'],
  ㅉ: ['jj', '쯔', '쌍지읒'],
  ㅐ: ['ae', '애', '애'],
  ㅔ: ['e', '에', '에'],
  ㅒ: ['yae', '얘', '얘'],
  ㅖ: ['ye', '예', '예'],
  ㅘ: ['wa', '와', '와'],
  ㅝ: ['wo', '워', '워'],
  ㅚ: ['oe / we', '외', '외'],
  ㅟ: ['wi', '위', '위'],
  ㅙ: ['wae', '왜', '왜'],
  ㅞ: ['we', '웨', '웨'],
  ㅢ: ['ui', '의', '의'],
};
for (const v of VOWELS) sounds[v.glyph] = [v.roman, v.spoken, v.spoken];
export function cutDirection(cut: TracePoint[]) {
  const a = cut[0],
    b = cut[20],
    dx = b.x - a.x,
    dy = b.y - a.y;
  const mid = cut[10];
  if (Math.abs((mid.x - a.x) * dy - (mid.y - a.y) * dx) > 0.012) return '↶';
  if (Math.abs(dx) < 0.01) return dy < 0 ? '↓' : '↑';
  if (Math.abs(dy) < 0.01) return dx > 0 ? '→' : '←';
  return dx > 0 ? (dy < 0 ? '↘' : '↗') : dy < 0 ? '↙' : '↖';
}
const labels: Record<string, string> = {
  '↓': 'Downward cut',
  '↑': 'Upward cut',
  '→': 'Rightward cut',
  '←': 'Leftward cut',
  '↘': 'Down and right',
  '↙': 'Down and left',
  '↗': 'Up and right',
  '↖': 'Up and left',
  '↶': 'Follow the curved arc',
};
export const CURRICULUM: Character[][] = LEVELS.map((level, li) =>
  level.characters.split(' ').map((glyph) => {
    const [roman, spoken, name] = sounds[glyph];
    const code = glyph.codePointAt(0)!.toString(16);
    const vowel = VOWELS.find((v) => v.glyph === glyph);
    return {
      glyph,
      roman,
      spoken,
      name,
      file: vowel ? 'vowel-' + vowel.roman : 'char-' + code,
      nameFile:
        spoken === name
          ? vowel
            ? 'vowel-' + vowel.roman
            : 'char-' + code
          : 'name-' + code,
      cuts: shapes[glyph],
      directions: shapes[glyph].map((c) => labels[cutDirection(c)]),
      note:
        glyph === 'ㅇ'
          ? 'Silent at the start of a syllable; ng at the end. Hear 응 (eung) for the ending sound.'
          : name !== spoken
            ? `Sound is demonstrated in ${spoken}, with a vowel to make the consonant audible.${li === 3 ? ' Release a puff of air.' : li === 4 ? ' Use a firm, tense consonant.' : ''}`
            : glyph === 'ㅢ'
              ? 'Hear 의 (ui). Its pronunciation can vary with position and use.'
              : 'Sound and letter name are the same.',
    };
  }),
);
export function followingLevel(index: number) {
  return index + 1 < CURRICULUM.length ? index + 1 : null;
}
