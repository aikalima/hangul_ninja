import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
// Bundle Minho's voice variation at the original tempo for consistent narration timing.
mkdirSync('public/audio/minho', { recursive: true });
for (const file of readdirSync('public/audio').filter((name) => name.endsWith('.wav'))) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-i', `public/audio/${file}`, '-af', 'aresample=22050,asetrate=16537.5,aresample=22050,atempo=1.333333',
    '-ac', '1', '-c:a', 'pcm_s16le', `public/audio/minho/${file}`]);
}
