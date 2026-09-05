export const VOICE_LINES = {
  intro: { id: 'intro', file: 'giyeok', ko: '기역.', en: 'Giyeok — ㄱ.' },
  success: {
    id: 'success',
    file: 'success',
    ko: '잘했다. 기역!',
    en: 'Well done. Giyeok!',
  },
  focus: {
    id: 'focus',
    file: 'focus',
    ko: '집중해라! 처음부터 다시!',
    en: 'Focus! Again, from the start!',
  },
  sword: {
    id: 'sword',
    file: 'sword',
    ko: '그게 검술이냐? 선을 따라라!',
    en: 'You call that swordsmanship? Follow the line!',
  },
  order: {
    id: 'order',
    file: 'order',
    ko: '순서가 틀렸다! 오른쪽, 그다음 아래로!',
    en: 'Wrong order! Right, then down!',
  },
} as const;
export type VoiceLine = { id: string; file: string; ko: string; en: string };
export function isFailedGesture(start: number, end: number, distance: number) {
  if (distance < 0.18 || end === 41) return false;
  return start < 21 ? end < 21 : end < 41;
}
