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
  (for example KeyH, KeyL, KeyU, KeyI; not J and K, which switch the view) and
  don't start a race, so the game's own cars stay put.
- To measure steering without grass or walls, set `halfWidth = 1e4` and `tires.length = 0` on
  the cached object from `getTrack()`, then reload the page afterwards. The 3D tires stay
  visible (the scene only rebuilds when the arena changes size); only the bouncing is gone.
- The test browser has no graphics card: WebGL runs in software (SwiftShader, check with
  `WEBGL_debug_renderer_info`). The game draws about 5 frames per second there, the old canvas
  version 56, an empty WebGL page 57. Physics runs in fixed steps, so driving tests still work,
  just slowly. Don't judge speed from it; use the fps on the debug line in a normal browser.
- To measure on the real graphics card from WSL, start Chromium yourself with Playwright
  (`playwright-core`) instead of the MCP browser: headless, with
  `--use-angle=gl-egl --enable-gpu --ignore-gpu-blocklist`, and the environment
  `GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib`. Check `WEBGL_debug_renderer_info`:
  it must name the card ("D3D12 (AMD Radeon(TM) 780M)"); "llvmpipe" means software again, which
  is what you get without `GALLIUM_DRIVER`. Count `requestAnimationFrame` calls over 3 s per view
  and per floor, after waiting a few seconds (choosing a floor paints its pictures once). Numbers:
  57 to 60 fps in the driver's seat on every floor (step 18; lava 7.9 until step 19, 59 after);
  60 in 2D and 3D on grass and lava. Split screen (step 21; the page starts with two cars on the
  grid, so the riding views are split): 60 in both riding views on every floor, and at
  `deviceScaleFactor` 1.5 and 2. The first measurement after starting the browser sometimes
  comes out around 50, even on grass.
- The two ways of starting Chromium on the real card don't always agree. `fps-per-view.cjs` also
  passes `--enable-features=Vulkan`; the other scripts don't. With it, shapes drawn on the HUD
  canvas every frame (a filled box and two small dots: the first track map, step 23) cost about
  15 fps in split screen; without it they cost nothing. Copying a prepainted picture with
  `drawImage` costs nothing in either. So measure HUD changes with both, and draw extras from
  pictures painted once. Why remains open: headless Chromium doesn't open `chrome://gpu`.
- Close the Playwright MCP browser before measuring on the real card. With it open (drawing in
  software, plus a test render loop), every view on the real card measured 30 fps; closed, 60
  (step 20). The same goes for any other browser drawing in software, like another session's
  test browser: in step 25 one ran at 740% CPU and every view measured 40 to 44. If all views drop
  alike, look at `ps` before blaming the change.
- The fps scripts step through the views with K, the next-view key (it works before a race). Until
  step 25 they clicked the camera button, which now opens a row instead.
- To look at the scene from any angle (a car from the front, say), catch three.js' renderer and
  scene before the page loads: `page.addInitScript` that sets `window.__THREE_DEVTOOLS__` to an
  `EventTarget` and keeps the `detail` of each `observe` event (the renderer, then the scene).
  Then import three.js from the URL the page loaded, make a `PerspectiveCamera`, and call
  `renderer.render(scene, camera)` in a `requestAnimationFrame` loop started from
  `page.evaluate`: it runs after the game's own frame, so the screenshot shows your camera. Cars
  are the scene's `Group` children. Turn on all layers on your camera (`layers.enableAll()`), or
  it misses the drivers and windshields (layers 1 and 2, step 21).
- To find what a frame spends its time on, take a CPU profile through a CDP session
  (`Profiler.start`, wait, `Profiler.stop`) and add up self time per function. In step 17,
  JavaScript was about 1% and "(program)" the rest: waiting for the software renderer.
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
- Body lean (step 27, `CAR.lean` 6, 3, 8): 6° out of a full-lock turn at full speed, 5.7° once
  steady; nose down 2.9° braking; nose up 5.8° after "LOS!". Simulated: 6.3° drifting, about 3°
  onto the grass, 8° (the most) into a tire. Back to level within about 0.5 s.
- Track width: 16% of the arena height. Tires sit 40 units from the track's edge; a car's
  middle gets about 14 units onto the grass before it touches them.
- The built game is about 157 kB gzipped (607 kB before gzip), almost all of it three.js:
  `index.html` and one JS file. Before three.js (step 17) it was about 12 kB.
- The 3D scene at 1280×800: 348 tires, 696 rings stacked two high, about 118,000 triangles and
  21 draw calls per frame, plus the same again for the shadows. In split screen the scene is drawn
  twice per frame and the shadows once.

## Traps we hit

- three.js draws the shadow picture during the first `render()` of a frame (split screen turns
  automatic updates off and asks for one per frame). Anything hidden with `visible = false` at
  that moment throws no shadow in either half. To leave something out of one camera only, put it
  on its own layer and leave that layer out of the camera; the sun's shadow camera has all layers
  on, and three.js then uses its layers instead of the viewing camera's.

- Floor painters may leave glow or transparency switched on. `paintFloor()` wraps each painter
  in its own `save()`/`restore()`; keep it that way.
- Canvas `shadowBlur` is measured in pixels and ignores `scale()`/`setTransform()`, so on the
  floor picture (2 pixels per world unit) a glow came out half as wide. `glow()` in
  `floors/shapes.ts` converts it.
- three.js 0.187 removed `PCFSoftShadowMap`; asking for it logs a warning and falls back to
  `PCFShadowMap`. Soft edges come from `shadow.radius` (`SCENE.shadowSoftness`).
- three.js light is physical: a surface facing the light shows its own color when the light adds
  up to π. `scene.ts` splits π between the sky (ambient) and the sun, by `SCENE.shadowDarkness`.
- When the floor picture changes size (window resized), the old texture must be `dispose()`d,
  or the graphics card keeps the old size.
- Painting the floor picture again every frame (lava before step 19) cost about 8 fps on the
  adult's card: painting 2.5 million pixels with canvas glow, then sending them to the card.
  Throbbing goes through the glow picture's strength (`emissiveIntensity`) instead.
- The glow picture is painted on black, not on a see-through canvas: WebGL sends canvas pixels to
  the card without multiplying the colors by their see-through amount, so a faint halo pixel
  would arrive at full color. Black around the glow avoids that.
- During a session another project's dev server took over port 5199 after ours stopped, and a
  profile measured the wrong app. Check the page title before measuring.
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
- `gh pr edit` (2.46) stops with a GraphQL error about "Projects (classic)" being deprecated and
  changes nothing. Edit a pull request through the REST API instead:
  `gh api -X PATCH repos/mrpia/arena-race/pulls/<number> -f title=… -F body=@file.md`.
- The Firebase CLI (`firebase-tools`) is installed globally under nvm's Node 22; switching nvm
  to another Node version hides it. Its network calls need the command sandbox off, and
  `firebase login --no-localhost` is interactive: the adult runs it in their own terminal.
- Firebase Hosting gives `index.html` `max-age=3600` unless `firebase.json` says otherwise
  (found in math-quizz, its commit `47fef35`). That's why `/` and `/index.html` are `no-cache`.
- In a worktree (`.claude/worktrees/<name>`) there's no `node_modules`, and none is needed: Node,
  `tsc` and `npx vite` find the main checkout's, a few folders up. Give its dev server a port of
  its own (`npx vite --port 5288 --strictPort`), since another session may hold the usual ones.
- From a worktree, the Playwright MCP still saves screenshots in the main checkout's
  `.playwright-mcp/`, next to other sessions' files. Give yours a prefix and delete only those.
- At about 5 frames per second, the test browser runs the physics in chunks of a dozen steps, so a
  key held for 350 ms steered for about 0.6 s, and a turn timed from the start line ended in the
  tires (step 27). To see how a car looks in a given state, drive a test car instead, then call
  `placeCar()` (from `cars.ts`) on the scene's car with the test car, inside your own render loop
  (see the recipe for looking at the scene from any angle).
