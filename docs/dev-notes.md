# Dev notes

How to test a change in the browser, numbers measured in earlier steps, and traps we already
fell into. The rules for working on the game are in [CLAUDE.md](../CLAUDE.md).

## Browser test recipes (Playwright MCP)

- Screenshots can only be saved inside the project folder; the tool puts them in
  `.playwright-mcp/`, which git ignores. Delete it afterwards anyway.
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
- To test like a phone (the keyboard hint), turn on touch emulation through a CDP session
  (`Emulation.setTouchEmulationEnabled`), then reload: `pointer: coarse` matches after that.
  Emulation left on by one run was still on in the next, so close the browser afterwards.
- Clear `localStorage` in the test browser after record tests.
- To test the GitHub link without leaving for github.com, stub it with
  `page.context().route('https://github.com/**', (r) => r.fulfill({ body: 'stub' }))`, then
  read the URL of the tab the click opens (`page.waitForEvent('popup')`).

## Numbers worth knowing

Measured in a 1280×800 browser window (arena 966×652 world units). They scale with the
window: the arena grows with it, the track is given in fractions of the arena, but car speed
is in world units.

- Turning circle at full lock: normal radius 81 at speed 253; braking 40 at 127; drifting 41
  at 179 with the car 44° sideways; drifting and braking 21 at 89.
- Tightest corners on the middle line: hairpin and chicane entry about 45, the top-left corner
  51. At full speed you only get round them on the outside line; brake or drift to follow
  the middle.
- One lap is about 2816 world units, about 11 s flat out. A three-lap race takes 35 s plus
  mistakes.
- Speed on grass: 117, on asphalt 260.
- Track width: 16% of the arena height. Tires sit 40 units from the track's edge; a car's
  middle gets about 14 units onto the grass before it touches them.
- The built game is about 12 kB gzipped: `index.html` and one JS file.

## Traps we hit

- Floor painters may leave glow or transparency switched on. `drawFloor()` wraps each painter
  in its own `save()`/`restore()`; keep it that way.
- The start buttons are clicked with the mouse. Space and Enter are game keys: `input.ts`
  swallows them, and a button that kept focus would be clicked again by them, so it lets go
  of focus after the click.
- Saved records belong to the browser origin, and that includes the port. If another dev
  server already holds port 5173, Vite moves to 5174 and the saved records seem to be gone.
  The online game keeps its own records too.
- Every `position: fixed` element with a `transform` (the left column, the start buttons, the
  GitHub icon) is a layer of its own. A `z-index` on something inside one, like the floor
  row, can't lift it over another layer; put the `z-index` on the outer element.
- Stop a background dev server by its process id (`ss -ltnp | grep 5173`), not with
  `pkill -f vite…`: the pattern also matches the shell running `pkill`, which kills
  itself before the rest of the command runs. The adult may also have their own
  `npm run dev` on 5173; leave that one alone.
- Keyboard ghosting: in two-player mode up to six keys are held at once. The key left of 1
  (§ on Swiss keyboards) shows which keys the game sees.
- A session can't change its working directory to another folder. Start Claude Code in the
  repo folder.
- `gh` 2.46 knows `gh repo edit --visibility public`, but not
  `--accept-visibility-change-consequences`. Check `--help` before suggesting a flag.
- The Firebase CLI (`firebase-tools`) is installed globally under nvm's Node 22; switching nvm
  to another Node version hides it. Its network calls need the command sandbox off, and
  `firebase login --no-localhost` is interactive: the adult runs it in their own terminal.
- Firebase Hosting gives `index.html` `max-age=3600` unless `firebase.json` says otherwise
  (found in math-quizz, its commit `47fef35`). That's why `/` and `/index.html` are `no-cache`.
