# DESIGN.md — the chess course

What every file is for, which values are fixed, and what was measured. Read it before changing
anything visual.

This is a tool for children, not a bot's identity page, so it does **not** use the family's dark
ground or the one-accent-per-bot rule. It borrows the family's type stack and its discipline —
every value measured, every tier checked — and nothing else.

## Structure

```
index.html                 the app shell: markup and the stylesheet (one <style> block)
js/engine.js               rules, legal move generation, search, evaluation
js/lessons.js              the course: lesson text, diagram positions, drills
js/app.js                  the interface: screens, board, coach, stars
assets/fonts/              Inter + Space Grotesk, latin subset, woff2, OFL 1.1
assets/favicon.svg         the app mark
docs/                      DESIGN.md, PRODUCT.md, SYSTEM.md
scripts/verify-site.ts     the rules that can be checked mechanically
tests/engine.test.ts       perft and legality tests for the engine
```

No build step, no dependency, no request to any third party: the files are the app.

## The shell

The app is one screen tall, like a phone app rather than a web page:

- `.phone` is `height: 100dvh`, a flex column: app bar, scrolling `main`, bottom tab bar. The
  page itself never scrolls — `main` does — so the tab bar is always where the thumb expects it.
- `.appbar` carries Pip (an inline SVG pawn with a face), the name, and a star chip
  (`solved/total`).
- `.tabbar` is three tabs — Lessons, Play, Puzzles — each at least 48px tall with an icon and a
  label; the active one is a soft blue pill. `aria-selected` carries the state.
- Long answers arrive in a **bottom sheet** (`.sheet`) with one action button, not inline text:
  a child gets one thing to read and one thing to tap. The sheet comes with a full-bleed scrim, so
  it is plainly the thing to act on and nothing behind it is left half-covered; the scrim and the
  sheet appear and disappear together, and tapping the scrim closes it.
- Safe-area insets are respected at the top and bottom (`env(safe-area-inset-*)`), so it does not
  sit under a phone's notch or home bar.

## Colour

Bright, warm, and low-stakes: a pale blue ground, white cards with a soft shadow, and one blue
for actions. Values, and what each measures on the surface it is used on:

| Token | Hex | Used on | Contrast |
|---|---|---|---|
| `--ink` | `#182046` | on `#ffffff` / on `#eef3ff` | 15.74:1 / 14.17:1 |
| `--ink-soft` | `#454f72` | body text on white | 8.03:1 |
| `--ink-mute` | `#5f698a` | small print on white / on `#f6f8ff` | 5.42:1 / 5.11:1 |
| `--primary` | `#2f5fe0` | white label on it / its own text on `#e9efff` | 5.48:1 / 4.76:1 |
| `--good` | `#0f7b46` | on `#e3f7ec` | 4.76:1 |
| `--bad` | `#b8232b` | on `#ffe9ea` | 5.46:1 |

Every text pair clears AA. The two "verdict" colours are only ever used this way — as a tinted
sheet background with the matching dark text — and the verdict is always also a word ("Correct!",
"Not that one"), so colour is never the only signal.

## Board

- Squares: light `#f7e8c9` (cream) and dark `#8fc177` (green) — the friendly set children
  recognise, not the family greys.
- Pieces are the solid Unicode glyphs for both sides, told apart by fill and outline: white
  `#ffffff` with a `#2c2f4a` outline (1.4px stroke plus a 1.5px shadow ring), black `#34395a`
  with a `#ffffff` outline.

| Feature | On cream | On green |
|---|---|---|
| White piece outline `#2c2f4a` | 10.75:1 | 6.24:1 |
| Black piece body `#34395a` | 9.23:1 | 5.36:1 |
| White piece body `#ffffff` | 1.21:1 | 2.09:1 |
| Black piece outline `#ffffff` | 1.13:1 | 2.09:1 |
| Coords, markers, legal-move dots `#2c3350` | 10.22:1 | 5.93:1 |

  So a white piece is read by its dark outline and a black piece by its dark body; each has a
  feature at 5:1 or better on **both** tones. That is the only reason the outline is drawn at all —
  it is not decoration.
- The board is `width: 100%; max-width: 430px; aspect-ratio: 1`, inside a 4px white frame with a
  soft shadow, so it reads as a game board rather than a table.
- Every state marker opens with the same 4px dark frame, `#2c3350` — 10.22:1 on cream and 5.93:1
  on green — and puts its meaning inside it: yellow band for the piece you picked up (which also
  scales up 12%), green band where Pip suggests a move, red band on a king in check, and a
  green/red frame plus tint on the answer. The dark frame is why a marker is visible on both
  tones; without it the yellow measures 1.51:1 on cream and the green 2.55:1 on the green squares,
  which is there to be seen only because the frame is around it.
- The last move is a faint dark frame (2.2:1): supplementary, not load-bearing — the move list
  says the same thing in words.
- Legal targets are a solid dark dot on an empty square and a dark ring with a white inner gap
  around a piece that can be taken (10.22:1 on cream, 5.93:1 on green).
- Each square is a real `button`, and the files and ranks are printed in the corners in `#2c3350`:
  10.22:1 on cream, 5.93:1 on green — AA at 9.5px.

## Type and shape

Space Grotesk for headings and numbers, Inter for everything else — the family stack, self-hosted.
Body text is 16px, never smaller than 12px anywhere. Radii are generous (14–22px), buttons are
48px tall, and headings are short: one idea per screen.

## Motion

Three small movements, all removed under `prefers-reduced-motion: reduce`:

- the sheet sliding up from the bottom edge on a right answer,
- the piece scaling up when you pick it up,
- a short confetti drop (18 squares, 1.1s) on a correct answer or a win.

Nothing loops, nothing moves while a child is thinking, and no sound is played.

## Stars

A puzzle gives a **star** when it is solved on the first try, which is why the lesson list shows
two different numbers: how many puzzles are solved, and how many stars were earned. The star chip
in the app bar counts stars out of the 24 puzzles. Progress lives in `localStorage`, on the
visitor's own device, and is never sent anywhere.

## Accessibility

- Every text tier clears AA on the surface it is used on (table above); every board feature has a
  3:1 contrast on both square tones.
- The board is buttons, so it is operable by keyboard; focus is a 3px violet outline with a 2px
  offset.
- The coach's bubble and a visually hidden live region (`#live`) announce every verdict, so a
  screen reader hears the same feedback a child reads.
- Nothing is carried by colour alone: turns, check, verdicts and stars all appear as words or
  numbers too.
- Tap targets are at least 48px; nothing important sits within 8px of a screen edge.
