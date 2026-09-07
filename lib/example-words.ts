export type ExampleWord = { word: string; meaning: string; syllableIndex: number; file: string };

// Highlight a whole written syllable so the Korean word remains correctly composed.
export const EXAMPLE_WORDS: Record<string, ExampleWord> = Object.fromEntries([
  ['ㅏ', '아기', 'baby', 0], ['ㅓ', '어머니', 'mother', 0],
  ['ㅗ', '오이', 'cucumber', 0], ['ㅜ', '우유', 'milk', 0],
  ['ㅡ', '음식', 'food', 0], ['ㅣ', '기차', 'train', 0],
  ['ㄱ', '가방', 'bag', 0], ['ㄴ', '나무', 'tree', 0],
  ['ㄷ', '다리', 'leg / bridge', 0], ['ㄹ', '라디오', 'radio', 0],
  ['ㅁ', '모자', 'hat', 0], ['ㅂ', '바다', 'sea', 0],
  ['ㅅ', '사과', 'apple', 0], ['ㅇ', '우유', 'milk', 0],
  ['ㅈ', '자전거', 'bicycle', 0],
  ['ㅑ', '야구', 'baseball', 0], ['ㅕ', '여자', 'woman', 0],
  ['ㅛ', '요리', 'cooking', 0], ['ㅠ', '유리', 'glass', 0],
  ['ㅋ', '코끼리', 'elephant', 0], ['ㅌ', '토끼', 'rabbit', 0],
  ['ㅍ', '포도', 'grapes', 0], ['ㅊ', '치마', 'skirt', 0],
  ['ㅎ', '하늘', 'sky', 0],
  ['ㄲ', '꼬리', 'tail', 0], ['ㄸ', '딸기', 'strawberry', 0],
  ['ㅃ', '빵', 'bread', 0], ['ㅆ', '쌀', 'rice', 0],
  ['ㅉ', '짜장면', 'black bean noodles', 0],
  ['ㅐ', '개구리', 'frog', 0], ['ㅔ', '게', 'crab', 0],
  ['ㅒ', '얘기', 'story / conversation', 0], ['ㅖ', '예술', 'art', 0],
  ['ㅘ', '사과', 'apple', 1], ['ㅝ', '공원', 'park', 1],
  ['ㅚ', '회사', 'company', 0], ['ㅟ', '가위', 'scissors', 1],
  ['ㅙ', '왜', 'why', 0], ['ㅞ', '웨이터', 'waiter', 0],
  ['ㅢ', '의자', 'chair', 0],
].map(([glyph, word, meaning, syllableIndex], index) => [glyph, {
  word: word as string, meaning: meaning as string,
  syllableIndex: syllableIndex as number, file: `example-${index + 1}`,
}]));

export const EXAMPLE_DISPLAY_MS = 7000;
