# Decision log

What the kids asked for, what was chosen and why, oldest first. Everything here happened on
2026-11-12. Steps 1 to 7 were built on the `team-orange` branch of `mrpia/arena-starter`,
which then became this repo (step 8).

## 1. A top-down car race (commit `12c864a`, together with step 2)

**Asked:** turn the arena game into a top-down car race with laps. Four kids were there.

- Two cars, and the kids take turns. Four cars at once was rejected: the keyboard gets
  crowded, and many laptop keyboards drop keys when lots are held.
- Steering like a real car (left and right turn the car) but at a constant speed, with no gas
  or brake: the kids found that simpler. Known downside: when the car drives down the screen,
  left and right feel swapped.
- The car is drawn from above in the player's color, with the animal emoji as the driver. The
  🏎️ emoji was rejected because it's drawn from the side: turned to face up, it lies on its side.
- The game starts in the 2D view.

## 2. F1-style track, grass slows you down (commit `12c864a`)

**Asked:** grass should slow the cars down. Partway through, the kids added: "like a Formula 1
track, with tight corners".

- The track is a smooth curve (centripetal Catmull-Rom) through `TRACK.points`, given as
  fractions of the arena. Kids can design their own track by moving points; points close
  together make a tight corner. A first version, a ring with rounded corners, was dropped
  because it had no tight corners.
- Layout: start/finish straight at the bottom, driven left to right (so the lap runs
  anticlockwise on screen), a fast turn 1, a hairpin top right, a chicane, tight corners top
  left.
- Width is 16% of the arena height, so the shape stays the same at every window size. At 20%
  the track looked like a blob and the two sides of the hairpin almost touched.
- Off the track the cars drive at 45% speed. What counts is the spot under the car's middle.
- The track is painted on top of every floor, and a new grass floor is the default.
- Asphalt is drawn as strips between neighboring points plus circles on each point: clean
  edges, and no holes where strips fold over in tight bends. Kerbs only appear on sharp bends,
  and single stray kerb stripes are dropped.
- Fixed along the way: the lava and arcade painters left glow and transparency switched on,
  which tinted the track. Each floor painter now gets its own `save()`/`restore()`.

## 3. Start button and countdown (commit `fe7c5d9`)

**Asked:** a countdown "3, 2, 1, los" (go), and a start button to press first.

- A big on-screen button, clicked with the mouse. Space and Enter are game keys, and the game
  swallows them so the page doesn't scroll.
- The cars can't move before LOS!, so pressing early gives no advantage.
- Clicking start puts the cars back on the start line. That also covers a window resized
  before the start.

## 4. Tire walls (commit `778b104`)

**Asked:** walls of old tires that you bounce off, so nobody can take a shortcut across the
grass. The reason the kids gave: fairness.

- Tires are placed automatically from the track's shape, around everything within reach of
  the track (asphalt plus a strip of grass). Where two far-apart parts of the track come
  close, a row goes on the line between them. The two sides of the hairpin had only about
  40 units of grass between them; cutting across there would have skipped about a fifth of
  a lap. Placing tires by hand was rejected: the one gap you forget is the one a kid finds.
- Bouncing reflects the car's speed (factor 0.8), then the car slides back for 0.3 s before
  driving again. A car always drives at full speed, so without the slide it would drive
  straight back into the wall and you'd barely see a bounce.
- Hopping cars bounce too (a hop flew about 150 units, enough to jump the hairpin).
- The grass strip was raised from 28 to 40 units during the build, without being asked. With
  28, a car (radius 24) touched the tires (radius 9) before its middle was on the grass, which
  would have cancelled "grass slows".
- Checked with a leak test (see dev-notes.md): no way past the walls at window sizes
  1024×600, 1280×800, 1366×768 and 1920×1080.

## 5. Three laps and a lap counter (commit `8c3bda8`)

**Asked:** three laps to win (the first plan said four), and show each player's laps.

- Laps are counted through four stretches of track that must be driven in order. Driving
  backwards takes stretches away, so going back and forth over the line, or a lap backwards,
  earns nothing.
- "Runde 2/3" (lap 2 of 3) next to each name, then "🏁 Ziel!" (finish). The race ends when the first car finishes.
  That was a proposal nobody objected to.
- If both cars finish in the same 1/60 s step it's "Unentschieden!" (a draw). Otherwise player 1 would
  win every dead heat just by being first in the list.
- New texts are in German, in `RACE` in `config.ts`.

## 6. Brake and drift (commit `27e2b7c`)

**Asked:** a brake, because some corners are too tight, linked with drifting. Four proposals
were discussed. The kids picked brake on S/↓ and drift on Space/Enter in place of hopping,
with skid marks on the asphalt while drifting.

- Brake: half speed while held. Turning radius is speed divided by turn rate, so half speed
  means a turn twice as tight.
- Drift: while held, grip drops from 12 to 4 and the nose turns at 250°/s instead of 180°/s.
  The car slides about 44° sideways and gets round as tightly as when braking, but about 40%
  faster, and it's harder to control. On purpose: drifting pays off for those who master it.
- Skid marks come from the back wheels, only while drifting on asphalt. They fade after 8 s
  and are cleared for each new race.
- Hopping was removed completely: height, shadow, jumping over the other car.
- Discussed but not chosen: a turbo after a drift, with sparks.
- Up to six keys can now be held at once. Checking the keyboard with the § key first is
  recommended.

## 7. One or two players (commit `9ef4a00`)

**Asked:** two buttons at the start, "Start 1 Spieler" and "Start 2 Spieler" (1 player,
2 players).

- One player races against the clock. The kids picked that over a computer-driven opponent.
  The cat drives alone from the middle of the start line, steered by either side's keys.
- Stopwatch and record on the right of the top bar. At the finish the time is shown big, with
  "🏆 Neuer Rekord!" (new record) when it beats the record.
- The record is kept in `localStorage`, one per window size, number of laps and track shape
  (a hash of `TRACK.points`). The track grows with the window, so a bigger window means a
  longer lap, and records from different sizes can't be compared.
- After every race both start buttons come back. They replace the earlier "Nochmal" (again) button.

## 8. A repository of its own

The `team-orange` branch of `mrpia/arena-starter` was pushed as `master` of
`mrpia/arena-race`, which is public. `arena-starter` keeps its `team-orange` branch.

Later the same day `team-orange` was deleted from `arena-starter`, which now has only
`master`. Nothing was lost: every commit of the race game, including the ones named in this
log, is on `master` here.

## 9. Online at arena-race.mrpia.ch

**Asked (by the adult, not the kids):** build the game and put it online at
https://arena-race.mrpia.ch, the same way math-quizz is at https://math-quizz.mrpia.ch.

- Firebase Hosting, like math-quizz: one login and one console for both. The game is a static
  bundle (about 12 kB gzipped), so no server is needed.
- A second Hosting site, `arena-race`, in math-quizz's Firebase project `modern-ally-102412`,
  rather than a project of its own. The free Hosting quota is per project, so the two share it.
- `firebase.json` deploys to a deploy target, `game`, that `.firebaserc` maps to the site
  `arena-race`. Firebase recommends targets for projects with several sites. Here they also
  keep a deploy away from math-quizz, which is the project's default site.
- Cache headers copied from math-quizz: `assets/**` immutable, `/` and `/index.html`
  `no-cache`. math-quizz's service worker and manifest were not copied: this game isn't a PWA.
  Neither was math-quizz's rewrite of every path to `index.html`: this game has no routes.
- Deploys are manual with `npm run ship`, as for math-quizz. No deploy on push.
- Not done in this step: renaming "Arena Starter" (page title, `package.json`), and a hint
  for visitors on phones or tablets, who can open the page but can't drive.

## 10. Called "Arena Race", for now

**Asked (by the adult):** stop calling the game "Arena Starter".

- "Arena Race", to match the repo and the domain. The kids may still choose a name of their own.
- Changed: the page title (the browser tab, bookmarks and link previews), the README and
  CLAUDE.md headings, and the name in `package.json` and `package-lock.json`.
- Not changed: the `localStorage` prefix `arena-starter.record` in `records.ts`. A new prefix
  would lose every saved best time.

## 11. A keyboard hint on phones and tablets

**Asked (by the adult):** a hint for visitors on phones or tablets, who can open the online
game but can't drive.

- A line above the start buttons: "⌨️ Zum Fahren brauchst du eine Tastatur." (you need a
  keyboard to drive). It's in `RACE.keyboardHint`, so the kids can reword it.
- It shows where the main pointer is a finger (the CSS media feature `pointer: coarse`), so
  computers with a mouse or trackpad never see it. A tablet with a keyboard sees it until the
  first key press; then it's gone until the page is reloaded.
- It sits inside the start buttons' box, so it comes and goes with them.
- The start buttons still work on phones: someone with a Bluetooth keyboard can play.
- Not chosen yet: touch controls that would let one player drive on a phone. That's a game
  feature, for the kids to decide.

## 12. Idea files left to arena-starter

**Asked (by the adult):** remove `IDEAS.md` and `IDEEN.md` here, keep them in arena-starter.

- They described the original arena starter, hopping included, which step 6 removed, so they
  misled more than they helped. They were unchanged since the first commit and are identical
  to the copies on arena-starter's `master`.
- The README now points to `docs/BACKLOG.md` for ideas for this game, and to arena-starter's
  copies for general ones.

## 13. Fewer docs files

**Asked (by the adult):** fewer files in `docs/`; a committed handover file seemed unneeded.

- `handover.md` repeated the README, this log and git, and its "state after step N" line had
  to be edited every step. Dropped. What only it had moved: the measured numbers and the
  Firebase CLI notes to `dev-notes.md`, the known issues to `BACKLOG.md` (`fair-start`,
  `resize-mid-race`, `hud-on-phones`, `game-name`), the DNS setup to the README.
- The rules for working with the kids, git and checking a change moved from
  `working-agreements.md` into `CLAUDE.md`, which every session loads by itself. Before, a
  session only saw them by following a chain of links. The rest of that file (test recipes,
  traps) is now `dev-notes.md`.
- `docs/README.md` only listed the other files; `CLAUDE.md` does that now. Dropped.
- Left in `docs/`: this log, `BACKLOG.md` and `dev-notes.md`.

## 14. A GitHub icon at the top

**Asked (by the adult):** a GitHub icon in the top row that links to the repo, so players
can report bugs, suggest features, or copy the code. The kids might want to look at the code
they helped make.

- The top line is the HUD (names, laps, keys); the buttons are a column on the left. Two
  places were offered: the middle of the top line, or under the floor button. The adult
  picked the top line. The icon leaves the game, so it stays apart from the buttons that
  change it.
- Same white rounded square as the 2D/3D and floor buttons, with the GitHub mark inside. There
  is no GitHub emoji, so the mark is an inline SVG copied from `@primer/octicons` 19.15.1
  (`mark-github-16.svg`, MIT).
- It opens in a new tab, so a race in progress isn't lost. After a click it lets go of
  focus, like the buttons. Enter, player 2's drift key, can't open it anyway: `input.ts`
  blocks the key's default action.
- The URL and the German tooltip ("Der Code des Spiels auf GitHub") are in `GITHUB` in
  `config.ts`.
- Reading and downloading the code needs no account. Opening an issue or forking does, and
  GitHub accounts are for people aged 13 and up (GitHub Terms of Service, "Account Terms"),
  so the kids' issues go through an adult.
- Anyone playing the online game can now reach the repo and open issues.
- Side effect: below about 643 px window width (two players, default names) the icon
  overlaps the lap counters. Noted under `hud-on-phones` in the backlog.

## 15. Every floor can be picked before the race

**Asked (by the adult):** fix a bug found while testing step 14. With the start buttons on
screen, the open floor row ran under "Start 1 Spieler", and in a 1280×800 window the button
caught the clicks meant for five of the ten floors (Frozen lake to Lava). They could only be
picked during a race.

- The left column (`#side-controls`) now has `z-index: 1`, so it and its floor row lie on
  top of the start buttons. Giving the row a `z-index` alone wouldn't work: the column's
  `transform` makes it a layer of its own, and the start buttons, later in the page, cover
  that whole layer.
- While the row is open it covers part of "Start 1 Spieler". It closes after a pick or a
  click anywhere else, as before.
- Not chosen: wrapping the row into two lines or opening it as a column. Both change how the
  picker looks, and two lines would still reach the start button at 1280 px.
- Where the side buttons and the start buttons overlap (narrow windows), the side buttons are
  now on top; before, the start button hid most of them. The overlap itself is still there:
  see `narrow-windows` in the backlog.

## 16. No changelog: this log is the history

**Asked (by the adult):** should the repo get a `CHANGELOG.md`?

- No. This file already has every change with its reason. A changelog would repeat it and
  add one more file to update in every step, the kind of overlap step 13 removed.
- A changelog lists changes by release, and there are none: no git tags, no GitHub releases,
  `package.json` still at `0.1.0`. When to introduce versions and releases is the adult's
  call, so there are no deploy tags either for now.
- Instead the README now links to this file near the top, so visitors who come through the
  GitHub icon (step 14) find the history.
- Known gap: nothing records which commit is online. Deploys stay manual (`npm run ship`).
