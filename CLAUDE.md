# Arena Starter

A top-down race car game for one or two players on one keyboard, built in short sessions
with kids, who decide what the game should do. Keep it fun to change.

Before starting work, read `docs/README.md`: where the game stands, what was decided and why,
how we work and how to check a change.

- Plain TypeScript + Canvas 2D + Vite. No game framework, no other runtime dependencies.
- One feature per request. Keep the game playable after every change.
- Tunable values (speeds, sizes, colors, emojis, keys) go in `src/config.ts`.
- Graphics are emojis or simple canvas shapes unless asked otherwise.
- Game logic works in world units (`ARENA`). Only `camera.ts` (world → screen), `render.ts`
  (players, HUD) and `floors/` know about the screen. Use `project()` for anything drawn on the floor.
- Everything must look right in both camera views (`CAMERAS` in `config.ts`, switched by the 2D/3D
  button). Don't hard-code a tilted look; take view-specific values from `currentCamera()`.
- Each floor has its own painter file in `src/floors/`, listed in `FLOORS` (`config.ts`) and
  `FLOOR_LOOKS` (`floors/index.ts`). Shapes shared by floors live in `floors/shapes.ts`.
- The race track lies on top of every floor: `TRACK` in `config.ts`, turned into a loop in world
  units by `track.ts` and painted by `floors/track.ts` (not a floor, so not in `FLOORS`).
- Keys are `KeyboardEvent.code` values. Keep the two players' controls apart
  (P1 left side of the keyboard, P2 arrows/right side).
- Both players must stay equally strong unless the kids ask for an asymmetric game.
- Run `npm run typecheck` after changes.
- The game is online at arena-race.mrpia.ch: `npm run ship` puts `dist/` on the Firebase Hosting
  site `arena-race` (target `game` in `firebase.json` and `.firebaserc`). Keep the target:
  math-quizz is the default site of the same project, `modern-ally-102412`. Deploying is
  outward-facing, so ask first.
- After each finished step, commit and push to the current branch, one commit per step, and
  update `docs/handover.md` and `docs/decisions.md` in the same commit.
