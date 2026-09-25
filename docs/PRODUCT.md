# PRODUCT.md — purpose and scope

## What this product is

A beginner's chess course shaped like a small phone app: three tabs, one idea per card, puzzles you play with a finger, stars to collect, and Pip the pawn coaching your moves in a sentence a child can read. It runs entirely in the browser — nothing is installed, nothing is sent anywhere.

## Who it is for

- **A child who has never played, roughly 8 to 12.** The first lesson is how the pieces move, and
  the copy is held to a nine-year-old's reading level and enforced by the site check. Nothing assumes the reader knows what a file is, or why a knight on the rim is worse than one in the middle.
- **Someone who knows the moves and loses anyway.** Lessons 3 to 7 are the habits that decide
  beginner games: take the centre, bring your pieces out, castle, keep the queen back, and look for loose pieces before you move.
- **A parent or a teacher** who wants one link to hand over, and wants to know that it needs no
  account, shows no adverts and keeps a child's progress on that device alone.

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

- **Looks and behaves like an app**: one screen tall, bottom tab bar, one idea per screen, tap
  targets of at least 48px, no page scroll, no sideways scroll at 360px.
- **Works offline** once loaded, and from any static host: no build step, no runtime config.
- **AA contrast on every surface**, including pieces on both board tones (`docs/DESIGN.md`
  carries the measurements).
- **The drills must be right.** Every drill's answer was verified against Stockfish at depth 18
  before it was written down; a drill that rejects a good move teaches the wrong thing, so correcting one is a first-class change, not copy-editing.

## How it changes

The course grows by adding lessons and puzzles to `js/lessons.js` — new positions, verified the same way, written to the length budgets the site check enforces. The engine changes rarely; if it does, `bun test` decides whether the change is sound. Anything that needs a server, an account, or a network call belongs in a different product.
