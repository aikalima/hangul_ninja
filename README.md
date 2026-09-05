# Hangul Ninja

First WebXR prototype: a stationary timber dojo, glowing controller sword trail, and a guided ㄱ (giyeok) lesson. The desktop preview and VR sword use the same ordered stroke recognizer.

## Run locally

Requires Node 22.18+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open the printed localhost URL. Drag from the glowing circle to the right, then down without releasing. Touch is supported. For keyboard input, focus the dojo, hold Space, and use arrow keys; R resets. “Watch the stroke” is a demonstration and does not earn completion. Sound is opt-in.

## Meta Quest Browser

Open the hosted HTTPS URL in Quest Browser (sign in with the owning account for the private preview). Choose Enter VR and grant the browser permission. Localhost on a desktop does not refer to that desktop from the headset, and plain LAN HTTP does not satisfy WebXR's secure-context requirement.

Use either controller: hold its trigger and bring the sword tip to the glowing starting ring, then move right and down. Release to retry. Press trigger after success to repeat. Squeeze the grip to reposition the lesson in front of the current head pose. Exit using the Quest system menu. Stand or sit with a clear arm's-length space; there is no artificial locomotion.

Implementation requests `immersive-vr` with `local-floor`, attaches swords to controller grip spaces, samples the actual blade tip in lesson-local coordinates, and renders guidance inside the XR scene. Head height and facing direction position the guide on entry and recenter. Haptics are optional. Static meshes are merged by material and the trail uses a fixed-size GPU buffer without post-processing.

## Validation

```sh
npm test
npm run typecheck
npm run build
npx oxlint app components/dojo lib/tracing.ts tests
```

The seven recognizer tests cover completion, reverse direction, release/retry, teleports, guide depth, frame gaps/noise, diagonal shortcuts, and replay. The full scaffold lint command also scans generated, unused shadcn components; those have upstream lint findings.

Physical Quest testing is still required for controller orientation/reach, session entry and exit, recentering, and sustained frame rate. Desktop rendering cannot certify headset comfort or device performance. Progress is per session, without saved accounts or scores.

WebXR references: [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html) and [MDN session security](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security).
