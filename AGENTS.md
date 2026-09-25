# Agent Instructions

A beginner's chess course and coach, published as a static site at
<https://aivara-se.github.io/learn-chess/>.

Static HTML, CSS and ES modules — no build step, no dependencies, no third-party request, no
server. The interface is `index.html` plus `js/app.js`; the rules engine and the opponent are
`js/engine.js`; the course content is `js/lessons.js`. Design rules are in
[`docs/DESIGN.md`](docs/DESIGN.md), deployment in [`docs/SYSTEM.md`](docs/SYSTEM.md).

This file is the `aivara-se` agent convention, version `2`, adopted from
`e4bd72fa7a00bec50cc71332593e66564e3bd0e9`. Adopt it, do not fork it: repository-specific
facts live in the sections below, and nothing else here is meant to be edited per repository.

## Current Project Focus

The app is built, restyled as a phone-style app for children, and verified locally; the open
question is publication (Pages is enabled, the pull request is not merged). Next work, in order:
get it reviewed and merged, then read it on a real phone at 360px and watch a child use it —
that is the only test of the copy that matters.

This section is steering, not policy. It is the one place where what matters right now
outranks the standing rules below, it changes often, and it is replaced rather than appended
to. Keep it short enough to read in full, and current enough to be worth reading.

## House rules

- **The course content is data, not code.** Lesson text and puzzles live in `js/lessons.js`.
  Every puzzle's answer must be a move a beginner can find, and every `accepted` list must hold
  moves verified against Stockfish at depth 18 — a puzzle that rejects a good move teaches the
  wrong thing. `scripts/verify-site.ts` checks that each position is playable and every answer
  legal; it cannot check that the answer is best, so that stays a human (or Stockfish) job.
- **Copy is written for a nine-year-old**, and the length budgets are enforced by
  `scripts/verify-site.ts`: a lesson goal under 55 characters, a title under 40, a body paragraph
  under 170, a caption under 110, a puzzle prompt under 65, a hint under 55, an explanation under
  150. Short sentences, active voice, no jargon.
- **A star means first try.** Never award one for a puzzle solved after a hint or a wrong answer.
  The list shows both numbers — puzzles solved and stars earned — and they must stay separate.
- **The board is drawn from White's side and the engine is not.** The engine numbers squares
  `0 = a1 … 63 = h8`, so drawing that index in DOM order puts White at the top — which shipped
  once, because the file and rank labels followed the same convention and nothing looked wrong.
  Map the cell in row `row` and column `col` to `(7 - row) * 8 + col`, and to `row * 8 + (7 - col)`
  when flipped. Square colour comes from the square, not the cell (a1 and h8 stay dark). The browser
  check asserts orientation, the corner labels, a1/h8 colouring and every piece's colour against
  the position; keep those assertions when you touch the renderer.
- **Every colour is measured, on the surface it is used on.** `docs/DESIGN.md` carries the table;
  a new pair without a measurement does not ship. Nothing may be signalled by colour alone: a
  verdict, a turn or a check is always also a word.
- **The app must keep working offline and from `file://`-style hosting**: no fetch, no CDN,
  no external font, no account, no backend. Any feature that needs a server does not belong
  here.
- **Say what the engine can do, and no more.** The opponent is a small alpha-beta search over
  material and piece-square tables with quiescence, three settings, labelled honestly in the
  interface. Do not describe it as strong, and do not call its evaluation an engine-grade
  verdict.
- **Progress is the visitor's, and stays on their machine.** `localStorage` only; never add
  analytics, tracking, or anything that sends their moves anywhere.
- **Copy is for someone who has never played.** Short sentences, no jargon ("tempo",
  "initiative", "prophylaxis"), no abbreviations left unexplained.

## Tooling

- **Bun is the runtime for scripts.** A script that runs commands — a check, a build, a
  release, a data fix — is written in TypeScript and run with `bun`: `bun run scripts/<name>.ts`.
  **Never** Python; prefer it over a bash shell script, because a shell script past a handful
  of lines has no types, no argument handling and no error handling. A one-line command typed
  at the prompt is not a script.
- **Never** add a second package manager, a second lockfile, a second formatter or a second
  test runner. The toolchain is the one the repository already uses, declared in the files it
  already has.
- **Never** report "tests pass", "it builds" or "verified" without the command and the tree it
  ran against.

## Verify before pushing

```bash
bun test                            # the rules engine: perft and legality
bun run scripts/verify-site.ts      # the site-level rules that can be checked mechanically
```

Then the two things a script cannot see: the app must work on a phone at 360px with no
horizontal scroll, and the *rendered* page must be looked at — board legible, pieces
distinguishable, buttons reachable, no console error. Automated browser checks do not prove
the pixels are right; look at a screenshot.

## Deploy

Pages serves the branch root, so pushing to `main` is a deploy. There is no CI: the committed
HTML is the published site. Repository → Pages → *Deploy from a branch* → `main`, folder `/`.
A subdomain is the owner's decision — `docs/SYSTEM.md` has the DNS shape.

## Version Control

- **Branches**: lowercase, hyphens only, one per task, named for the change — `fix-drill-answer`,
  `feat-train-streak`. No uppercase, no underscores, no personal prefixes.
- **Commits**: Conventional Commits, lowercase, single line, no scopes — `type: short description`.
- **Never** commit to `main` directly. **Never** force-push a branch another agent or person
  has seen.
- Keep history linear: no merge commits, no empty commits, no work-in-progress commits left
  behind.
- Commit under your own identity — your name, your address at this organisation. Never a
  generic bot, never another agent's identity.
- Remote work is always a branch plus a pull request. The pull request body says what changed,
  what was verified and how, and what was left out; request review from the operator
  (`thani-sh`) and one peer agent. Leave the working tree clean: no scratch files, no editor
  backups, no `.env` you created.

## Repository Structure

- `index.html`: the app shell — markup and the stylesheet
- `js/engine.js`: rules, legal move generation, search, evaluation
- `js/lessons.js`: the course — lesson text, diagrams and verified drills
- `js/app.js`: the interface — board, coach, progress
- `tests/`: `bun test` suites
- `scripts/`: `verify-site.ts`, the mechanically checkable rules
- `assets/fonts/`: self-hosted latin-subset fonts and their licences
- `docs/`: the authoritative documents — `DESIGN.md`, `PRODUCT.md`, `SYSTEM.md`

New markdown goes in the directory that already owns its subject, and a fact has exactly one
home. Never add a second copy of something a document already says; link to it. If a path in
the map above stops being true, fix the map in the same pull request. A map that lies is worse
than no map.

## Agent Skills

`.agents/skills/` holds one skill per kind of work — the procedure to follow, not a second copy
of these instructions. Each skill declares in its front matter what it covers and its
`when-to-use`: the situation in which you must open it. Read the skill that covers the work
before you start it.

No skills are shipped in this repository yet: the work so far is one feature in one app, and
the conventions above cover it. The first skill to write is the one for authoring drills —
verify the answer with Stockfish, phrase the `why` from the position, then play it in the
browser.

Front matter is exactly three keys: `name`, equal to the directory; `description`, one
sentence; `when-to-use`, the trigger in the reader's words. A skill stays under about 120
lines, covers one concern, and names every file it ships. Skills are flat until this repository
has more than eight of them or two clearly unrelated groups, then they are grouped under
`.agents/skills/<group>/<skill>/` and this index is updated with them.

A skill that is true only of this repository stays here. A skill that would be true of every
repository belongs in the `aivara-se` convention instead, in a pull request of its own.
