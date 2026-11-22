# Arena Race

A race car game for one or two players on one keyboard, seen from above or riding along with
the car, built in short sessions with kids, who decide what the game should do. Keep it fun
to change.

`README.md` is the overview: controls, files, what to tweak, deploying. In `docs/`:

- `decisions.md`: every step so far, what the kids chose and why. If something in the code
  looks odd, check here first: it may be on purpose.
- `BACKLOG.md`: ideas and known issues not dealt with yet, each under a short slug.
- `dev-notes.md`: how to test in the browser, numbers measured so far, traps we fell into.
- `driving-feel.md`: ideas for livelier cars in 3D and more car-like driving (backlog: driving-feel).

## Working with the kids

- The kids decide what the game does. Before building, explain the plan in a few lines. For
  real design choices, offer 2 to 4 concrete options (how each feels, pros, cons) and let them
  pick. Small things get a sensible default, and you say which one you took.
- Say out loud what a wish takes for granted, and its side effects, before building. Examples
  from earlier steps: "hopping would get you over the tire wall", "a bigger window means a
  longer lap, so records aren't comparable".
- One feature per step, and the game stays playable after every step.
- Answer in the language the adult writes in (German, French and English have all happened).
  Code, comments, commit messages and docs are in English. Texts the kids see in the game are
  German and live in `config.ts`.
- End each step with a short summary: what changed, what was checked and what wasn't, and
  which values in `config.ts` to tweak if it doesn't feel right.

## Code

- TypeScript + three.js (the 3D scene) + Canvas 2D (the HUD, the floor pictures) + Vite. No game
  framework. three.js is the only runtime dependency (step 17); ask before adding another.
- Tunable values (speeds, sizes, colors, emojis, keys) go in `src/config.ts`.
- Graphics are emojis, simple canvas shapes or simple 3D shapes (boxes, cylinders, rings) unless
  asked otherwise.
- Game logic works in world units (`ARENA`). Only `camera.ts` (the cameras), `scene.ts` and
  `cars.ts` (the 3D scene) and `hud.ts` (text on top) know about the screen or three.js. In the
  scene, a spot (x, y) on the floor is (x, 0, y) and height is the scene's y axis.
- Everything must look right in every camera view (`CAMERAS` in `config.ts`, picked in the view row
  under START, or with J and K): the two that show the whole arena and the two that ride along
  with the car. Don't hard-code a view; take view-specific values from `currentCamera()`.
- Each floor has its own painter file in `src/floors/`, listed in `FLOORS` (`config.ts`) and
  `FLOOR_LOOKS` (`floors/index.ts`). Painters draw in world units into a picture that `scene.ts`
  lays on the floor, once. Shapes shared by floors live in `floors/shapes.ts`; use its `glow()`
  rather than `shadowBlur`. Parts that throb go in a separate `glow` painter (see lava): never
  paint a floor again every frame, it dropped the game to 8 fps (step 19).
- The race track lies on top of every floor: `TRACK` in `config.ts`, turned into a loop in world
  units by `track.ts` and painted by `floors/track.ts` (not a floor, so not in `FLOORS`).
- Keys are `KeyboardEvent.code` values. Keep the two players' controls apart
  (P1 left side of the keyboard, P2 arrows/right side).
- Both players must stay equally strong unless the kids ask for an asymmetric game.

## Checking a change

1. `npm run typecheck`.
2. Look at it in the browser, in every camera view (the view row under START, or J and K). If
   drawing changed, also try a floor with glow (lava or arcade). The test browser draws 3D in
   software, at a few frames per second: judge speed on the real graphics card instead (recipe in
   `dev-notes.md`).
3. Measure behavior with a test car instead of guessing: the recipes are in `docs/dev-notes.md`.

## Git and deploying

- After each finished step (typecheck clean, checked in the browser), commit and push to the
  current branch: one commit per step, with an English message. In the same commit, add the
  step to `docs/decisions.md`, and update `README.md`, `docs/BACKLOG.md` and
  `docs/dev-notes.md` wherever what they say has changed.
- Merges, pull requests, force-pushes and repo visibility changes need asking first.
- The repo is public: no secrets and no personal details in commits or docs.
- The game is online at arena-race.mrpia.ch: `npm run ship` puts `dist/` on the Firebase Hosting
  site `arena-race` (target `game` in `firebase.json` and `.firebaserc`). Keep the target:
  math-quizz is the default site of the same project, `modern-ally-102412`. Deploying is
  outward-facing, so ask first.
