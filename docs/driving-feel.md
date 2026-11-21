# Driving feel

Ideas for making the cars feel alive in 3D and drive more like real cars. Backlog entry
`driving-feel`. Added 2026-11-21 by the adult as a general wish; nothing chosen yet, and the kids
decide. In step 1 they picked a constant speed with no gas pedal because it was simpler.

What started it: the car feels very static in the views that ride along with it (🚗 behind the
car, 👀 driver's seat), and you don't see the front wheels turn.

## What the 3D car does today

- `buildCar()` in `cars.ts` makes the car one stiff group, and `placeCar()` moves it and turns it
  round its up axis. Since step 26 the front wheels steer; nothing else on the car moves by itself:
  the wheels don't roll, the body doesn't lean.
- The wheels are plain black cylinders, so even rolling wheels wouldn't show. A lighter hub or a
  stripe on the side would.
- Driver's seat: the front wheels are about 16 units ahead of the camera and 16 to the side. In a
  full 1280×800 window they show in the bottom corners, but each half in split screen (step 21) is
  too narrow and only the nose shows (both seen in the browser in step 26). So in a two-player
  race the steering wheels don't show from the driver's seat, but a leaning body would.
- Behind the car (140 back, 65 high), the front wheels show beside the body, but their turn is hard
  to make out while the camera swings round (step 26).

## How driving works today

In `Player.update` in `player.ts`:

- One number, `PLAYER_GRIP` (12), does three jobs: how quickly the car gets up to speed, how
  quickly the brake and the grass slow it (full effect in about a quarter of a second), and how
  much it slides sideways. At full lock the car always drives about 15° sideways; drifting,
  about 44°.
- Steering is on or off: 180°/s from the moment the key goes down, at any speed.
- `separate()` only pushes the two cars apart. Their speed doesn't change, so they slide along
  each other instead of bumping.
- Any touch of a tire, even a graze, means 0.3 s of sliding back (`TIRES.bounceTime`), at the end
  of which the car has about 30% of its speed left.

## Ideas that only change the look

Driving, the balance between the players and the records all stay the same.

- **Rolling wheels**: they need a mark to show it (see above). At 260 units/s a wheel of radius 7
  turns about 6 times a second, 35° per frame at 60 fps. A hub with more than four spokes can
  then look like it spins backwards.
- **Lean**: the body leans out in turns, dips its nose when braking, maybe shakes on the grass.
  The body, stripe, windshield and helmet need a group of their own above the wheels. The
  driver's-seat camera is placed from the player's position, not from the 3D body
  (`camera.ts`), so it stays level while the nose tilts in front of it. A rocking camera could
  make people queasy.
- **Camera**: the driver's seat turns exactly with the nose (`swing` 0); behind the car the
  camera lags 0.25 s. Both were the adult's choice in step 18. A little swing or tilt into the
  turn would feel less stiff. Step 18 left open whether anyone gets queasy.

## Ideas that change how the car drives

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

Side effects of every idea in this section:

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
