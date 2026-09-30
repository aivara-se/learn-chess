# SYSTEM.md — how this game is served

Everything is static. The repository *is* the game: the committed files are the published files, and
there is no build step between them.

| | |
|---|---|
| Host | GitHub Pages (`aivara-se/learn-chess`) |
| Source | branch `main`, folder `/` (root) |
| Build | none — no bundler, no transpiler, no lockfile |
| TLS | GitHub-managed certificate |
| Backend | none — no server, no database, no API, no analytics |
| Storage | the visitor's `localStorage`, for their progress only |
| Offline | `sw.js`: the shell, precached; the content, precached from `assets/manifest.json` |
| Installing | `manifest.webmanifest`; the icons it names are `assets/**` and are in the tree |
| Share card | `assets/share-card.png`, 1200×630, named in the page's `og:image` |
| DNS | the domain owner (Cloudflare), only if a subdomain is pointed at it |

## 1. The shape of the tree

- **`index.html`** is the frame: one module script (`src/main.js`), the manifest, the icons and the
  share card. It carries no layout of its own — the game is a canvas that fills the viewport.
- **`src/main.js`** boots one Pixi `Application`, keeps the viewport and the device-pixel-ratio cap,
  and resolves the route.
- **`vendor/pixi/pixi.min.mjs`** is the one third-party file, pinned and hashed, with its licence
  beside it and its provenance in `vendor/README.md`. It is in the repository, not on a CDN: the app
  promises no third-party request, and a CDN is a second thing that has to be up for it to work
  offline.
- **`src/scenes/<name>.js`** is a screen. **The shell cannot be added to without a file:** the route
  `#/lesson/1` imports `./scenes/lesson.js`, so a new screen is a new file and nothing else. There is
  deliberately no `scenes/index.js`.
- **`src/engine/engine.js`** is the rules of chess, ported unchanged from `v1` (`js/engine.js`), tests
  included; `tests/engine.test.ts` is the perft and legality suite behind it.
- **`scripts/verify-shell.ts`** is the shell's own machine check; **`scripts/verify-site.ts`** checks
  the course's data, its graph and its copy budgets, and **`scripts/verify-drills.ts`** measures every
  puzzle's answer against Stockfish. All four checks — those three and `bun test` — run in `Checks` on
  every pull request.

A screen module default-exports any of `mount(context)`, `resize(context)`, `unmount(context)`, and
`context` is `{ app, layer, params, width, height }` with the size in CSS pixels and always current.
The rules a screen is built to — the tap floor, the board's `--board-room` and its 240px minimum,
`prefers-reduced-motion`, nothing signalled by colour alone, every square naming itself — are in
`docs/PORT.md` and in the design document the chrome card writes.

**The page names the mark and the icons, and they are here.** The favicon, the two
rendered icons, the maskable icon and the apple-touch-icon are `assets/**` and landed
with the assets card; the addresses in `index.html` are the old app's own, so the
requests resolve with no change to the page. `scripts/verify-shell.ts` reports a file
the page or the manifest names and the tree does not hold as a `todo` rather than a
failure — that is for work in flight, and nothing is in flight behind these today.

## 2. `.nojekyll` is load-bearing

GitHub Pages runs Jekyll on a branch unless a `.nojekyll` file exists at the root, and **Jekyll does
not publish a folder called `vendor/`** — nor files starting with `_`, `.` or `#`. Without the file,
the one directory the app cannot do without is dropped from the published site: the local copy runs
and the live one 404s its own library, with nothing in the console but a module-load failure. The
file is empty and its existence is the whole of its content; `scripts/verify-shell.ts` fails the tree
when it is missing.

## 3. The verification story

Four layers. Each answers a question the one below it cannot, and the last one is
not optional — the port's own history is the argument for it.

**1. `bun test` — the rules, and only the rules.** The engine is pure functions: no
PixiJS, no DOM, no storage, so it needs no browser. `tests/engine.test.ts` is the
move generator, legality and perft `v1` passed and the port kept. `tests/board.test.ts`
holds the square geometry and the tap arithmetic, `tests/lesson.test.ts` the drill
loop's answers and the coach's six bands at their own boundaries, `tests/path.test.ts`
the unlock rules and the drawn state of a stop, `tests/map.test.ts` every stop's row
against the terrain band its region names. Green says the arithmetic is right. It
says nothing about what a child sees.

**2. `bun run scripts/verify-shell.ts` — the tree as a served site.** The page names
one module and nothing off this origin; the manifest is this site's; the offline
worker's list is the first frame's closure and names the screen the game opens on
(§4); its cache name is free and above the floor the wipe left; the vendored library
is the version and the hash `vendor/README.md` records; `.nojekyll` is in place, so
Pages publishes `vendor/`.

**3. `bun run scripts/verify-site.ts` and `bun run scripts/verify-drills.ts` — the
course.** The site check: every position's FEN legal and every accepted answer a
legal move, the copy inside its budgets, the `requires` graph walkable with no circle,
no unreachable stop and no stop named that does not exist, every total *derived*
rather than written down, and the art record — every file under `assets/` at the
bytes and `sha256` `assets/manifest.json` records, the map's own art inside its
budget. The drill check then measures every answer against Stockfish (MultiPV 6,
depth 18, one thread, a fresh process per position) and fails one more than 30
centipawns behind the engine's top move, and a mate that is not a mate.

All four run in `Checks` on every pull request (`.github/workflows/checks.yml`), and
none of them needs anything but Bun and Stockfish.

**4. a real render, and a pair of eyes.** This is the layer no script in this tree
can be, and the reason is a property of the tree rather than an oversight: there is
no build step, no dependency and no browser in CI, and the first `package.json` is
the first step away from all three. So the browser check is a harness run against a
served copy of the branch — served over HTTP, never `file://`, which refuses the
module and gives the worker no origin — and against the live URL, at **360×640**
(a phone at DPR 3) and **1280×800** (a laptop at DPR 2):

- the canvas is the viewport, and its buffer is the CSS size times `min(dpr, 2)` —
  the cap, not the raw ratio; the page does not scroll sideways; nothing but the
  game is on screen;
- **the path**: the game opens on it, and `window.learnChessPath` reports the map's
  twelve stops and three packs with one open and none done, three terrain bands and
  their markers drawn;
- **a lesson end to end**: `#/lesson/1` is walked from its first paragraph to its
  completion panel — every puzzle solved on the first try, a star for each, the
  coach's verdict read off the bubble while it is drawn, and the star count the
  completion panel shows equal to the lesson's own puzzle count;
- **`prefers-reduced-motion: reduce`**: the arrow over the current stop does not bob
  (`learnChessPath.art().arrow.animates` is `false` and its `y` does not move over
  700ms), where the same field is `true` without the media query;
- **zero console errors**, and **offline**: with the browser's own HTTP cache
  cleared, a reload with the network off still opens the game. That one is the check
  `sw.js`'s list exists for, and it is the check that failed while the list still
  named the placeholder screen (§4);
- **and the screenshots are looked at.** Automated checks do not prove a board is
  legible, a caption is not hidden behind the next stop's marker, or that a frame
  looks like a game. The images belong in the pull request, beside the numbers.

```bash
# the four machine checks, from the repository root
bun test
bun run scripts/verify-shell.ts
bun run scripts/verify-site.ts
bun run scripts/verify-drills.ts          # needs Stockfish; $STOCKFISH or /usr/games/stockfish
```

```bash
# Pages enabled and pointed where you expect
gh api repos/aivara-se/learn-chess/pages --jq '{url: .html_url, cname: .cname, https: .https_enforced}'

# last build: 'built' is the success value (~30s-2min after a push)
gh api repos/aivara-se/learn-chess/pages/builds/latest --jq '{status, error, duration, created_at}'

# it serves, and it serves this game — the library line is the one .nojekyll is about
curl -sI  https://aivara-se.github.io/learn-chess/ | head -1
curl -s   https://aivara-se.github.io/learn-chess/ | grep -o '<script[^>]*>'
curl -sI  https://aivara-se.github.io/learn-chess/vendor/pixi/pixi.min.mjs | head -1
curl -sI  https://aivara-se.github.io/learn-chess/src/scenes/path.js | head -1
curl -sI  https://aivara-se.github.io/learn-chess/sw.js | head -1              # 200, text/javascript
curl -sI  https://aivara-se.github.io/learn-chess/manifest.webmanifest | head -1
```

A deploy is verified the same way, and the pixels come from the live URL rather than
from the checkout: Pages rebuilds in about a minute, so the render above is repeated
against `https://aivara-se.github.io/learn-chess/` and the `CACHE` name it serves is
read back from the live `sw.js` — an unchanged name after a merge is a deploy that
did not happen, not a fix that did not work.

## 4. The offline copy

`sw.js` keeps two lists, and they have different owners:

- **the shell**, `SHELL` in `sw.js` itself: the files the game needs to boot and to draw its first
  frame. Two rules hold it, and `scripts/verify-shell.ts` enforces both — **it names the screen the
  game opens on** (`src/main.js`'s `DEFAULT_SCENE`), and **it is closed under that screen's imports**.
  A card that adds a shell file adds it there in the same commit, and bumps `CACHE` with it.
- **the content**, `assets/manifest.json`: every shipped asset, path and size. The worker fetches that
  file at install and precaches what it names, so a card that adds a sprite never touches `sw.js`.

**The two rules are not decoration: the list went stale once and cost the offline game.** It still
named the shell's old `placeholder.js` — deleted when the real screens landed — and named none of the
files the game actually opens on, because the screen the router imports on demand is not a file the
list is about. So a visitor who loaded the game once had `index.html` and `src/main.js` in the
precache and nothing else, and on the next load with no network the router answered *"There is no
screen called `path`"* — the shell reporting a missing screen for a missing file. Measured on
`main` before the fix, with the browser's own HTTP cache cleared:
`/src/scenes/path.js net::ERR_FAILED`, status `There is no screen called “path”`. The clearing is the
whole test: Chrome's own cache answers for a file the worker never held, which is why a check that
does not clear it can pass on a broken precache.

**A screen the router imports on demand is not in `SHELL`, and that is deliberate.** `#/lesson/1`,
`#/kit` and `#/board-fixture/*` are fetched when they are first opened and kept from then on, because
the worker's fetch handler stores what it fetches. The cost is exact and is worth stating: offline,
the path — the screen the game opens on — is there after one visit, and a lesson or a fixture is there
only if it has been opened once while online. The alternative is a `SHELL` that carries the lesson
chain, the board, the engine and every component kit on a first visit; that is a decision for a card,
not a consequence of the rule.

The cache name is versioned (`learn-chess-v17`) and read off the branches rather than guessed. Two
things follow, and both have bitten before:

- **A change to a file in `SHELL`, or to the list itself, bumps `CACHE` in the same commit**, or a
  returning visitor keeps the old file. The name has to be one nobody holds — the ladder comment above
  `CACHE` records which name `main` has and which name each branch claims — and it must stay above
  `v14`, because a visitor who last loaded the deleted app still has a worker holding `index.html` and
  `js/app.js` of that name's cache. `scripts/verify-shell.ts` enforces the floor. Read the ladder with
  `for br in $(git branch -r); do git show $br:sw.js | grep -m1 '^const CACHE'; done` — two branches
  that take the same number merge with no conflict marker, so the value has to be compared, not read.
- **The first load after a deploy is the old worker's**, because a cache-first worker answers from
  what it holds until the new one takes over. It converges on the next load; that is why the cache
  name changes rather than the worker's behaviour.

## 5. What cannot be done from a static host

Nothing here needs it, but so the boundary is written down: no server-side secrets, no private data,
nothing that must not be public, and no request that leaves the visitor's browser. Pages has no
staging environment — a merge to `main` is a deploy.

The service worker is not a server and does not make one possible: it stores this origin's own files,
for this visitor, and refuses anything that is not a GET on this origin.

## 6. What is no longer true

The app that this one replaces is parked at the `v1` tag and its shape is gone from `main`: there is no
`js/app.js`, no lessons list, no free-play tab and no daily-puzzle tab, and the fonts and icons the old
shell loaded are back under `assets/**` with `ATTRIBUTION.md` recording their terms. What the new tree
carries instead is the game itself: one Pixi application, a screen per route, the course as data
(`src/data/lessons.js`) and the path as the map a child walks. The rebuild's own shape, and what must
survive the port, is `docs/PORT.md`; whether it did is `docs/PORT.md`'s closing section.
