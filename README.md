# learn-chess

A beginner's chess course for children, being rebuilt as a PixiJS game. The browser app that taught it is gone from `main` and parked at the `v1` tag, and [`docs/PORT.md`](docs/PORT.md) is the contract the rebuild is held to: the course data, the coach's rules, the path, the maths and the two verifiers that have to survive the port.

**The live site is dark on purpose.** <https://aivara-se.github.io/learn-chess/> returns 404 until the game ships, and the URL comes back with it. Nothing has died — the course moved, and the old app is still there to read and run:

```sh
git checkout v1                    # the whole old tree, frozen
bun test                           # the old engine's rules
bun run scripts/verify-drills.ts   # every puzzle's answer, against Stockfish
git show v1:js/lessons.js          # or read one file out of the tag
```

What the old course was: a path of twelve stops that opens as a child walks it, each lesson one idea with puzzles that are played rather than read, three optional detour packs, a boss game closing each end of the path, stars for the puzzles solved first time, and Pip the pawn saying what he thought of the move just played. The new game keeps that course; what it does not keep is written down plainly at the end of `docs/PORT.md`.

**Licence.** The code is MIT — [`LICENSE`](LICENSE). The art the old course used is CC0, and the engine is this project's own.

## Run it locally

There is nothing to run in this tree yet: `main` holds this README, the licence and the port contract, and nothing else. What lands next is a PixiJS shell that boots as plain static files — one module script, one pinned copy of the library, no build step — so it is served over HTTP rather than opened from the filesystem, and the old course is the thing that works today, from the `v1` tag above.

## Checks

Nothing gates this tree yet. `docs/PORT.md` names the two verifiers the old course ran and what each one covered, so the rebuild starts from a check that already existed rather than one invented later.
