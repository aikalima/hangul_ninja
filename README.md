## Timed review checkpoints

After completing a level’s practice, a shuffled review is required before the level is marked complete. The pool contains every character in the current and immediately previous level, without duplicates. Only Level 1 is playable today, so its review uses its six vowels. The generic pool builder is tested for later-level combinations; later tracing lessons remain upcoming.

A three-second preparation countdown precedes the first character. Each character gets three seconds by default (configurable from 1–10 before the round). Successful characters advance automatically after a 750ms transition. Every item must be completed before its deadline; a miss ends the attempt, and retry reshuffles the entire pool. Backgrounding or leaving VR interrupts the attempt. Timers use wall-clock deadlines, and completion is checked against the deadline, including between render frames. Review state and passes are session-local. Level 2 remains unavailable until its lesson is implemented.

# Hangul Ninja · Level 1

The playable curriculum now begins with six basic vowels: ㅏ a, ㅓ eo, ㅗ o, ㅜ u, ㅡ eu, ㅣ i. A level introduction precedes practice; each completed lesson character advances automatically after three seconds, and the sixth ends on a persistent Level 1 completion state. Replay returns to ㅏ. Progress is session-local.

The six-level roadmap follows the requested order: Basic vowels, Basic consonants, Y vowels, Aspirated consonants, Tense consonants, Compound vowels. Only Level 1 is currently playable; the others are explicitly marked coming soon. The original ㄱ recognition module remains covered by tests for later consonant-level work.

Each vowel is described by ordered independent cuts. The recognizer validates direction, swept coverage, depth and tracking continuity, preserves completed cuts during release, and never draws a connector between separate strokes. The guide, demonstration, pronunciation, feedback and controller progression use the active vowel. Vowels use the same spoken name and sound, so no name/sound selector is shown in Level 1. Music starts off; only the katana is rendered for the player. All six Korean audio clips are bundled locally.

Romanization reference: [National Institute of Korean Language](https://www.korean.go.kr/front_eng/roman/roman_01.do).

## Prototype implementation notes (earlier iterations)

# Hangul Ninja

WebXR prototype v0.6: a stationary timber dojo, glowing controller sword trail, and a guided ㄱ (giyeok) lesson. The desktop preview and VR sword share ordered stroke recognition. Flow cuts is the only practice mode: a rightward slash, then a downward cut.

## Run locally

Requires Node 22.18+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open the printed localhost URL. In Flow cuts, drag through the horizontal guide from left to right, then cut down through the vertical guide. Release between landed cuts to recover; partial cuts restart on release. Touch is supported. For keyboard input, focus the dojo, hold Space, and use arrow keys; R resets. “Watch the stroke” is a demonstration and does not earn completion. The first practice interaction unlocks audio. Separate music/effects toggles and a master volume slider are below the dojo.

## Meta Quest Browser

Open the hosted HTTPS URL in Quest Browser (sign in with the owning account for the private preview). Choose Enter VR and grant the browser permission. Localhost on a desktop does not refer to that desktop from the headset, and plain LAN HTTP does not satisfy WebXR's secure-context requirement.

Use either controller: hold its trigger and sweep the sword tip right through the horizontal guide, then cut down. Flow mode uses swept collisions with a 14 cm path tolerance and 45 cm depth allowance; it preserves the first landed slash while you release and recover. Press trigger after success to repeat. Squeeze the grip to reposition the lesson in front of the current head pose. Exit using the Quest system menu. Stand or sit with a clear arm's-length space; there is no artificial locomotion.

Implementation requests `immersive-vr` with `local-floor`, attaches swords to controller grip spaces, samples the actual blade tip in lesson-local coordinates, and renders guidance inside the XR scene. Head height and facing direction position the guide on entry and recenter. Haptics are optional. Static meshes are merged by material and the trail uses a fixed-size GPU buffer without post-processing.

## Validation

```sh
npm test
npm run typecheck
npm run build
npx oxlint app components/dojo lib/tracing.ts tests
```

Fourteen tests cover flow cuts (order, arcs, recovery, stale poses, teleports, depth, and shortcuts) plus mocked audio lifecycle, independent mute buses, volume bounds, swish throttling, and visibility pause. These audio tests validate scheduling, not audible quality. The full scaffold lint command also scans generated, unused shadcn components; those have upstream lint findings.

Physical Quest testing is still required for controller orientation/reach, session entry and exit, recentering, and sustained frame rate. Desktop rendering cannot certify headset comfort or device performance. Progress is per session, without saved accounts or scores.

WebXR references: [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html) and [MDN session security](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security).

## Sound and reaction design

The soundtrack is an original Web Audio composition: a pentatonic plucked melody at 88 BPM, low drum pulses, and filtered wind. No music files, external streaming services, or copyrighted recordings are used. The soundtrack adds percussion as progress builds. HRTF-positioned swishes respond to sword-tip speed; cuts and completion have distinct musical impacts. One AudioContext is created on interaction, hidden sessions suspend it, and disposal closes it.

Pooled sparks, drifting motes, split targets, lantern flicker, speed-responsive trails, and a completion ring make the scene react without moving or shaking the VR camera. Geometry remains bounded; device performance and listening quality still need a Quest playtest.

## Reference-inspired room

The dojo is now a complete 9.4 × 11 m timber room inspired by the supplied illustration: paired cylindrical columns and pegged crossbeam, upper lattice windows, thick framed shoji panels, ceiling boards, individually bound woven training mats, benches, practice-sword racks, scrolls, landscape panels, and a wooden training dummy. The reference is interpreted as full 3D geometry, not a background image.

Seeded canvas textures provide timber grain, knots, woven fibers, and paper variation, with roughness and subtle bump mapping. Directional daylight casts window and structure shadows using a single static 2048px shadow map; environment geometry is merged by material and shadow behavior. Textures and the shadow map are released on scene cleanup. Physical Quest performance and the new lighting still need device validation.

## Katana-only view

Desktop and Quest display only the katana. In Quest, the weapon is attached directly to each controller grip pose. Arms, hands, clothing, and their selection controls have been removed.

## Korean master voice

Bundled PCM WAV voice clips pronounce the active character at the start and after full completion. Every third completion adds a rotating Korean encouragement. Three stern Korean corrections rotate after failed gestures, with a 4.5-second cooldown. Valid recovery between landed flow cuts, tiny clicks, tracking loss, and visibility changes do not trigger scolding. English/Korean captions render in both the sidebar and XR scene. Use Hear ㄱ to replay pronunciation, Master to mute narration, and Volume for the master level. Music ducks while a voice clip plays.

Clips were synthesized locally with the installed Korean Yuna voice. No browser Korean voice installation or runtime speech service is required. Playback starts on a practice interaction, consistent with browser autoplay restrictions; a blocked or failed playback shows a replay hint. Voice playback pauses on hidden sessions and is cleaned up on disposal. Tests validate cue decisions and WAV assets; listening quality and immersive playback still need Quest validation.

## Katana refinement

The weapon is a curved, tapered katana with a diamond-section blade, subtle temper line, oval iron guard, brass fittings, and diamond-pattern handle wrap. Shared blade-tip landmarks drive both scoring and the 6 cm tip-only trail. Desktop placement compensates for the curve, keeping the actual rendered tip on the pointer's tracing position.

Precise mode has been removed from the UI, engine, recognition code, and instructions. All practice uses the two-cut flow lesson.
