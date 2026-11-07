# Agent Instructions

A beginner's chess course for children, walked as a path of stops on a painted map: eight lessons, two
boss games and three optional detour packs, played on a real board with Pip the pawn judging the move
just played. A static site with no build step — the committed files are the published files.

This file is the `aivara-se` agent convention: the rules that hold in every repository. Adopt it, do not fork it. It never describes the state of the work — that lives in the documents below.

## Where a fact lives

- `docs/PRODUCT.md` — what the game is, who it serves, what it must not do, and what would make it done.
- `docs/SYSTEMS.md` — how it is served and checked, and what fails.
- `docs/DESIGN.md` — every colour, size and shape the game draws with, and its measurements.
- `docs/adrs/` — a decision per file, written before the code it decides.
- `README.md` — how to run it locally.
- `docs/DRILLS.md` — measured, not written: `verify-drills.ts --write` regenerates it.

One fact, one home: link to a document, never restate it. A sentence here that starts describing the work instead of how work is done belongs in `PRODUCT.md`.

## House rules

- **The course is data, not code.** Lessons and puzzles live in `src/data/lessons.js`, and the map is derived from their `requires`. Do not hand-place a stop or write the order anywhere else. A `requires` that names no lesson, a circle or an unreachable stop fails the site check.
- **A puzzle's answer is a move a beginner can find, verified against Stockfish at depth 18.** A drill whose accepted list is deliberately narrower carries a `note` saying why; the drill check fails an answer more than 30 centipawns behind the engine's top move.
- **A star means a first try.** Never after a hint or a wrong answer. Puzzles solved and stars won are two numbers and stay separate.
- **Nothing counts the course but the app.** Every total is derived; a total written into a file fails the site check.
- **Copy is for a nine-year-old**, inside the budgets `scripts/verify-site.ts` enforces: title 40, goal 55, caption 110, body 170, prompt 65, hint 55, why 150 characters. Short sentences, active voice, no jargon.
- **The board is drawn from White's side and the engine is not.** The engine numbers squares `0 = a1 … 63 = h8`, so map row `row` and column `col` to `(7 - row) * 8 + col`, and to `row * 8 + (7 - col)` when flipped. Square colour comes from the square, not the cell: a1 and h8 stay dark.
- **Every colour is measured, on the surface it is used on.** A new pair without a measurement does not ship, and nothing is signalled by colour alone — a verdict, a turn or a check is always also a word.
- **Every square names itself for a screen reader** — coordinate, what stands on it, and whether it is yours, selected, a target or in check — through a polite live region.
- **Nothing is hidden with the `hidden` attribute alone.** An author `display` beats `[hidden]`, so the stylesheet carries `[hidden] { display: none !important }`. Anything that opens something else is looked at, not asserted.
- **Every animation is off under `prefers-reduced-motion: reduce`.** Only the piece that just moved slides; that one movement earns its keep.
- **The board is what gives way, and never past 240px.** 48px is the floor for anything a child taps, and a new line of chrome is a smaller board on the smallest phones.
- **Never** add a build step, a `package.json`, a dependency or a request off this origin. The one third-party file is `vendor/pixi/pixi.min.mjs`, pinned and hashed with its licence beside it. Any feature that needs a server does not belong here.
- **Offline is a rule.** A file the page serves goes into `sw.js`'s `SHELL` in the same commit, and a change to a file already there bumps `CACHE` in that commit — to a name no branch holds and above the `v14` floor. A stale list is what broke the offline game once.
- **`.nojekyll` stays.** Without it Pages does not publish `vendor/`, and the live game 404s its own library.
- **Say what the engine can do, and no more.** The opponent is a small alpha-beta search with quiescence, three settings, labelled honestly. Never call it strong.
- **Progress is the visitor's.** `localStorage` only; never add analytics or anything that sends their moves anywhere.

## Tooling

- **Bun runs the scripts.** A script that runs commands is TypeScript, run with `bun run scripts/<name>.ts` — never Python, and a shell script only when it stays a few lines. A command typed at the prompt is not a script.
- **Never** add a second package manager, lockfile, formatter or test runner. The toolchain is the one the repository already declares.
- **Never** report "tests pass", "it builds" or "verified" without the command and the tree it ran against.

## Skills

The organisation's skills live in `aivara-se/.agents/skills` and every agent reads them from there; a repository carries no copy. Each declares a `when-to-use`: open the one that covers the work before starting it.

## Verify before pushing

```bash
bun test                            # the engine, the board's geometry, the drill loop, the graph
bun run scripts/verify-shell.ts     # the tree as served, and the offline list
bun run scripts/verify-site.ts      # the course: positions, graph, copy budgets, art record
bun run scripts/verify-drills.ts    # every answer against Stockfish ($STOCKFISH or /usr/games/stockfish)
```

Run the whole sequence and read every result — the last exit code says nothing about the first.

What no script can see — a frame at 360×640, whether a board is legible, a lesson walked end to end,
a reload with the network off — is the browser pass in `README.md` § Checks, and the screenshots
belong in the pull request beside the numbers.

The same commands run in `.github/workflows/validate.yml`, whose job is named `validate` — the name
the organisation's baseline requires a check under before a merge.

## Version Control

- **Branches**: lowercase, hyphens, one per task: `docs/`, `feat/`, `fix/` or `chore/` and a short name — `docs/adopt-agents-config`, `fix-log-timezone`. No uppercase, no underscores, no personal prefixes.
- **Commits**: Conventional Commits, lowercase, single line, no scopes — `type: short description`.
- **Never** commit to `main` directly, and **never** force-push a branch someone else has seen.
- Keep history linear: no merge commits, no empty commits, no work-in-progress commits.
- Commit under your own identity, never another agent's.
- Remote work is a branch plus a pull request: the body says what changed, what was verified and how, and what was left out. Leave the tree clean.
- Request review from the operator (`thani-sh`) alone for a documents-only change, and from the operator and one peer agent for an implementation one.

