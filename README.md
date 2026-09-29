# learn-chess

A beginner's chess course for children, being rebuilt as a PixiJS game. The browser app that taught it
is gone from `main` and parked at the `v1` tag, and [`docs/PORT.md`](docs/PORT.md) is the contract the
rebuild is held to: the course data, the coach's rules, the path, the maths and the two verifiers that
have to survive the port.

**What is on `main` today is the shell, not the course.** <https://aivara-se.github.io/learn-chess/>
serves it: one PixiJS application that fills the viewport, one screen — a drawn board — and the offline
worker and route convention the port cards build on. The lessons, the puzzles and the path arrive with
them. Nothing has been lost: the old app is still there to read and run.

```sh
git checkout v1                    # the whole old tree, frozen
bun test                           # the old engine's rules
bun run scripts/verify-drills.ts   # every puzzle's answer, against Stockfish
git show v1:js/lessons.js          # or read one file out of the tag
```

What the old course was: a path of twelve stops that opens as a child walks it, each lesson one idea
with puzzles that are played rather than read, three optional detour packs, a boss game closing each
end of the path, stars for the puzzles solved first time, and Pip the pawn saying what he thought of
the move just played. The new game keeps that course; what it does not keep is written down plainly at
the end of `docs/PORT.md`.

**Licence.** The code is MIT — [`LICENSE`](LICENSE). The art is CC0, and the engine is this project's
own. The one third-party file is PixiJS, vendored with its licence and its provenance in
[`vendor/README.md`](vendor/README.md).

## Run it locally

The game is static files with no build step, so it is served rather than opened — a module loaded over
`file://` is refused by the browser, and the service worker needs an origin:

```sh
python3 -m http.server 8000        # any static server; this one needs nothing installed
open http://localhost:8000/
```

`#/lesson/1` is the route convention's example: the shell imports `src/scenes/lesson.js` when it is
asked for, and says so plainly while that screen does not exist yet. `docs/SYSTEM.md` is the rest of
how this tree is served, and what a deploy has to be checked for.

## Checks

```sh
bun test                           # the engine: perft and legality, ported from v1
bun run scripts/verify-shell.ts    # the shell: one module, no third-party request, the offline list,
                                   # the vendored library's version and hash, .nojekyll
```

Both run in `Checks` on every pull request. What they cannot see — a drawn frame, a crisp canvas at
360px and at 1440px, the app opening with the network off, zero console errors — is listed in
`docs/SYSTEM.md` and is done in a browser, with a look at the screenshot rather than only at the exit
code.
