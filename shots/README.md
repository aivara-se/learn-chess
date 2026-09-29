# The chrome kit, as drawn

Evidence for the chrome card (`aivara-se/learn-chess#40`). This branch is `feat/chrome-kit` plus this
folder; the change itself is in the pull request, and nothing here is meant to be merged.

| file | what it is |
|---|---|
| `kit-phone-360x640.png` | `#/kit/phone` — the phone frame, taken 1:1, 360×640 |
| `kit-laptop-1280x800.png` | `#/kit/desktop` — the laptop frame at scale 1.5, 1280×800 |
| `kit-phone-zoom-buttons.png` | the buttons block at 2.5×, to read the labels and the disabled face |
| `kit-phone-zoom-chips.png` | the chips and the bar at 2.5× |
| `kit-phone-zoom-coach.png` | the card and the coach at 2.5× |
| `kit-check.ts` | the harness that produced them — scratch, run it from outside the tree |

## How to re-make them

```sh
# copy the harness out of the tree first; it is not a file the repo builds with
cp shots/kit-check.ts /tmp/kit-check.ts
cd <a checkout of this branch>
NODE_PATH=$HOME/.bun/install/global/node_modules bun /tmp/kit-check.ts . 8848
```

It serves the checkout over http (a module over `file://` is refused by the browser), loads a Chromium
that is already installed (`bun add -g playwright && bunx playwright install chromium`), opens each frame
at a 1400×900 viewport so both are drawn 1:1, and writes the screenshots to `/tmp/kit-shots`. It prints a
JSON report and exits non-zero if anything it asserts fails.

It reads the page through `window.learnChessKit`, which the scene publishes for exactly this: the frame it
drew and whether the kit fits inside it, every control's measured hit area and the point to tap, every
component's measured size, the coach's two text nodes, and whether the press animation is on. Nothing in
the harness guesses at a pixel.

## What the report said on this tree

```
phone    used 618 of 640  fits true    taps: live 1, disabled 0   voices separate   reduced motion: off
desktop  used 480 of 800  fits true    taps: live 1, disabled 0   voices separate
controls, phone    primary 118×48 · quiet 73×48 · round 48×48 · square 48×48 · disabled primary 289×48
controls, desktop  primary 180×72 · quiet 110×72 · round 72×72 · square 72×72 · disabled primary 441×72
no console error, no page error, no failed request, no response over 300
```

The labels are measured in the wide fallback font this sandbox resolves for `system-ui`; a real phone's
labels are narrower, so 618 of 640 is the pessimistic figure rather than the flattering one.
