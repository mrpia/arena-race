# Backlog

Ideas and known issues not dealt with yet. Each one has a short slug, so notes, commits and
new sessions can name it ("backlog: i18n"). When one gets done, it becomes a step in
[decisions.md](decisions.md) and its entry here is deleted.

## turbo

A speed boost after a drift, with sparks. Discussed in step 6 (brake and drift), not chosen.

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
