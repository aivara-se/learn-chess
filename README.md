# learn-chess

A beginner's chess course that behaves like a small phone app: short lessons with puzzles you
play yourself, a game against an honest little opponent, and Pip the pawn coaching your moves —
with stars to collect as you go.

Live at <https://aivara-se.github.io/learn-chess/> (a custom subdomain can be pointed at it later
— `docs/SYSTEM.md`).

| | |
|---|---|
| App shell | `index.html` — the tab bar, the screens, the stylesheet |
| Rules and opponent | `js/engine.js` — move generation, search, evaluation |
| Lessons and puzzles | `js/lessons.js` — the course, every answer checked against Stockfish |
| Interface | `js/app.js` — board, coach, stars, progress in `localStorage` |
| Tests | `tests/engine.test.ts` — `bun test` (perft counts prove the move generator) |
| Check | `scripts/verify-site.ts` — `bun run scripts/verify-site.ts` |
| Mark | `assets/favicon.svg` — the tab icon |

Three tabs: **Lessons** (eight lessons, each stepping through one idea and three puzzles),
**Play** (a game with the coach), **Puzzles** (the same positions shuffled, with a streak).
A star is earned by solving a puzzle first time.

- Design and structure: [`docs/DESIGN.md`](docs/DESIGN.md)
- Purpose and scope: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- Deployment: [`docs/SYSTEM.md`](docs/SYSTEM.md)

No build step, no dependencies, no third-party request, no accounts: the page loads its own files
and nothing else, and progress never leaves the device.
