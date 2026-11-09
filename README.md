# learn-chess

A beginner's chess course for children, as a small game: ten stops that open as a child walks the
path — eight lessons and two boss games, with three optional detour packs beside them — where the puzzles
are played on a board rather than answered on paper, and Pip the pawn says what he thinks of the move
just played. It is a static site with no build step and no dependency: the committed files are the
published files.

**What it deliberately is not.** The older version had a free-play tab and a daily-puzzle tab. Both are
gone and neither is coming back — an unfinished game to wander into and a puzzle picked from the date
taught less than one more lesson on the path. [`docs/adrs/001-the-course-replaces-v1.md`](docs/adrs/001-the-course-replaces-v1.md) says what else was dropped
and why; the puzzles that live *inside* a lesson are part of the lesson and stayed.

**Where the old course went.** The browser app this replaces is frozen at the `v1` tag, and `main` is
the game that took its place. What crossed over, and what was dropped for good, is
[`docs/adrs/001-the-course-replaces-v1.md`](docs/adrs/001-the-course-replaces-v1.md); the tagged tree
is still there to compare against:

```sh
git checkout v1                    # the whole old tree, frozen
git show v1:js/lessons.js          # the course the old app taught, for comparison
```

The live game is <https://aivara-se.github.io/learn-chess/>.

## Run it locally

```sh
python3 -m http.server 8000        # any static server; this one needs nothing installed
open http://localhost:8000/
```

It is served rather than opened, because a module loaded over `file://` is refused by the browser and
the service worker needs an origin. Nothing else is needed: no install, no build, no checkout step.

A route is a screen, and the file name is the route. `#/path` is the map the game opens on,
`#/lesson/1` is the first lesson, and two screens are there for whoever is changing the game rather
than playing it: `#/kit` (and `#/kit/phone`, `#/kit/desktop`) draws every component and `measure()`s
it, and `#/board-fixture/start` (also `fork`, `mate`, `promotion`, `empty`) draws one board position.
[`docs/SYSTEMS.md`](docs/SYSTEMS.md) is how the tree is served and how a change to it is verified;
[`docs/DESIGN.md`](docs/DESIGN.md) is every colour, size and shape the game draws with, and what was
measured to fix it.

## Checks

```sh
bun test                           # the rules: the engine, the board's geometry, the drill loop, the graph
bun run scripts/verify-shell.ts    # the tree as served: one module, the offline list, the vendor hash
bun run scripts/verify-site.ts     # the course: every position legal, the path walkable, the art record
bun run scripts/verify-drills.ts   # every puzzle's answer, measured against Stockfish
```

The first three need nothing but Bun. The fourth needs Stockfish — `$STOCKFISH`, or
`/usr/games/stockfish` — and it is the only one that asks a question a legal-move check cannot: whether
an answer is *good*. All four run in `.github/workflows/validate.yml` on every pull request, in the job
named `validate`, beside a `docs` job that checks the documents against the organisation's standard.

What they cannot see — what a frame looks like, whether a board is legible, whether the game opens with
the network off — is a browser pass against a served copy of the branch, never `file://`, at 360×640
and 1280×800: the canvas is the viewport and the page does not scroll sideways; the game opens on the
path, one stop open, with the painting at a cover fit; `#/lesson/1` is walked to its completion panel, a
star per first-try solve; under `prefers-reduced-motion: reduce` the arrow over the current stop does
not bob; zero console errors; and with the browser's own HTTP cache cleared, a reload with the network
off still opens the game. The screenshots are looked at rather than only the exit code.

A merge to `main` publishes the site: `.github/workflows/publish.yml` uploads the repository root and
deploys it to GitHub Pages.

**Licence.** The code is MIT ([`LICENSE`](LICENSE)). The art is CC0, the engine is this project's own,
and the one third-party file is PixiJS — vendored with its licence and its provenance in
[`vendor/README.md`](vendor/README.md). Every asset's terms, and where it came from, are in
[`ATTRIBUTION.md`](ATTRIBUTION.md) and in the record `assets/manifest.json` keeps of it.
