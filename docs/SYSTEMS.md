# learn-chess: systems

Everything is static. The committed files are the published files, and there is no build step.

## Architecture

GitHub Pages serves the repository root. `index.html` is the frame: one module script, the manifest,
the icons and the share card, and no layout of its own — the game is a canvas that fills the viewport.

Behind it sit four parts. **The shell** is one PixiJS application that resolves the route; a screen is
a file, `src/scenes/<name>.js`, so a route that names no file is a route that does not exist. **The
course** is data in `src/data/lessons.js`: stops, drills and the `requires` graph. **The path** derives
every position from that graph — a stop's depth is its x, the painted road is its y, its legs are its
`requires` — so no coordinate table is written down. **The engine** is the rules of chess and the
opponent, pure functions with no DOM.

They share the course, the child's record in `localStorage`, and the offline
copy. The boundary: no server, no API, no third-party request. `vendor/pixi/pixi.min.mjs` is the one
third-party file, pinned and hashed, and `.nojekyll` is load-bearing — without it Pages drops `vendor/`
from the published site.

## Dependencies

Bun to run the checks and the tests. PixiJS, vendored. Stockfish, for the drill check only. GitHub
Pages to serve. Nothing at runtime beyond the browser.

## Failure modes

- A missing `.nojekyll`: Pages drops `vendor/`, and the live game 404s its own library.
- A stale `SHELL` list: offline, the router answers "There is no screen called path".
- A course bug: a stop no route reaches strands the child, and the site check fails the graph.
- A wrong answer: the drill check fails one 30 centipawns behind Stockfish's top move.
- No storage on the device: progress is lost at close, and the game still plays.
