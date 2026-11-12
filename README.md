# Arena Starter

A starting point for a two-player, same-keyboard game: two race cars driving
around a rectangular arena, seen from above.

```bash
npm install
npm run dev        # opens http://localhost:5173
```

| | Steer | Brake | Drift |
|---|---|---|---|
| Player 1 | A D | S | Space |
| Player 2 | ← → | ↓ | Enter |

Click 🏁 Start in the middle of the screen. After the countdown (3, 2, 1, LOS!) the cars
drive off; before that they can't move. `COUNTDOWN` in `config.ts` sets the texts and times.
The first car to drive 3 laps wins (`RACE.laps`); the lap each player is on shows next to
their name. A lap only counts if you drove the whole way round, not back and forth over
the line. Then 🔁 Nochmal starts a new race.

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

Out of ideas? See [IDEAS.md](IDEAS.md) for themes, twists and example prompts ([IDEEN.md](IDEEN.md) in German).

## Where things are

- `src/config.ts` – players, emojis, colors, speed, keys, camera views, floors. Start here.
- `src/race.ts` – how far the race has got (start button, countdown, racing, finished), counting laps and picking the winner.
- `src/player.ts` – driving, steering, braking, drifting, bouncing off tires, bumping into each other.
- `src/skidmarks.ts` – the skid marks drifting cars leave behind.
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

`npm run build` type-checks and writes a static site to `dist/`, which you can open
from any web server or zip up and share.
