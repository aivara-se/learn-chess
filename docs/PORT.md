# PORT.md — the contract the port cards read

The old course was frozen at the `v1` tag and wiped from `main`. This is the interface between the app
that was deleted and the game being built in its place: read it before starting a port card, and hold
the port to it. It is written from the tagged tree, not from memory — the first draft of the card that
created this file was wrong on every number in it, which is why every figure below can be re-derived
with one command.

```sh
git show v1:js/lessons.js           # the course: stops, drills, packs, the requires graph
git show v1:js/app.js               # the interface: the coach, the rank ladder, the stars
git show v1:js/engine.js            # the rules, the search, findThreat
git show v1:scripts/verify-site.ts  # the copy budgets and the checks
git show v1:scripts/verify-drills.ts
```

Two rules that come with the contract:

- **The text moves unchanged.** A port is not a rewrite: the lesson copy, the puzzle prompts, hints and
  explanations cross over word for word, and a port that improves a sentence has changed the course
  rather than moved it. If a sentence has to change, that is a card of its own.
- **Count what you move, and put the count in the pull request.** The course grew four times in the
  hours before the tag — the packs, the boss stops, the badges and the daily puzzle — so a number
  carried over from a plan is a number that is wrong. Derive it from the tree you moved.

## The course data

**12 stops** — **ten lessons and two boss games** — **plus three optional packs**, and **44 positions**
in total: **35 lesson drills** and **9 pack puzzles**.

| stop | opens when | drills |
|---|---|---|
| `board-and-pieces` | — (the first stop) | 4 |
| `piece-values` | `board-and-pieces` | 3 |
| `centre-pawns` | `board-and-pieces` | 3 |
| `develop` | `piece-values` **and** `centre-pawns` | 3 |
| `castle-early` | `develop` | 3 |
| `queen-early` | `develop` | 3 |
| `look-first` | `castle-early` **and** `queen-early` | 5 |
| `finish-it` | `look-first` | 3 |
| `italian` | `look-first` | 3 |
| `mate-in-one` | `italian` | 5 |
| `boss-first-game` | `finish-it` | a game, not drills |
| `boss-last-game` | `mate-in-one` | a game, not drills |

| pack | offered with | puzzles |
|---|---|---|
| `fork` | `look-first` | 3 |
| `pin` | `develop` | 3 |
| `back-rank` | `castle-early` | 3 |

The shapes, as the tag writes them:

- **a lesson** is `{ id, title, goal, body[], diagram, diagramCaption, drills[], requires[] }`;
- **a boss stop** is that shape without the drills, plus `boss: { level }` — the strength of Pip the
  game is won against (level 1 plays sleepily, level 2 like a club beginner, level 3 properly);
- **a pack** is `{ id, title, idea, opensWith, drills[] }`, and `opensWith` is the lesson that teaches
  the idea. Nothing requires a pack and a pack requires nothing.
- **a position** is `{ fen, prompt, hint, why, best, accepted }` — plus a `note` when its `accepted`
  list is deliberately narrower than the engine's own margin, which is the paper trail that keeps the
  exception readable rather than silent.

**The copy budgets** are the `BUDGET` table at `v1:scripts/verify-site.ts` (`title 40, goal 55,
caption 110, body 170, prompt 65, hint 55, why 150`), because that is the table a machine enforced. A
word count is method-dependent and was never a rule here.

## The coach

Inside a lesson the play screen keeps Pip speaking about the move that was just played, in a child's
words, and he has something to say about **every** move:

- **a verdict for every move**, in bands: `Perfect!` (up to 10 centipawns lost), `Nice move` (40),
  `Okay` (70), `Careful` (150), `That loses something` (300), `Oops` (beyond that);
- **the stronger move named** when the move was not the engine's own — "Better was the knight move —
  it …" — and the engine's own move is never criticised for the score it leaves, because that drop is
  the opponent's reply rather than the child's choice;
- **the threat named when there is one**: after Pip moves, the biggest thing his move now threatens is
  said out loud, in one sentence;
- **the score in words** after every verdict — "Pip says you are a little ahead" and the four other
  bands, never a bare number;
- **a check announced first** — "Check!" in front of the sentence — and **mate announced as the end**:
  "Perfect! Checkmate — the game is yours."

The verdict was broken at one point and the fix is part of the contract: it was written into the bubble
and overwritten 332ms later by Pip's own move, so a child never read it. Whatever the new shell does
with the bubble, a verdict a child cannot read is a verdict that does not exist.

## The path

The course is a **graph in the data**, and the map is purely derived from it — nothing about the order
is written into the interface, so a stop cannot be placed somewhere the course does not open it.

- **Three forks**: after `board-and-pieces` (values or the centre), after `develop` (castle or the
  queen), after `look-first` (finish a game or learn the Italian).
- **Two merges**: `develop` needs **both** early branches, and `look-first` needs **both** habits —
  a merge is where the teaching order is enforced, so a merge must require every branch.
- **Every end of the path finishes in a boss game** rather than another puzzle, and a boss is finished
  only by a checkmate the child delivers.
- The old check fails a `requires` that names no lesson, a circle, or a stop no route can reach — a
  learner stranded behind a graph bug has no way round it. Keep that property in the new shape.

**The screen the path is drawn on was re-arted after the port, and this contract is about the graph
rather than the pictures.** The port drew the map out of the app's own chrome — a circle per stop, a
line per leg, the words under them — with every position derived from `requires`. The screen a child
walks now is a painted world instead: three terrain bands cut from one 520×1280 painting, a route of
beads, a marker set and a banner, all art made for this project and landed after the port (`#52` and
`#53`), documented in [`docs/DESIGN.md`](DESIGN.md) §10. What this contract promised is what still
holds and it is all about the *data*: a stop's row is its depth in the graph, its legs are its
`requires`, its state is the child's record and its stars are first tries. `src/path/layout.js` derives
every position and `src/path/progress.js` reads the record, so the art decides nothing — and a reader
who sees a painting here should not think the port drew it, nor that a drawn coordinate table has crept
back in.

## The maths

- **A star is a first-try solve.** Never for a puzzle solved after a wrong answer or a hint, and a boss
  game earns no star at all — it is finished by a checkmate.
- **Two numbers are kept apart**: puzzles solved, and stars won, and the interface shows both, so the
  difference between them is visible to a child and a parent.
- **Stars become a rank**: `[['Pawn', 0], ['Knight', 6], ['Bishop', 13], ['Rook', 18], ['Queen', 23],
  ['King', 29]]`. The rungs were set against the 35 lesson puzzles and then scaled to the 44-position
  pool the packs made — a rung every six or seven stars, with King still short of the last star.
- **Every total is derived, never written down.** The course's size is a `reduce` over the lessons and
  the packs (`TOTAL_DRILLS`), and a total written into a file is a lie waiting to happen — the old site
  check failed one.

## The two verifiers

Two scripts and one test suite were the whole of the old course's verification, and each had a job:

- **`scripts/verify-drills.ts` — the engine check.** Stockfish (MultiPV 6, depth 18, one thread, hash
  16, a fresh process per position) over every drill in the course *and* in the packs, comparing its
  top moves with each position's `best` and `accepted`. It fails an answer more than 30 centipawns
  behind the engine's top move, and a mate that is not a mate. Run with `--write` it regenerates
  `docs/DRILLS.md`, which is a **record of measurement** rather than a document — and that is why
  deleting it in the wipe was deliberate: it must be regenerated for the ported positions, not carried
  over.
- **`scripts/verify-site.ts` — the site check.** The files that have to exist, the offline cache list,
  the markup, the course's own copy budgets, and the `requires` graph: that a requirement names a real
  lesson, that there is no circle, and that no stop is unreachable.
- **`bun test` — the rules.** Perft counts for the move generator and the badge rules without a
  browser. The engine itself (`js/engine.js`) is ported as it stands, tests included; the rules of
  chess here are already measured and a rewrite throws that away.

## Accessibility and motion

- **48px is the floor for anything a child taps.** A pack's circle on the map is 48px exactly, a stop's
  is 64px, and the rule is the reason.
- **The board is the one documented exception**, and it is documented because it was measured: eight
  squares cannot each be 48px on a phone, so the board takes `--board-room` — what its screen has left
  after its own chrome — down to a **240px floor**, and everything else gives way before it does. A new
  line of copy in a screen's chrome is a smaller board on the smallest phones.
- **Everything is off under `prefers-reduced-motion: reduce`**, and only the piece that just moved
  animates: a redraw cannot show which piece went where, and that is the one movement that earns its
  keep.
- **Nothing is signalled by colour alone** — a verdict, a turn or a check is always also a word — and
  **every square names itself for a screen reader**: its coordinate, what stands on it, and whether it
  is yours, selected, a target or in check. Every sentence a screen reader needs goes through a polite
  live region.

## What is deliberately not ported

**The Play tab and the Puzzles tab.** Both are gone, and they are not coming back: the first was a free
game against Pip, the second today's puzzle followed by the course's positions shuffled with a streak.
Say so plainly rather than re-adding one by accident.

The drills that live **inside a lesson** are part of the lesson and do **not** go with them.

This contract names what must survive. Things it does not name — the badge book (`js/badges.js`), the
daily puzzle (`js/daily.js`), the sound module, the offline cache list — are not thereby promised; a
port card that wants one says so in its pull request and is answered there.

## What the port delivered

Written after the screens landed, and counted from this tree rather than from the plan — a number carried
over from a plan is a number that is wrong, which is the second rule above.

- **The course data, unchanged.** 12 stops — ten lessons and two boss games — plus 3 detour packs, and
  **44 positions** in all: 35 lesson drills and 9 pack puzzles. Every FEN and every accepted answer is the
  tagged tree's own, and every answer is re-measured against Stockfish: `bun run scripts/verify-drills.ts`
  reports 44 drills measured and the five deliberate exceptions the copied `note`s name, no unexplained
  finding.
- **The coach, whole.** A verdict for every move in the ported six bands, the stronger move named, the
  threat named, the score in words, a check announced first and mate announced as the end — and the
  verdict is not overwritten by his own move, which is the bug this contract carried. Playing `#/lesson/1`
  end to end in a browser shows a verdict and a reply in two separate elements after every puzzle.
- **The path, as data.** Three forks, two merges, every end of the path finishing in a boss game, and the
  drawn map derived from `requires` rather than from a coordinate table — `bun run scripts/verify-site.ts`
  counts 12 stops, one open at the start, every stop reachable, eight rows deep. The pictures are not the
  port's: the map was re-arted afterwards, and "The path" above says so.
- **The maths.** A star is a first-try solve, puzzles solved and stars are two numbers, the rank ladder is
  `v1`'s verbatim, and every total is derived rather than written down.
- **The two verifiers and the test suite**, ported one file each and running in `Checks` on every pull
  request. A third script came with the shell — `scripts/verify-shell.ts` — and answers eight questions
  about how the tree is served, including that the offline copy is the first frame's closure.

**One thing the contract did not name, and did not survive: the detour packs have no screen.** The map
draws all three, the sheet answers for them, and the nine puzzles are in the data and measured by the
checks — but tapping an open pack hands the child `#/pack/<id>`, and there is no `src/scenes/pack.js`, so
the shell answers *"There is no screen called `pack`"*. That is a screen rather than a sentence, so it is a
card of its own and it is filed as one: **#59**. It is written here instead of being left out, because a
contract that counts the packs' puzzles and then cannot say where they are played is the kind of silence
this document exists to prevent.

[`docs/SYSTEM.md`](SYSTEM.md) §3 is the verification story — what each layer covers and what each one
cannot see.

## Licence

The code is MIT (`LICENSE` at the root). The art the old course used is CC0, and the engine in
`js/engine.js` is this project's own — written here, not vendored.
