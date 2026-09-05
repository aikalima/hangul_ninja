import { CURRICULUM } from './curriculum.ts';

export const PROGRESS_COOKIE = 'hangul-ninja-progress';
export type SavedProgress = {
  version: 1;
  levelIndex: number;
  characterIndex: number;
  completedCuts: number;
};

export function parseProgress(cookie: string): SavedProgress | null {
  try {
    const value = cookie.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${PROGRESS_COOKIE}=`));
    if (!value) return null;
    const saved = JSON.parse(decodeURIComponent(value.slice(PROGRESS_COOKIE.length + 1)));
    if (!saved || saved.version !== 1 ||
      !Number.isInteger(saved.levelIndex) || !Number.isInteger(saved.characterIndex) ||
      !Number.isInteger(saved.completedCuts)) return null;
    const character = CURRICULUM[saved.levelIndex]?.[saved.characterIndex];
    if (!character || saved.completedCuts < 0 || saved.completedCuts > character.cuts.length) return null;
    return {
      version: 1,
      levelIndex: saved.levelIndex,
      characterIndex: saved.characterIndex,
      completedCuts: saved.completedCuts,
    };
  } catch {
    return null;
  }
}

export function progressCheckpoint(levelIndex: number, characterIndex: number, completedCuts: number): SavedProgress {
  if (completedCuts === CURRICULUM[levelIndex][characterIndex].cuts.length &&
    characterIndex < CURRICULUM[levelIndex].length - 1) {
    characterIndex++;
    completedCuts = 0;
  }
  return { version: 1, levelIndex, characterIndex, completedCuts };
}

export function readProgress(): SavedProgress | null {
  try { return parseProgress(document.cookie); } catch { return null; }
}

export function writeProgress(progress: SavedProgress) {
  try {
    document.cookie = `${PROGRESS_COOKIE}=${encodeURIComponent(JSON.stringify(progress))}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    // Practice still works when the browser blocks cookies.
  }
}
