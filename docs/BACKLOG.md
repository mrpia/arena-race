# Backlog

Ideas not built yet, oldest first. Each one has a short slug, so notes, commits and new
sessions can name it ("backlog: i18n"). When an idea gets built, it becomes a step in
[decisions.md](decisions.md) and its entry here is deleted.

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
