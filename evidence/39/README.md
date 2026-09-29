# The board fixture, as rendered

Screenshots from the browser check that goes with `feat/board-and-pieces`, kept on
this branch because no bot repository here carries a screenshot directory and the
review should be able to see the pixels without re-running the check.

All of them come from one run of the checker, against the checkout served over
HTTP (never `file://`), in the Chromium that ships with the sandbox:

| File | Route | What it shows |
|---|---|---|
| `start-360x640.png` | `#/board-fixture/start` | the starting position on a phone-sized viewport: 32 pieces on their squares, a1 dark |
| `start-1280x800.png` | `#/board-fixture/start` | the same at a laptop size — the square is 70px and the board stops growing |
| `fork-360x640.png` | `#/board-fixture/fork` | the course's fork drill: the knight on d5 picked, ringed in the ink and the amber, with a dot on each square it can reach |
| `promotion-360x640.png` | `#/board-fixture/promotion` | a pawn picked on a **dark** square — the cream ink — and its target a8, a light square, carrying the dark ink's dot |
| `fork-black-360x640.png` | `#/board-fixture/fork/a1/black` | the same position drawn from Black's side |
| `walk-360x640.png` | `#/board-fixture/fork/a1` | after `learnChessBoard.walk('d5', 'f6')`: the knight has arrived on f6 |
| `start-reduced-motion.png` | `#/board-fixture/start`, `prefers-reduced-motion: reduce` | the caption says so, and nothing walks |

The images are the page, not the canvas, so the caption the fixture draws is part
of what was looked at.

Reproduce with the checker that produced them — it is not part of the repository,
it lives outside the tree so the tree stays clean:

```
bun run /root/tmp/board-check.ts
```

It serves the checkout on an ephemeral port, drives Chromium at 360×640, 1280×800
and once more under reduced motion, and prints one line per check. It exits
non-zero on the first failure and writes these screenshots into `/root/tmp/art`.
