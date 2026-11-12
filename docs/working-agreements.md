# Working agreements

## With the kids

- The kids decide what the game does. Before building, explain the plan in a few lines. For
  real design choices, offer 2 to 4 concrete options (how each feels, pros, cons) and let them
  pick. Small things get a sensible default, and you say which one you took.
- Say out loud what a wish takes for granted, and its side effects, before building. Examples
  from earlier steps: "hopping would get you over the tire wall", "a bigger window means a
  longer lap, so records aren't comparable".
- One feature per step, and the game stays playable after every step.
- Answer in the language the adult writes in (German, French and English have all happened).
  Code, comments, commit messages and these docs are in English. Texts the kids see in the
  game are German and live in `config.ts`.
- End each step with a short summary: what changed, what was checked and what wasn't, and
  which values in `config.ts` to tweak if it doesn't feel right.

## Git

- After each finished step (typecheck clean, checked in the browser), commit and push to the
  current branch, one commit per step, with an English message. Merges, pull requests,
  force-pushes and repo visibility changes need asking first.
- The repo is public: no secrets and no personal details in commits or docs.
- Update [handover.md](handover.md) and [decisions.md](decisions.md) in the same commit.

## Checking a change

1. `npm run typecheck`.
2. Look at it in the browser, in both camera views (the 2D/3D button). If drawing changed,
   also try a floor with glow (lava or arcade).
3. Measure behavior with a test car instead of guessing. The recipes below are how earlier
   steps did it.

### Browser test recipes (Playwright MCP)

- Screenshots can only be saved inside the project folder; the tool puts them in
  `.playwright-mcp/`. Delete that folder afterwards: it isn't in `.gitignore`.
- To use game modules from inside the page, import the exact URL the game loaded. After an
  edit, Vite serves changed modules with a `?t=` timestamp, so `import('/src/config.ts')` can
  return a second, fresh copy with default values:

  ```js
  const urls = performance.getEntriesByType('resource').map((e) => e.name);
  const find = (f) => urls.filter((u) => u.includes('/src/' + f)).pop();
  const race = await import(find('race.ts'));
  ```

- To end a race at once, set `RACE.laps = 0` on the loaded config module: the next step
  finishes the race (both cars at once gives a dead heat). Set it back before the next race.
  Records are stored per number of laps, so read the record while `laps` is still 0.
- To drive a test car, hold keys with `page.keyboard.down(...)`, then call
  `player.update(1 / 60)` in a loop inside `page.evaluate`. Give the test car its own keys
  (for example KeyH, KeyL, KeyK, KeyJ) and don't start a race, so the game's own cars stay put.
- To measure steering without grass or walls, set `halfWidth = 1e4` and `tires.length = 0` on
  the cached object from `getTrack()`, then reload the page afterwards.
- Leak test for the tire walls: on a 4-unit grid, mark every spot a car's middle can reach
  (inside the arena, at least car radius plus tire radius from every tire). Cut the track at
  16 places with short lines across it. For every pair of cuts, flood-fill from between them.
  If the fill reaches the stretch on the other side, there's a way around, which means a
  shortcut. Two traps from the first attempt: cutting by "nearest track point" leaves holes
  in corners tighter than half the track width, so cut with real lines; and when the far
  stretch is short, shrink the safety margin, or the range flips round and covers almost the
  whole track.
- Clear `localStorage` in the test browser after record tests.

## Traps we hit

- Floor painters may leave glow or transparency switched on. `drawFloor()` wraps each painter
  in its own `save()`/`restore()`; keep it that way.
- A session can't change its working directory to another folder. Start Claude Code in the
  repo folder.
- `gh` 2.46 knows `gh repo edit --visibility public`, but not
  `--accept-visibility-change-consequences`. Check `--help` before suggesting a flag.
- Keyboard ghosting: in two-player mode up to six keys are held at once. The key left of 1
  (§ on Swiss keyboards) shows which keys the game sees.
- Saved records belong to the browser origin, and that includes the dev server's port.
