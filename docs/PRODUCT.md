# PRODUCT.md — purpose and scope

## What this product is

A beginner's chess course shaped like a small phone app: three tabs, a path of lessons that opens as you walk it, one idea per card, puzzles you play with a finger, stars to collect into a rank, and Pip the pawn coaching your moves in a sentence a child can read. It runs entirely in the browser — nothing is installed, nothing is sent anywhere.

## Who it is for

- **A child who has never played, roughly 8 to 12.** The first lesson is how the pieces move, and
  the copy is held to a nine-year-old's reading level and enforced by the site check. Nothing assumes the reader knows what a file is, or why a knight on the rim is worse than one in the middle.
- **Someone who knows the moves and loses anyway.** Lessons 3 to 7 are the habits that decide
  beginner games: take the centre, bring your pieces out, castle, keep the queen back, and look for loose pieces before you move.
- **A parent or a teacher** who wants one link to hand over, and wants to know that it needs no
  account, shows no adverts and keeps a child's progress on that device alone.

## In scope

- A course laid out as a **path**: lessons are stops on one route, each with an explanation and
  drills that are played, not read. The route forks three times and merges twice, so a learner chooses
  which of two lessons to take first — but never which order to learn in, because a merge only
  opens when both of its branches are finished. A stop opens when the lesson before it is done; a
  locked stop says which lesson opens it and offers to walk you there. Progress is remembered in
  the browser, as two separate numbers — puzzles solved, and stars for the ones solved first time
  (`docs/DESIGN.md`).
- **A boss stop ends each branch of the path**: a whole game against Pip, at a level the stop names,
  played as White on the play screen. It is finished only by a checkmate the child delivers — a draw,
  a stalemate or a loss leaves it open — and the stop says so before the first move. Undo is off in a
  boss game, so the win is one the child played, and a boss win is not a star (`docs/DESIGN.md`).
- A **rank** to grow into: stars are worth a piece's rank, from Pawn at nothing to King at every
  star in the course. The reward for finishing a lesson is the next part of the path opening; the
  reward for doing it well is the rank.
- A rule a beginner cannot play without: what check is, the three ways out of it, and what makes
  checkmate. Then how to finish: the three shapes a mate in one takes, and driving a lone king to
  the edge with the queen before bringing your own king up. A learner who wins material and cannot
  mate does not win the game.
- A game with a coach: while playing, each move is graded (best, good, playable, inaccuracy,
  mistake, blunder) and the reason is stated in plain language, with the stronger move named.
- A training mode: the same positions again, shuffled, with a streak, for repetition.
- Honest labelling: the opponent is a small search over material and piece-square tables, and
  it says so.

## Out of scope

- **No backend, no accounts, no server.** Nothing about a visitor leaves their browser.
- **No analytics, no tracking, no third-party request.** Fonts are self-hosted and the engine
  is in this repository.
- **No rating, no leaderboard, no email, no chat.** One person learning is the whole product.
- **No claims of strength.** The engine is not Stockfish and is never described as such; it
  chooses useful beginner moves and says why, and it can be beaten.
- **No junior-adult content problem**: it is a game, so it is safe to hand to a child.

## Constraints

- **Looks and behaves like an app**: one screen tall, bottom tab bar, one idea per screen, tap
  targets of at least 48px — the board's own squares are the one measured exception, because eight
  of them cannot be 48px each inside a 360px screen (`docs/DESIGN.md` carries the numbers) — no
  page scroll, no sideways scroll at 360px. Nothing a game is played with is ever off-screen: when
  a phone is short the board gives way, because it is the only thing there that can.
- **Works offline for real**, from any static host: the app's own files are cached by `sw.js`, so a
  reload with no network still opens it, and a home screen can install it. No build step, no runtime
  config.
- **AA contrast on every surface**, including pieces on both board tones (`docs/DESIGN.md`
  carries the measurements).
- **The drills must be right, and must be checkable.** Every drill's answer is checked against
  Stockfish at depth 18 by `scripts/verify-drills.ts`, and `docs/DRILLS.md` is the record of that
  run — in the repository, re-runnable, not in someone's scratch directory. A drill that rejects a
  good move teaches the wrong thing, so correcting one is a first-class change, not copy-editing.

## How it changes

The course grows by adding lessons and puzzles to `js/lessons.js` — new positions, verified the same way, written to the length budgets the site check enforces. Nothing counts them but the app: the number of lessons and puzzles never appears in the shell, so the course can grow without anyone having to remember a total. The engine changes rarely; if it does, `bun test` decides whether the change is sound. `bun run scripts/verify-site.ts` and `bun run scripts/verify-drills.ts` decide whether the course still holds together, and both run on every pull request.

Anything that needs a server, an account, or a network call belongs in a different product.
