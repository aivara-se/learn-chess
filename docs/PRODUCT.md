# PRODUCT.md — purpose and scope

## What this product is

A beginner's chess course that runs entirely in the browser. Eight short lessons, each ending
in positions the learner plays themselves; a game against a beginner-strength opponent; and a
coach that grades the learner's moves and says, in words, what the stronger move would have
done.

## Who it is for

- **Someone who has never played.** The first lesson is how the pieces move. Nothing assumes
  a reader knows what a file is, or why a knight on the rim is worse than one in the middle.
- **Someone who knows the moves and loses anyway.** Lessons 3 to 7 are the habits that decide
  beginner games: take the centre, develop, castle, keep the queen back, and look for loose
  pieces before moving.
- **A teacher or a parent** who wants one link to hand over. No account, no download, no
  install, no data collected.

## In scope

- A course: lessons in a fixed order, each with an explanation and drills that are played, not
  read. Progress is remembered in the browser.
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

- **Works on a phone**: one column, board sized to the viewport, no horizontal scroll at 360px.
- **Works offline** once loaded, and from any static host: no build step, no runtime config.
- **AA contrast on every surface**, including pieces on both board tones (`docs/DESIGN.md`
  carries the measurements).
- **The drills must be right.** Every drill's answer was verified against Stockfish at depth 18
  before it was written down; a drill that rejects a good move teaches the wrong thing, so
  correcting one is a first-class change, not copy-editing.

## How it changes

The course grows by adding lessons and drills to `js/lessons.js` — new positions, verified the
same way. The engine changes rarely; if it does, `bun test` decides whether the change is
sound. Anything that needs a server, an account, or a network call belongs in a different
product.
