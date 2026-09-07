import { execFileSync } from 'node:child_process';
import { EXAMPLE_WORDS } from '../lib/example-words.ts';
// Run on macOS with the Korean Yuna voice installed. Runtime playback is bundled.
for (const example of Object.values(EXAMPLE_WORDS)) {
  execFileSync('say', ['-v', 'Yuna', '-r', '145', '-o', `/tmp/hangul-${example.file}.aiff`, example.word]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', `/tmp/hangul-${example.file}.aiff`, `public/audio/${example.file}.wav`]);
}
