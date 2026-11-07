# 001 - The course replaces v1

## Context

The browser app this game replaces taught a course of lessons and drills, and around it offered two other
things: a Play tab, where a child played a free game against Pip, and a Puzzles tab, where today's
puzzle arrived followed by the course's positions shuffled with a streak. Both were used less than
the path was. A free game to wander into has no next step, and a puzzle chosen by the date is not a
lesson.

The old app was frozen at the `v1` tag and removed from `main`. Its course data — the lesson copy, the
puzzle prompts, hints and explanations, every FEN and every accepted answer — is the product of work
that is not worth repeating, and its engine is this project's own, ported with its tests.

## Decision

`main` becomes one path: ten stops — eight lessons and two boss games — plus three optional detour
packs, thirty-nine positions in all. The stops are a chain: each opens when the one before it is
finished, and a pack hangs beside the lesson that teaches its idea. The path ends in a boss game won
by checkmate.

The text moves unchanged. A port is not a rewrite, so a sentence that has to change is its own change,
and what moved is counted from the tree it moved from rather than from a plan.

Free play and the daily puzzle are refused for good. The drills that live inside a lesson are part of
the lesson and stayed. The facts that left `PORT.md` now live where the standard puts them: the coach's
bands, the star rule and the rank ladder are `PRODUCT.md` § Behaviour; the 48px tap floor, the board's
240px exception and the motion rule are `DESIGN.md` and `PRODUCT.md`; the verification story is
`SYSTEMS.md` and `README.md`.

## Consequences

- A child has one way forward, so finishing a lesson is the only way to see the next one.
- The course is data, and the map is derived from it: no coordinate table can place a stop where the
  graph does not open it.
- The coach's six bands (10, 40, 70, 150 and 300 centipawns lost), the 30-centipawn margin the drill
  check fails at, and `v1`'s rank ladder are kept verbatim, because they were measured rather than
  chosen.
- The badge book, the sound module and the daily puzzle are not promised by this decision; each needs
  its own record before it returns.
- The detour packs had no screen when the path landed, which is recorded in git history and fixed: the
  screen is `src/scenes/pack.js` now.
