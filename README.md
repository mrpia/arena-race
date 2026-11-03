# Arena Starter

A starting point for a two-player, same-keyboard game: two characters moving
around a rectangular arena, seen from above with a slight tilt.

```bash
npm install
npm run dev        # opens http://localhost:5173
```

| | Move | Action |
|---|---|---|
| Player 1 | W A S D | Space |
| Player 2 | Arrow keys | Enter |

The action key makes the player hop for now. It's the hook for whatever the game
becomes: shooting, dashing, grabbing.

Press the key left of `1` (`§` on Swiss keyboards, `` ` `` on US ones) to show which
keys are held. Use it to check that your keyboard registers both players at once:
many laptop keyboards drop keys when several are held.

Out of ideas? See [IDEAS.md](IDEAS.md) for themes, twists and example prompts ([IDEEN.md](IDEEN.md) in German).

## Where things are

- `src/config.ts` – players, emojis, colors, speed, keys, camera views, floors. Start here.
- `src/player.ts` – movement, hop, bumping into each other.
- `src/camera.ts` – the 2D and 3D views, fitted to the window. `project()` turns world positions into screen positions.
- `src/render.ts` – characters and HUD.
- `src/floors/` – one file per floor, plus `index.ts` with the list of floors.
- `src/input.ts` – keyboard state: `isDown()` for holding, `wasPressed()` for single taps.
- `src/main.ts` – canvas setup, the controls on the left and the game loop.

Click the 2D/3D button on the left while playing to switch between looking straight
down (2D) and a tilted camera (3D). `CAMERA` in `config.ts` sets the view the game
starts in, and `CAMERAS` how each view looks.

The arena fills the window: a bigger window gives the players more room. Change
`PIXELS_PER_UNIT` in `config.ts` to zoom in or out.

`npm run build` type-checks and writes a static site to `dist/`, which you can open
from any web server or zip up and share.
