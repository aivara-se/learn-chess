# DRILLS.md — what the course was measured against

Every drill in `js/lessons.js` — the course's and the packs' alike — is checked
against an engine, and this is the record of that run. It is generated, not
written by hand:

```bash
bun run scripts/verify-drills.ts --write
```

Engine: Stockfish 17.1. One thread, hash 16, MultiPV 6, depth 18, a fresh engine
process per position. Scores are centipawns from the side to move's point of view
(#n = a mate in n). "behind" is how far a move is from the engine's own top move.

The check fails when a `best` is more than 30 centipawns behind the top move, when the
sheet would reveal a move the board rejects, or when an `accepted` list keeps a move
that far behind. A drill may carry a `note` when its list is deliberately not the
margin-derived set — a level position, or a lesson about a rule rather than a win.
Those notes are the last section of this file, and they are the only findings that do
not fail a run.

| drill | side to move | engine top | top | recorded `best` | best | behind | accepted |
|---|---|---|---|---|---|---|---|
| `board-and-pieces#1` | white | `d4e6` | 0 | `d4e6` | 0 | 0 | `d4e6` |
| `board-and-pieces#2` | white | `e4d5` | 697 | `e4d5` | 697 | 0 | `e4d5` |
| `board-and-pieces#3` | white | `f3d4` | 760 | `f3d4` | 760 | 0 | `f3d4` |
| `board-and-pieces#4` | white | `c4a6` | 32 | `c4d5` | 27 | 5 | `c4d5` |
| `piece-values#1` | white | `c3b5` | 608 | `c3b5` | 608 | 0 | `c3b5` |
| `piece-values#2` | white | `c3d4` | 357 | `c3d4` | 357 | 0 | `c3d4` |
| `piece-values#3` | white | `f3e5` | 180 | `f3e5` | 180 | 0 | `f3e5` |
| `centre-pawns#1` | white | `d2d4` | 2 | `d2d4` | 2 | 0 | `d2d4` |
| `centre-pawns#2` | white | `e4d5` | 517 | `e4d5` | 517 | 0 | `e4d5` |
| `centre-pawns#3` | white | `d4c5` | 556 | `d4c5` | 556 | 0 | `d4c5` |
| `develop#1` | white | `g1f3` | 158 | `g1f3` | 158 | 0 | `g1f3` |
| `develop#2` | white | `f1b5` | 374 | `f1b5` | 374 | 0 | `f1b5` |
| `develop#3` | white | `b1c3` | 423 | `b1c3` | 423 | 0 | `b1c3` |
| `castle-early#1` | white | `c3a4` | 21 | `e1g1` | 19 | 2 | `e1g1` |
| `castle-early#2` | white | `e1g1` | -41 | `e1g1` | -41 | 0 | `e1g1` |
| `castle-early#3` | black | `e8g8` | 4 | `e8g8` | 4 | 0 | `e8g8` |
| `queen-early#1` | white | `f3h4` | 676 | `f3h4` | 676 | 0 | `f3h4` |
| `queen-early#2` | white | `b5c7` | 40 | `b5c7` | 40 | 0 | `b5c7` |
| `queen-early#3` | white | `c3d4` | 197 | `c3d4` | 197 | 0 | `c3d4` |
| `look-first#1` | white | `c1c5` | 491 | `c1c5` | 491 | 0 | `c1c5` |
| `look-first#2` | white | `d4e5` | 511 | `d4e5` | 511 | 0 | `d4e5` |
| `look-first#3` | white | `e1e2` | 2 | `e1e2` | 2 | 0 | `e1e2` |
| `look-first#4` | white | `h5f7` | 99999 | `h5f7` | 99999 | 0 | `h5f7` |
| `look-first#5` | white | `a1a8` | 99999 | `a1a8` | 99999 | 0 | `a1a8` |
| `finish-it#1` | white | `a1a4` | 99992 | `a1a4` | 99992 | 0 | `a1a4` |
| `finish-it#2` | white | `g6d3` | 99996 | `g6d3` | 99996 | 0 | `g6d3` |
| `finish-it#3` | white | `b1b7` | 99999 | `b1b7` | 99999 | 0 | `b1b7` |
| `italian#1` | white | `c2c3` | -6 | `c2c3` | -6 | 0 | `c2c3` |
| `italian#2` | white | `d2d4` | 4 | `d2d4` | 4 | 0 | `d2d4` |
| `italian#3` | black | `f6e4` | 48 | `f6e4` | 48 | 0 | `f6e4` |
| `mate-in-one#1` | white | `d1d8` | 99999 | `d1d8` | 99999 | 0 | `d1d8` |
| `mate-in-one#2` | white | `a1g7` | 99999 | `a1g7` | 99999 | 0 | `a1g7` |
| `mate-in-one#3` | white | `g5f7` | 99999 | `g5f7` | 99999 | 0 | `g5f7` |
| `mate-in-one#4` | white | `d1d8` | 99999 | `d1d8` | 99999 | 0 | `d1d8` |
| `mate-in-one#5` | white | `a2g2` | 99999 | `a2g2` | 99999 | 0 | `a2g2` |
| `fork#1` | white | `d5f6` | 518 | `d5f6` | 518 | 0 | `d5f6` |
| `fork#2` | white | `c6e7` | 533 | `c6e7` | 533 | 0 | `c6e7` |
| `fork#3` | white | `b4c6` | 37 | `b4c6` | 37 | 0 | `b4c6` |
| `pin#1` | white | `d4d5` | 539 | `d4d5` | 539 | 0 | `d4d5` |
| `pin#2` | white | `b5c6` | 454 | `b5c6` | 454 | 0 | `b5c6` |
| `pin#3` | white | `b4c6` | 535 | `b4c6` | 535 | 0 | `b4c6` |
| `back-rank#1` | white | `e1e8` | 99999 | `e1e8` | 99999 | 0 | `e1e8` |
| `back-rank#2` | white | `e1e8` | 99999 | `e1e8` | 99999 | 0 | `e1e8` |
| `back-rank#3` | white | `d1d8` | 99999 | `d1d8` | 99999 | 0 | `d1d8` |

## Notes

- `castle-early#1` — the position is level, so the drill accepts only the king-safety move
- `castle-early#3` — the position is level, so the drill accepts only the king-safety move
- `finish-it#1` — the position is won by many moves, so the drill accepts only the move that fences the king off the fourth rank
- `finish-it#2` — the position is won by many moves, so the drill accepts only the queen move a knight jump from his king
- `pin#3` — White is already a piece up, so the engine's own margin also keeps quiet moves; the drill asks for the pin's consequence.
