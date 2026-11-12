# Arena Race

A top-down race car game for one or two players on one keyboard: a cat and a dog race
three laps round a track, or the cat races alone against the clock.

Play it at https://arena-race.mrpia.ch (you need a keyboard).

It grew out of [arena-starter](https://github.com/mrpia/arena-starter), a starting point for
two-player browser games on one keyboard (TypeScript, Canvas 2D and Vite, no game framework).

```bash
npm install
npm run dev        # opens http://localhost:5173
```

| | Steer | Brake | Drift |
|---|---|---|---|
| Player 1 | A D | S | Space |
| Player 2 | ← → | ↓ | Enter |

Click **Start 1 Spieler** or **Start 2 Spieler** in the middle of the screen. After the
countdown (3, 2, 1, LOS!) the cars drive off; before that they can't move. `COUNTDOWN` in
`config.ts` sets the texts and times. The lap each player is on shows next to their name.
A lap only counts if you drove the whole way round, not back and forth over the line.
After the race the two start buttons come back. On phones and tablets a line above them says
you need a keyboard (`RACE.keyboardHint`); it goes away at the first key press.

- **2 Spieler:** the first car to drive 3 laps wins (`RACE.laps`).
- **1 Spieler:** the cat races alone against the clock, steered by either side's keys. The
  best time is kept in the browser. The track grows with the window, so a bigger window
  means a longer lap: each window size, number of laps and track shape has its own record.

The cars always drive at the same speed (`PLAYER_SPEED` in `config.ts`); left and right
turn them. Hold brake to drive at half speed (`BRAKE_SPEED`): half as fast makes the turn
twice as tight. Hold drift while steering and the tires lose grip: the car slides sideways
through the corner, about as tight as braking but faster, and leaves skid marks on the
asphalt (`DRIFT`, `SKID_MARKS`). Up isn't used yet.

The race track runs through the points in `TRACK.points` in `config.ts`, given as
fractions of the arena. Move them to build your own track: points close together
make a tight corner. Off the track the cars drive at `OFF_TRACK_SPEED`.

Walls of old tires (`TIRES` in `config.ts`) run around the whole track, with a strip of
grass in between. They're placed automatically from the track's shape, also between two
parts of the track that come close, so there's no shortcut across the grass. Drive into
them and you bounce back.

Press the key left of `1` (`§` on Swiss keyboards, `` ` `` on US ones) to show which
keys are held. Use it to check that your keyboard registers both players at once
(up to six keys: steer, brake and drift for each): many laptop keyboards drop keys when
several are held.

Out of ideas? Ideas for this game are in [docs/BACKLOG.md](docs/BACKLOG.md). Themes, twists and
example prompts for two-player games in general are in arena-starter's
[IDEAS.md](https://github.com/mrpia/arena-starter/blob/master/IDEAS.md)
([IDEEN.md](https://github.com/mrpia/arena-starter/blob/master/IDEEN.md) in German).

## Where things are

- `src/config.ts` – players, emojis, colors, speed, keys, camera views, floors. Start here.
- `src/race.ts` – how far the race has got (start button, countdown, racing, finished), counting laps and picking the winner.
- `src/player.ts` – driving, steering, braking, drifting, bouncing off tires, bumping into each other.
- `src/skidmarks.ts` – the skid marks drifting cars leave behind.
- `src/records.ts` – the best one-player time, kept in the browser.
- `src/track.ts` – the race track's shape: a smooth loop through `TRACK.points`, whether a spot is on the asphalt, and where the tire walls go.
- `src/camera.ts` – the 2D and 3D views, fitted to the window. `project()` turns world positions into screen positions.
- `src/render.ts` – the cars and the HUD.
- `src/floors/` – one file per floor, `track.ts` that paints the race track on top of every floor, and `index.ts` with the list of floors.
- `src/input.ts` – keyboard state: `isDown()` for holding, `wasPressed()` for single taps.
- `src/main.ts` – canvas setup, the controls on the left and the game loop.

Click the 2D/3D button on the left while playing to switch between looking straight
down (2D) and a tilted camera (3D). `CAMERA` in `config.ts` sets the view the game
starts in, and `CAMERAS` how each view looks.

The arena fills the window: a bigger window gives the players more room. Change
`PIXELS_PER_UNIT` in `config.ts` to zoom in or out.

`npm run build` type-checks and writes the static site to `dist/`. Its files are linked as
`/assets/…`, so it has to be served from the root of a web server; `npm run preview` does
that locally. To share the game, send the link at the top.

## Putting it online

The game is a static site on Firebase Hosting, at https://arena-race.mrpia.ch (also
https://arena-race.web.app). It has its own Hosting site, `arena-race`, inside the Firebase
project `modern-ally-102412`, which it shares with math-quizz.

```bash
npm i -g firebase-tools          # once per machine
firebase login --no-localhost    # once per machine
npm run ship                     # builds, then deploys dist/ to the arena-race site
```

`firebase.json` deploys to the target `game`, and `.firebaserc` maps that target to the site
`arena-race`. Keep it that way: math-quizz lives on the project's default site, and a config
without a target could end up there.

Files in `assets/` have a content hash in their name and are cached for a year. `index.html`
is sent with `no-cache`, so the browser asks again on every load and a new deploy shows up
at once. Without it, Firebase Hosting lets browsers keep `index.html` for an hour, and an old
copy can point at a bundle that's no longer there.

Records are saved per browser origin, so the online game keeps its own best times, separate
from the ones on `localhost`.

DNS for `mrpia.ch` is at Infomaniak: `arena-race` is a CNAME to `arena-race.web.app`, as the
Firebase console asked (Hosting → `arena-race` → custom domains). The certificate is
managed by Google and renews by itself.
