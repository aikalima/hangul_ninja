export const VOICE_LINES = {
  intro: { id: 'intro', file: 'giyeok', ko: '기역.', en: 'Giyeok — ㄱ.' },
  success: {
    id: 'success',
    file: 'giyeok',
    ko: '기역.',
    en: 'Giyeok — ㄱ.',
  },
  soundIntro: {
    id: 'sound-intro',
    file: 'geu',
    ko: '그.',
    en: 'ㄱ sound in 그 (geu).',
  },
  soundSuccess: {
    id: 'sound-success',
    file: 'geu',
    ko: '그.',
    en: 'ㄱ sound in 그 (geu).',
  },
  praisePolite: {
    id: 'praise-polite',
    file: 'praise-polite',
    ko: '잘했어요!',
    en: 'Well done!',
  },
  praiseCasual: {
    id: 'praise-casual',
    file: 'praise-casual',
    ko: '잘했어!',
    en: 'Nice job!',
  },
  praiseAwesome: {
    id: 'praise-awesome',
    file: 'praise-awesome',
    ko: '대박!',
    en: 'Awesome!',
  },
  praiseKeepGoing: {
    id: 'praise-keep-going',
    file: 'praise-keep-going',
    ko: '화이팅!',
    en: 'You’ve got this!',
  },
  praiseBest: {
    id: 'praise-best',
    file: 'praise-best',
    ko: '최고!',
    en: 'You’re the best!',
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

export type PronunciationMode = 'sound' | 'name';
export function pronunciationLine(
  mode: PronunciationMode,
  cue: 'intro' | 'success',
): VoiceLine {
  return mode === 'name'
    ? VOICE_LINES[cue]
    : cue === 'intro'
      ? VOICE_LINES.soundIntro
      : VOICE_LINES.soundSuccess;
}

export function encouragementFor(completions: number): VoiceLine | null {
  if (completions < 1 || completions % 3 !== 0) return null;
  const lines = [
    VOICE_LINES.praisePolite,
    VOICE_LINES.praiseCasual,
    VOICE_LINES.praiseAwesome,
    VOICE_LINES.praiseKeepGoing,
    VOICE_LINES.praiseBest,
  ];
  return lines[(completions / 3 - 1) % lines.length];
}

export const MASTER_WELCOME: VoiceLine = {
  id: 'welcome',
  file: '',
  ko: '검을 들어라. 빛나는 획을 따라라. 수련을 시작하자!',
  en: 'Take up your katana. Follow the glowing strokes. Your training begins.',
};
