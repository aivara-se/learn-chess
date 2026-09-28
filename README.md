# learn-chess

A beginner's chess course that behaves like a small phone app: short lessons with puzzles you play yourself, a game against an honest little opponent, and Pip the pawn coaching your moves — with stars to collect as you go.

Live at <https://aivara-se.github.io/learn-chess/> (a custom subdomain can be pointed at it later — `docs/SYSTEM.md`).

- **App shell** — `index.html`: the tab bar, the screens and the stylesheet.
- **Offline and installing** — `sw.js` and `manifest.webmanifest`: the app's own files, kept for a reload with no network.
- **Rules and opponent** — `js/engine.js`: move generation, search and evaluation.
- **Lessons and puzzles** — `js/lessons.js`: the course; `docs/DRILLS.md` is what its answers were measured against.
- **Today's puzzle** — `js/daily.js`: the one puzzle a day, chosen from the date rather than stored.
- **Interface** — `js/app.js`: the board, the coach, the stars and progress in `localStorage`.
- **Tests** — `tests/engine.test.ts`, run with `bun test`; perft counts prove the move generator.
- **Checks** — `scripts/verify-site.ts` (files, offline list, markup, the course's own budgets) and `scripts/verify-drills.ts` (every puzzle's answer, against Stockfish).
- **Mark** — `assets/favicon.svg`, with the rendered icons and the 1200×630 share card beside it.

Three tabs: **Lessons** (eight lessons, each stepping through one idea and the puzzles that go with it), **Play** (a game with the coach), **Puzzles** (today's puzzle first, then the same positions shuffled, with a streak). A star is earned by solving a puzzle first time, so the app counts two things: puzzles solved, and stars won.

```bash
bun test                              # the rules of chess
bun run scripts/verify-site.ts        # the files, the cache list, the markup, the course budgets
bun run scripts/verify-drills.ts      # every puzzle's answer, against Stockfish
bun run scripts/verify-drills.ts --write   # ...and write the record to docs/DRILLS.md
```

- Design and structure: [`docs/DESIGN.md`](docs/DESIGN.md)
- Purpose and scope: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- Deployment: [`docs/SYSTEM.md`](docs/SYSTEM.md)
- What the puzzles were measured against: [`docs/DRILLS.md`](docs/DRILLS.md)

No build step, no dependencies, no third-party request, no accounts: the page loads its own files and nothing else, and progress never leaves the device.
