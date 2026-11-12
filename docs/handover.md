# Handover: where the game stands

State after commit `9ef4a00` (one or two players), 2026-11-12.

## What the game is

A top-down race car game on one keyboard. Two cars (🐱 red, 🐶 blue) race 3 laps on an
F1-style track, or one player races the cat alone against the clock. Both camera views work
(2D straight down, 3D tilted), and so do all floors: the track lies on top of whichever floor
is picked. Grass is the default floor.

| | Steer | Brake | Drift |
|---|---|---|---|
| 🐱 Player 1 | A D | S | Space |
| 🐶 Player 2 | ← → | ↓ | Enter |

The texts the kids see in the game are German; their English meaning is given in brackets
below. In one-player mode both key sets steer the cat. W and ↑ aren't used. The start buttons are
clicked with the mouse: Space and Enter are game keys, and `input.ts` swallows them.

## How a race goes

1. **Waiting:** two buttons, "Start 1 Spieler" and "Start 2 Spieler" (1 player, 2 players). The cars stand at the
   start line.
2. **Countdown:** clicking a button puts the cars on their start spots, clears skid marks and
   shows 3, 2, 1, LOS! (go!). The cars can't drive, steer, brake or drift before LOS!.
3. **Racing:** laps are counted in `race.ts`. A lap only counts after driving through four
   stretches of track in order, so back and forth over the line earns nothing. The lap each
   player is on shows next to the name ("Runde 2/3": lap 2 of 3).
4. **Finished:** two players: the first car to finish 3 laps wins ("🐱 Player 1 gewinnt!": player 1 wins);
   both in the same 1/60 s step is "Unentschieden!" (a draw). One player: the time pops up, with
   "🏆 Neuer Rekord!" (new record) if it beats the record. The cars stop and both start buttons come back.

## Where things live

The main [README](../README.md) lists every file. The ones added for the race:

- `src/track.ts`: the smooth loop through `TRACK.points`, `onTrack()`, start spots,
  `lapPosition()`, and where the tire walls go (`buildTires`). World units only.
- `src/floors/track.ts`: paints asphalt, edge lines, kerbs, tires and the start/finish line.
- `src/race.ts`: phases (waiting, countdown, racing, finished), countdown, laps, winner,
  race time, one-player result.
- `src/records.ts`: the one-player best time in `localStorage`.
- `src/skidmarks.ts`: skid marks left while drifting.
- `src/player.ts`: driving, braking, drifting, bouncing off tires. `PlayerOptions` lets one
  car use several key sets (one-player mode).

All tunable values are in `src/config.ts`: `PLAYER_SPEED`, `OFF_TRACK_SPEED`, `BRAKE_SPEED`,
`TURN_SPEED`, `PLAYER_GRIP`, `DRIFT`, `SKID_MARKS`, `CAR`, `RACE` (laps and all race texts),
`COUNTDOWN`, `TRACK`, `TIRES`, `GRASS`, `PLAYERS`.

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

## Open items and ideas (nothing decided)

- The HUD mixes English ("Player 1", "steer: …") and German ("Runde", "LOS!"). Translating it
  was offered. The kids could also put their own names into `PLAYERS`.
- The project is still called "Arena Starter" in the README title, `package.json` and the
  page `<title>`. If it's renamed, keep the `localStorage` key prefix `arena-starter.record`
  in `records.ts`, or the saved best times are lost.
- `IDEAS.md` and `IDEEN.md` still describe the original arena starter (hopping and so on).
- The cat starts on the inside of turn 1 (a left-hander), a small advantage. The suggestion
  was to swap seats between races.
- Resizing the window during a race moves the track under the cars; they're only put back on
  the start line before the start.
- Mentioned but not chosen yet: a turbo after drifting, a computer-driven opponent for
  one-player mode, lap times in two-player mode.
- `.playwright-mcp/` (screenshots from browser tests) isn't in `.gitignore`.

## Running it

```bash
npm install
npm run dev        # Vite, opens http://localhost:5173
npm run typecheck
```

Records are saved per browser origin, which includes the port. If another dev server already
holds port 5173, Vite moves to 5174 and the saved records seem to be gone.
