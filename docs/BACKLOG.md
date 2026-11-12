# Backlog

Ideas not built yet, oldest first. Each one has a short slug, so notes, commits and new
sessions can name it ("backlog: i18n"). When an idea gets built, it becomes a step in
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

The kids' own names instead of "Player 1" and "Player 2": the `name` of each entry in `PLAYERS`
(`config.ts`). It's only a config change, and it also replaces the English word "Player" that
`i18n` would otherwise have to translate.

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
