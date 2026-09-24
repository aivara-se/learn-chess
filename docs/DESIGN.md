# DESIGN.md — the chess course

What every file is for, which values are fixed, and what was measured. Read it before changing
anything visual. The app is a sibling of the bot sites: it keeps the family ground and the
family type stack, and adds only what a board and a course need.

## Structure

```
index.html                 the app shell: markup and the stylesheet (one <style> block)
js/engine.js               rules, legal move generation, search, evaluation
js/lessons.js              the course: lesson text, diagram positions, drills
js/app.js                  the interface: board, coach, progress
assets/fonts/              Inter + Space Grotesk, latin subset, woff2, OFL 1.1
docs/                      DESIGN.md, PRODUCT.md, SYSTEM.md
scripts/verify-site.ts     the rules that can be checked mechanically
tests/engine.test.ts       perft and legality tests for the engine
```

No build step, no dependency, no request to any third party: the files are the app.

## Ground and type

The ground is the family gradient on a viewport-fixed layer over an opaque root, and the type is
the family stack (Space Grotesk for headings and the board's names, Inter for everything else),
both self-hosted. The values are the shared ones — see the template's own `DESIGN.md` for why
the gradient is painted on a fixed layer and why `body` must stay transparent.

Two deliberate departures from a bot site, both because this is a tool rather than an identity:

- **No bot accent.** A bot's hue says *who*. This page has no who, so interaction is
  white-on-dark: the selected square, the legal-move markers and the buttons are the text
  tiers, not a hue.
- **Two semantic colours**, `--good` `#9fe6a6` and `--bad` `#f2a2a2`, used only where they
  carry meaning: correct versus incorrect, and the message rule in the coach's log. They are
  never decoration, and the meaning is always also in words — "Correct", "Not the move" —
  so colour is never the only signal.

## Board

- Squares: light `#a2aac0`, dark `#6b7490`. Pieces are the solid Unicode glyphs for both
  sides, told apart by fill and outline: white `#f8fafc` with a `#0c0d1d` outline, black
  `#141726` with a `#ffffff` outline (a 1.2px text stroke plus a 1.5px shadow ring).
- Measured on both tones, so no piece depends on colour alone to be seen:

| Feature | On a light square | On a dark square |
|---|---|---|
| White piece outline `#0c0d1d` | 8.29:1 | 4.15:1 |
| Black piece body `#141726` | 7.67:1 | 3.83:1 |
| White piece body `#f8fafc` | 2.22:1 | 4.01:1 |
| Black piece outline `#ffffff` | 2.32:1 | 4.19:1 |
| Coordinate `#141726` / `#ffffff` | 6.98:1 | 4.64:1 |

  Each piece has at least one feature at 3:1 or better on each tone — the outline for white,
  the body for black — which is the whole reason both tones are mid-grey rather than the
  familiar cream and brown.
- State markers are double rings: a 3px `#0c0d1d` edge first, then the signal — white for the
  selected square, green for the move the coach suggests, red for the king in check. The dark
  edge is what keeps every one of them visible on both tones.
- Legal-move markers sit inside the square: a filled dot on an empty square, a ring around the
  piece that can be taken. The board is `aspect-ratio: 1` and `width: min(94vw, 460px)`, so it
  never causes sideways scroll on a phone.
- The board is a grid of 64 `button` elements: it is operable by keyboard, and each square
  carries the coordinates (`a`–`h`, `1`–`8`) as small on-square labels.

## Text tiers

Shared values, re-measured against this page. The panel here composites to `#121520`, so:

| Token | Hex | On the ground | On a panel |
|---|---|---|---|
| `--text` | `#e6edf3` | 16.29:1 | 15.40:1 |
| `--text-soft` | `#c9d1d9` | 12.47:1 | 11.79:1 |
| `--text-muted` | `#8b949e` | 6.26:1 | 5.92:1 |
| `--text-quiet` | `#8b93a1` | 6.22:1 | 5.88:1 |
| `--good` (as text) | `#9fe6a6` | — | 12.43:1 |
| `--bad` (as text) | `#f2a2a2` | — | 9.07:1 |

Every tier clears AA on both surfaces. `#6e7681` is not used anywhere: it fails AA on this
ground, and it is absent from the family's palette for that reason.

## Components

- **Mark** (favicon): `assets/favicon.svg` — four board squares in the two square tones with a
  white pawn in the top-left one. Inline SVG, no font, no request; it doubles as the browser tab
  icon.
- **Tab strip**: three pill buttons, `aria-selected` carries the state, the selected one is
  inverse (dark on `--text-soft`).
- **Card** (a lesson in the list): panel background, `#21262d` border, 12px radius, with a
  small uppercase label, the title in Space Grotesk, the goal, and how many of its positions
  are solved.
- **Panel**: the same card treatment, used for lesson text, the play controls and the stats.
- **Buttons**: `#1b2030` ground, `--text-soft` label (10.50:1), one `primary` variant in
  inverse.
- **Coach message**: a 2px left rule — `--good` when the move was good, `--bad` when it was
  not, `#3a4055` for neutral — a small uppercase label and the sentence.
- **Move list**: one line of Inter at 13px, muted.

## Motion

The only motion is the computer's short pause before it replies, and the brief square flash
after a drill answer. Both are removed under `prefers-reduced-motion: reduce`. Nothing moves
that does not have to.

## Accessibility

- Every text tier clears AA on both surfaces, and each board feature has a 3:1 contrast on
  both tones (tables above).
- The board is real buttons, so it is reachable and operable by keyboard; focus is a 2px
  `--text-soft` outline with a 2px offset.
- The coach's log and the puzzle log are `aria-live="polite"`, so a screen reader is told the
  verdict on a move. The verdict is always in words as well as colour.
- No information is carried by the board colour alone: whose move it is, whether it is check,
  and whether an answer was right are all also written in a sentence.
- Progress lives in the visitor's own browser (`localStorage`) and is never sent anywhere.
