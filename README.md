# learn-chess

A beginner's chess course that runs in the browser: eight short lessons, 24 positions you
play yourself, a game against a beginner-strength opponent, and a coach that says why a move
was good or bad.

Live at <https://aivara-se.github.io/learn-chess/> (a custom subdomain can be pointed at it
later — `docs/SYSTEM.md`).

| | |
|---|---|
| App | `index.html` — the whole interface; the stylesheet is in it |
| Rules and opponent | `js/engine.js` — move generation, search, evaluation |
| Lessons and drills | `js/lessons.js` — the course content, every answer checked against Stockfish |
| Interface | `js/app.js` — board rendering, the coach, progress in `localStorage` |
| Tests | `tests/engine.test.ts` — `bun test` (perft counts prove the move generator) |
| Check | `./scripts/verify-site.ts` — `bun run scripts/verify-site.ts` |
| Mark | `assets/favicon.svg` — the tab icon |

- Design and structure: [`docs/DESIGN.md`](docs/DESIGN.md)
- Purpose and scope: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- Deployment: [`docs/SYSTEM.md`](docs/SYSTEM.md)

No build step, no dependencies, no third-party request: the page loads its own files and
nothing else.
