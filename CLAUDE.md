# Arena Race

A top-down race car game for one or two players on one keyboard, built in short sessions
with kids, who decide what the game should do. Keep it fun to change.

`README.md` is the overview: controls, files, what to tweak, deploying. In `docs/`:

- `decisions.md`: every step so far, what the kids chose and why. If something in the code
  looks odd, check here first: it may be on purpose.
- `BACKLOG.md`: ideas and known issues not dealt with yet, each under a short slug.
- `dev-notes.md`: how to test in the browser, numbers measured so far, traps we fell into.

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

- Plain TypeScript + Canvas 2D + Vite. No game framework, no other runtime dependencies.
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

## Checking a change

1. `npm run typecheck`.
2. Look at it in the browser, in both camera views (the 2D/3D button). If drawing changed,
   also try a floor with glow (lava or arcade).
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
