# Agent Instructions

A beginner's chess course and coach, published as a static site at
<https://aivara-se.github.io/learn-chess/>.

Static HTML, CSS and ES modules — no build step, no dependencies, no third-party request, no
server. The interface is `index.html` plus `js/app.js`; the rules engine and the opponent are
`js/engine.js`; the course content is `js/lessons.js`. Design rules are in
[`docs/DESIGN.md`](docs/DESIGN.md), deployment in [`docs/SYSTEM.md`](docs/SYSTEM.md).

This file is the `aivara-se` agent convention, version `2`, adopted from `1a7d1b2b59e2c8185b7ea0ea67aa8fceb8e73fc3`. Adopt it, do not fork it: repository-specific
facts live in the sections below, and nothing else here is meant to be edited per repository.

## Current Project Focus

The app is built and verified locally; the open question is publication (a new repository,
Pages, and whether the owner points a subdomain at it). Next work, in order: get it reviewed
and merged, then read it on a real phone at 360px.

This section is steering, not policy. It is the one place where what matters right now
outranks the standing rules below, it changes often, and it is replaced rather than appended
to. Keep it short enough to read in full, and current enough to be worth reading.

## House rules

- **The course content is data, not code.** Lesson text and drills live in `js/lessons.js`.
  Every drill's answer must be a move a beginner can find, and every `accepted` list must
  hold moves verified against Stockfish at depth 18 — a drill that rejects a good move
  teaches the wrong thing. `scripts/verify-site.ts` checks that each drill is playable; it
  cannot check that the answer is best, so that stays a human (or Stockfish) job.
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

Run the whole sequence, not just its fast part, and read every result — the exit code of the last command says nothing about the first.

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
of these instructions. A skill stands on its own: it names no file of this convention and
points at no other skill, so a reader who has it has everything it needs. This file is what
points at the skills; they never point back. Each skill declares in its front matter what it
covers and its `when-to-use`: the situation in which you must open it. Read the skill that
covers the work before you start it.

- .agents/skills/coding/SKILL.md
- .agents/skills/testing/SKILL.md
- .agents/skills/writing/SKILL.md
- .agents/skills/review/SKILL.md

Every skill on disk is listed above, and every skill listed above exists. A new skill is added
here in the same pull request that adds it, and a skill deleted from disk is deleted from this
list in the same commit. An index that has drifted is worse than a short one.

The first repository-specific skill to write is still the one for authoring drills — verify the
answer with Stockfish, phrase the `why` from the position, then play it in the browser.

Front matter is exactly three keys: `name`, equal to the directory; `description`, one
sentence; `when-to-use`, the trigger in the reader's words. A skill stays under about 120
lines, covers one concern, and names every file it ships. Skills are flat until this repository
has more than eight of them or two clearly unrelated groups, then they are grouped under
`.agents/skills/<group>/<skill>/` and this index is updated with them.

A skill that is true only of this repository stays here. A skill that would be true of every
repository belongs in the `aivara-se` convention instead, in a pull request of its own.
