# Backlog

Ideas and known issues not dealt with yet. Each one has a short slug, so notes, commits and
new sessions can name it ("backlog: i18n"). When one gets done, it becomes a step in
[decisions.md](decisions.md) and its entry here is deleted.

## turbo

A speed boost after a drift, with sparks. Discussed in step 6 (brake and drift), not chosen.

## driving-feel

The cars feel static in the views that ride along with them, and they could drive more like
real cars. Since steps 26 and 27 the front wheels steer and the body leans. Added 2026-11-21 by the adult as a general wish;
nothing chosen yet. The ideas, how driving works today and the side effects are in
[driving-feel.md](driving-feel.md).

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

- For the kids to decide: where the name fields go (next to the START button and its rows?) and what
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
- To decide: a language row under START (next to the view and the floor), the browser's
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

## narrow-windows

Known issue, measured in steps 15, 29 and 30:

- Since step 30 START and its three rows (players, view, floor) stand alone in the middle. They fit
  every window measured from 1280×800 down to 320×568, but not a phone held sideways: at 568×320
  the floor row is off the bottom of the screen (the view row already was by 3 px in step 29).
- On a 390 px phone the floor row wraps onto two lines (7 and 3 floors).
- With the keyboard hint (phones and tablets), START and its rows sit 45 px lower; at 390×844 the
  floor row still ends 112 px above the bottom.

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
