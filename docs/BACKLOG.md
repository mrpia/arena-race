# Backlog

Ideas and known issues not dealt with yet. Each one has a short slug, so notes, commits and
new sessions can name it ("backlog: i18n"). When one gets done, it becomes a step in
[decisions.md](decisions.md) and its entry here is deleted.

## track-map

A small map of the whole track in split screen (step 21), with both cars on it. Each player only
sees their own half: not the whole track, and the other car only when it's close. Raised in
step 21, not asked for yet.

- To decide: where it goes (in the middle over the line between the halves, or one per half) and
  how big. In the middle it covers the inside edge of both halves equally.

## turbo

A speed boost after a drift, with sparks. Discussed in step 6 (brake and drift), not chosen.

## driving-physics

Make the cars drive more like real cars. Added 2026-11-21 by the adult; nothing chosen yet,
and the kids decide. In step 1 they picked a constant speed with no gas pedal because it was
simpler, so first ask what feels wrong, then offer the ideas that fix that.

How driving works today (`Player.update` in `player.ts`):

- One number, `PLAYER_GRIP` (12), does three jobs: how quickly the car gets up to speed, how
  quickly the brake and the grass slow it (full effect in about a quarter of a second), and how
  much it slides sideways. At full lock the car always drives about 15° sideways; drifting,
  about 44°.
- Steering is on or off: 180°/s from the moment the key goes down, at any speed.
- `separate()` only pushes the two cars apart. Their speed doesn't change, so they slide along
  each other instead of bumping.
- Any touch of a tire, even a graze, means 0.3 s of sliding back (`TIRES.bounceTime`), at the end
  of which the car has about 30% of its speed left.

Ideas, smallest first:

- **Lean**: the 3D car body leans out in turns and dips its nose when braking. Only a look:
  driving and records stay the same. Keep the driver's-seat camera level, or the view rocks.
- **Steering ramp**: steering builds up over about 0.15 s and lets go the same way. A tap makes
  a small correction; it can also feel slow to react.
- **Soft grazes**: the bounce lasts longer the harder the car hits, so a graze costs little.
- **Split grip**: forward speed and sideways slide get a number each. Then the car can pick up
  speed slowly after a crash, the grass can slow it gently, and normal turns can slide less,
  all without touching the drift.
- **Car bumps**: the cars bounce off each other, both equally heavy, so it stays fair. Races
  may turn into bumper cars.
- **Grip limit**: at speed the tires only hold so much, and a car that turns too hard slides wide
  by itself. The brake gets a new job (brake before the corner); kids may feel the car "doesn't
  turn".
- **Gas pedal**: the `up` key, unused so far. Step 1 said no. A held gas key adds one key per
  player: up to eight held at once in two-player mode (step 6 counted six), so more keyboard
  ghosting.
- **Floor grip** (ice slippery off the track, and so on): a car's middle only gets about 14 units
  onto the grass before the tires stop it, so it would hardly be felt unless the track itself
  got slippery too.

Side effects of every idea except Lean:

- The corners fit today's turning circles: the tightest ones are about 45 units on the middle
  line, and braking or drifting gets round in about 40 (`dev-notes.md`). Other steering or grip
  can make them impossible or too easy.
- Records are kept per window size, number of laps and track (`records.ts`), not per way of
  driving, so old records stop being fair. Adding a version to the record key starts new ones.
- In step 6, drifting was made about 40% faster than braking through a corner, on purpose.
  Keep that, or let the kids decide it again.
- Not recommended: a fully realistic car (tire slip, weight shifting from wheel to wheel). Lots
  of numbers to tune, and with real steering the turning circle comes from the wheel angle, not
  the speed, so braking alone no longer tightens a turn: that would take away what the brake is
  for.

## computer-opponent

A car the computer drives, so one player has someone to race. In step 7 the kids chose racing
alone against the clock instead.

## lap-times

The time of each lap in two-player mode. One-player mode already has a stopwatch and a record
(step 7).

## player-names

Players type their own names in the game instead of "Player 1" and "Player 2", and the
browser keeps them in `localStorage`. Widened on 2026-11-13 by the adult (it was a config
edit before).

- For the kids to decide: where the name fields go (next to the start buttons?) and what
  shows when a field is empty.
- `input.ts` blocks Space, Enter and the arrows for the whole page, so it has to skip keys
  typed into a name field, or names can't have a space and the cursor can't move.
- Names are kept per browser and origin: the online game and `localhost` keep their own, and
  a shared computer remembers the last players.
- A length limit keeps the HUD readable (see `hud-on-phones`).
- It also replaces the English word "Player" that `i18n` would otherwise translate.

## i18n

Let players pick the game's language: FR, DE, IT or EN. Added 2026-11-12 by the adult.

- Today the texts the kids see are German (in `config.ts`), but some HUD labels are English
  ("Player 1", "steer: …").
- To decide: a language button on the left (next to 2D/3D and the floor), the browser's
  language, or both. The choice could be kept in `localStorage`.
- Cost: every text exists four times, and the kids edit those texts. A type can make a
  missing translation fail `npm run typecheck`.
- Open: who writes the FR and IT texts.
- Precedent: math-quizz has FR/DE/EN dictionaries plus a `translate()` function, no library
  (its `docs/roadmap.md`, item 7).

## touch-controls

Buttons on the screen, so one player can drive on a phone or tablet. Left open in step 11,
which added the keyboard hint instead.

- One-player mode fits a phone; two players on one phone screen would be cramped.
- In two-player mode, touch against keyboard wouldn't be equally strong (see `CLAUDE.md`).

## game-name

"Arena Race" for now, to match the repo and the domain (step 10). The kids may still pick a
name of their own. Whatever it becomes, keep the `localStorage` prefix `arena-starter.record`
in `records.ts`, or the saved best times are lost.

## fair-start

Known issue: in two-player mode the cat starts on the inside of turn 1 (a left-hander), a
small advantage. The suggestion was to swap start places between races.

## resize-mid-race

Known issue: resizing the window during a race moves the track under the cars. They're only
put back on the start line before the start.

## hud-on-phones

Known issue: on a 390 px wide phone the two player names in the HUD overlap. It only matters
once `touch-controls` lets someone play on a phone. The GitHub icon in the middle of the top
line (step 14) runs into the lap counters sooner: below about 643 px with two players and
the default names, earlier with longer names.

## split-buttons

Known issue since step 21: in split screen, the camera and floor buttons on the left lie over
player 1's half, about 36 pixels in from the left edge at mid-height. Player 2's half has nothing
on it. Small, but `CLAUDE.md` asks for both players to be equally strong. Possible fixes: hide the
left column during a two-player race, or move it to the middle line.

## narrow-windows

Known issue, measured in step 15:

- The left column (2D/3D, floor) overlaps the start buttons in windows 790 to 850 px wide,
  where the two buttons still sit side by side, and in windows up to 460 px wide, where they
  stack. Everything can still be clicked; the side buttons lie on top. Keeping the start
  buttons clear of the column (a wider margin) would make them stack sooner.
- On a 390 px phone the open floor row is 484 px long, so the last two floors (Brick
  baseplate, Lava) are off the screen.

## no-webgl

Known issue since step 17: the game needs WebGL 2 (three.js does). Without it, three.js stops
with "Error creating WebGL context", `main.ts` never runs, and the page shows only empty buttons
(tried by hiding WebGL from a test browser). A German message in `config.ts` saying the browser
can't show 3D would be friendlier.

## real-gpu-speed

Measured on the adult's computer (AMD Radeon 780M): in the driver's seat 57 to 60 frames per
second on every floor (step 18; lava since step 19); on grass and lava 60 in 2D and 3D; in split
screen 60 in both riding views on every floor (step 21). Not measured: older
or weaker computers, like school laptops. The debug line (key left of 1) shows frames per
second. If it's slow, things to try (none measured yet): one tire per stack (`TIRES.stack`), a
lower `SCENE.floorSharpness`, a smaller shadow map (`sun.shadow.mapSize` in `scene.ts`), and
turning off antialiasing in `scene.ts`. `SCENE.shadowSoftness` doesn't change the cost: the
shadow is sampled the same number of times whatever the softness.
