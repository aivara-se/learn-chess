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
| Installing | `manifest.webmanifest`; the PNG icons it names are `assets/**` and land with the assets card — the game loads without them, the home-screen mark does not |
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
- **`scripts/verify-shell.ts`** is the shell's own machine check; `scripts/verify-site.ts` (the
  course's data, its graph, its copy budgets) and the Stockfish drill verifier land with the port
  cards, which is also when they rejoin `Checks`.

A screen module default-exports any of `mount(context)`, `resize(context)`, `unmount(context)`, and
`context` is `{ app, layer, params, width, height }` with the size in CSS pixels and always current.
The rules a screen is built to — the tap floor, the board's `--board-room` and its 240px minimum,
`prefers-reduced-motion`, nothing signalled by colour alone, every square naming itself — are in
`docs/PORT.md` and in the design document the chrome card writes.

**The page names the mark and the icons before the files are here.** The favicon, the two rendered
icons and the apple-touch-icon are `assets/**` — the assets card's — and `index.html` is not that
card's file to edit. So the page carries the addresses the old app published: the files land there and
the requests resolve with no second change. While they are absent each one is a 404 in the console and
a `todo` line from `scripts/verify-shell.ts`. Naming them is also the lesser evil: a page that declares
no icon at all makes the browser invent `/favicon.ico` and 404 on that instead. The shell check reports
these rather than failing, because a red check for another card's in-flight work is a check people
learn to ignore — and the line disappears on the run after the files land.

## 2. `.nojekyll` is load-bearing

GitHub Pages runs Jekyll on a branch unless a `.nojekyll` file exists at the root, and **Jekyll does
not publish a folder called `vendor/`** — nor files starting with `_`, `.` or `#`. Without the file,
the one directory the app cannot do without is dropped from the published site: the local copy runs
and the live one 404s its own library, with nothing in the console but a module-load failure. The
file is empty and its existence is the whole of its content; `scripts/verify-shell.ts` fails the tree
when it is missing.

## 3. Verifying a deploy

```bash
# Pages enabled and pointed where you expect
gh api repos/aivara-se/learn-chess/pages --jq '{url: .html_url, cname: .cname, https: .https_enforced}'

# last build: 'built' is the success value (~30s-2min after a push)
gh api repos/aivara-se/learn-chess/pages/builds/latest --jq '{status, error, duration, created_at}'

# it serves, and it serves this game — the library line is the one .nojekyll is about
curl -sI  https://aivara-se.github.io/learn-chess/ | head -1
curl -s   https://aivara-se.github.io/learn-chess/ | grep -o '<script[^>]*>'
curl -sI  https://aivara-se.github.io/learn-chess/vendor/pixi/pixi.min.mjs | head -1
curl -sI  https://aivara-se.github.io/learn-chess/src/main.js | head -1
curl -sI  https://aivara-se.github.io/learn-chess/sw.js | head -1              # 200, text/javascript
curl -sI  https://aivara-se.github.io/learn-chess/manifest.webmanifest | head -1
```

```bash
# the rules a machine can check with no browser
bun test                                  # the engine: perft and legality
bun run scripts/verify-shell.ts           # the shell: markup, offline list, vendor, .nojekyll
```

Then what no script here can see, in a real browser — served over HTTP, never `file://`:

- **the frame is drawn**, at 360px wide and at 1440px, with no console error;
- **the canvas is the viewport** (`clientWidth` equals the window's) and its buffer is the CSS size
  times `min(devicePixelRatio, 2)` — the cap, not the raw ratio;
- **the page does not scroll sideways** (`scrollWidth <= clientWidth`) at either size;
- **`#/lesson/1`** resolves to a screen that is not there yet: the message element says so, which is
  the route convention working;
- **with the network off**, a reload after one visit still opens the game (devtools → Offline);
- **and the pixels are looked at.** Automated checks do not prove a board is legible; a screenshot
  does.

A browser check is written once and lives in the repository when the first screen that is worth
checking lands; until then the list above is run by hand and its result belongs in the pull request.

## 4. The offline copy

`sw.js` keeps two lists, and they have different owners:

- **the shell**, `SHELL` in `sw.js` itself: the files the game needs to boot and to draw. A card that
  adds a shell file adds it there in the same commit.
- **the content**, `assets/manifest.json`: every shipped asset, path and size. The worker fetches that
  file at install and precaches what it names, so a card that adds a sprite never touches `sw.js`. A
  missing manifest is not an error — the shell still installs and the game still opens offline, which
  is the state of this tree until the assets card lands.

The cache name is versioned (`learn-chess-v15`) and read off the branches rather than guessed. Two
things follow, and both have bitten before:

- **A change to a file in `SHELL` bumps `CACHE` in the same commit**, or a returning visitor keeps the
  old file. The name has to be one nobody holds — the ladder comment above `CACHE` records which name
  `main` has and which name each open pull request claims — and it must stay above `v14`, because a
  visitor who last loaded the deleted app still has a worker holding `index.html` and `js/app.js` of
  that name's cache. `scripts/verify-shell.ts` enforces the floor.
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
`js/app.js`, no lessons list, no Play tab and no Puzzles tab, and the fonts and icons the old shell
loaded are `assets/**` — the assets card's to bring back, with this page naming the addresses they
return to. The rebuild's own shape, and what must survive the port, is `docs/PORT.md`.
