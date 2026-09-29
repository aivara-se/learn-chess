# DESIGN.md — the game's chrome

What the game looks like, which values are fixed, and what was measured to fix them. Read it before
changing anything visual, and before building a screen: `#40` wrote it, `#41` and `#42` are written
against it, and a new value that is not in these tables does not ship.

The old `DESIGN.md` described a phone web app: a DOM, a tab bar, CSS. This one describes a 2D game drawn
on a canvas, and the parts it shares with the old document are the ones that were *measured* there and
still hold — the tap floor, the board's room, the motion rule. `docs/PORT.md` is the port contract and
`docs/SYSTEM.md` is how the tree is served.

## 1. What is here

| | |
|---|---|
| `src/ui/theme.js` | every colour, size and shape the kit draws with, and the measurement beside each one |
| `src/ui/assets.js` | the one place the sprite paths live; the loader every screen awaits |
| `src/ui/button.js` | a button: raised, quiet, round, square — and disabled |
| `src/ui/panel.js` | the card a screen is written on, and the pack's flat strip |
| `src/ui/chip.js` | a readout: a star count, a run, a rank, a state |
| `src/ui/progress.js` | the pack's track and fill, from a value the caller counted |
| `src/ui/speech.js` | the coach — two voices, two elements |
| `src/scenes/kit.js` | `#/kit`, `#/kit/phone`, `#/kit/desktop`: every component, at both sizes |
| `src/scenes/path.js` | `#/path`: the map a child walks, and the screen the game opens on (§10) |
| `src/path/layout.js` | where every stop stands, derived from the course's `requires` graph |
| `src/path/progress.js` | the child's record, the stars, the states and the rank |
| `src/path/stop.js` | one stop drawn: its state, its caption, its stars, Pip |
| `src/path/sheet.js` | what a tap on a door answers with |

A screen is still a file and a route (`docs/SYSTEM.md` §1). The kit is imported, not registered: there is
no index, so a new component is a new file and nothing else.

## 2. Colour — every pair measured, on the surface it is used on

The blue is not chosen. It is the Kenney UI pack's own blue, sampled out of the bytes of the shipped
sprites (`assets/ui/button.png`, `panel.png`, `round.png`, `star.png`), so a part the kit draws and a
part the pack draws cannot drift apart: `#36bdf7` is the highlight, `#34b9f2`→`#20a9e2` the raised
button's gradient, `#1c9fd7` the flat face and the star, `#167da8` the 1px rim, `#146587` the raised
button's bottom edge.

| token | value | on | measures |
|---|---|---|---|
| `ink` | `#182046` | the card | **15.74:1** |
| | | the ground `#eef3ff` | **14.17:1** |
| | | the raised face's mid-tone `#28afe9` | **6.30:1** |
| | | the flat face `#1c9fd7` | **5.24:1** |
| | | the disabled face `#dadce7` | **11.52:1** |
| `inkSoft` | `#454f72` | the card — body copy | **8.03:1** |
| `inkMute` | `#5f698a` | the card — the small print | **5.42:1** |
| `good` | `#0f7b46` | `goodSoft` `#e3f7ec` | **4.76:1** |
| `bad` | `#b8232b` | `badSoft` `#ffe9ea` | **5.46:1** |
| `warn` | `#8a5a00` | `warnSoft` `#fff4e0` | **5.44:1** |
| `mute` | `#b0b0ba` | the card — the rim of the disabled face | **2.15:1**, decorative |

**A button's label is ink, not white.** White on the pack's blue measures **3.00:1** — under AA for a
label at any size this kit draws — while ink on it measures 5.24:1 at the flat face and 6.30:1 in the
middle of the raised one. The pack is a light blue, and the honest label on it is dark.

**That is a change from `v1`, and it is the blue that changed, not the standard.** The old page's
`--primary` was the dark `#2f5fe0` and a white label on it measured 5.48:1 — the right pair for *that*
blue, and the old document said so. The port's faces are the pack's own light blue, where the same white
label measures 3.00:1. The label follows the face; the pair is measured either way.

**The two tones are surfaces, never signals.** A verdict's tone is a tinted face plus its own border, and
the verdict is a *word* ("Nice move", "Oops") in the same breath — nothing in the kit is carried by a
colour alone.

**The pack's own icons are not visible on the pack's own blue.** The pack's arrow (`arrow-east.png`) is
filled `#1c9fd7` with a `#167da8` rim; on the pack's blue faces that is **1.2:1** and **1.85:1** — the
same colour as what it sits on. So the kit draws its arrow and its tick in ink (`#182046` on the face,
5.24:1 or better). The pack's sprites stay in the tree for a surface they can be seen on. The chips do use
the pack's icons, on the light chip: the tick's own fill is 2.15:1 on the card but the pack draws it with
a `#146587` rim at **6.48:1**, and the star is `#1c9fd7` with a `#12729a` rim at **5.39:1** — the rim is
what makes the glyph legible, and the word beside it is `inkSoft` at 8.03:1.

## 3. Size — the ramp, the floor, the scale

- **The type ramp at scale 1**: body 17px (the old app's own comfortable line, and the starting point the
  chrome card names), label 17px, small 13.5px, tiny 12px. Nothing in the kit draws below `small`, and
  `tiny` is for a specimen's own caption.
- **48px is the floor for anything a child taps**, and it is enforced in the kit rather than remembered
  per screen: a button's height is `48 × scale`, its hit area is the same box, and a caller cannot ask for
  less — `scale()` clamps at 1. A caller that wants a smaller control wants a different control.
- **The scale** is a number a screen passes; 1 is the phone's, and 1.5 is the laptop's (`#/kit/desktop`
  draws the same kit at 1.5 in a 1280×800 frame). Type, padding and gaps all multiply by it, so the
  proportions hold at both.
- **The board is the one documented exception** and it is documented because it was measured: eight
  squares cannot be 48px each inside a 360px screen. The board takes what its screen has left
  (`--board-room`, in `docs/PORT.md`) down to a **240px floor** on a phone and 320px on a wide screen, and
  everything else gives way before it does.

### What the kit measures at scale 1, at 360 wide

From `#/kit/phone` (`window.learnChessKit`), headless Chromium, 1:1, the labels measured in the wide
fallback font this sandbox resolves for `system-ui` — a real phone's labels are narrower, never wider:

| component | measures |
|---|---|
| button, primary, "Continue" | 118×48 — 48 tall is the floor |
| button, quiet, "Hint" | 73×48 |
| button, round (the pack's circle and an ink arrow) | 48×48 |
| button, square (the pack's square and an ink tick) | 48×48 |
| button, disabled — "Show me — waiting for Pip" | 289×48 |
| chip, star + "9 first-try" | 129×30 |
| chip, tick + "4 in a row" | 133×30 |
| chip, rank badge + "Knight" | 109×30 |
| chip, padlock + "not yet" | 102×30 |
| progress bar with its caption | 332×41 |
| card, title and body | 332×82 |
| the coach, both voices | 332×101 |

The whole catalogue — five labelled blocks, every component and its states — is **618px tall in the
640px phone frame**, and that is a check, not a claim: `#/kit/phone` reports `content.fits`, and a check
that fails it fails the run. The phone frame is never scaled up, only down when a window is smaller than
it, so the sizes above are the sizes drawn.

## 4. The pack's sprites, and how they are cut

The nine-slice borders are not guessed — they are read off the alpha of each file: the pack's shapes have
a **4px corner radius** and a **1px rim**, so 6px of cap each side keeps the corner and the rim whole,
while 8px top and bottom keeps the raised face's top highlight and its darker bottom edge (the last rows
of `button.png` are `#146587`). The fill bar's pill is 16px tall with a 4px radius: 6px caps, draw it at
16.

| sprite | native | how it is used |
|---|---|---|
| `ui/button.png` | 192×64 | raised face, nine-sliced 6/6/8/8 |
| `ui/panel.png` | 192×64 | flat face and the pressed moment, same cut |
| `ui/button-square.png` | 64×64 | square face, same cut |
| `ui/button-round.png` | 64×64 | round face, drawn whole (a circle does not slice) |
| `ui/progress-track.png`, `progress-fill.png` | 16×16 | the bar, nine-sliced 6/6/6/6 |
| `ui/star.png`, `star-outline.png` | 64×60 | the chip and the path's empty star |
| `ui/lock.png`, `ui/rank-badge.png` | 96×96 | generated for this project; the locked chip and the rank chip |
| `ui/divider.png` | 64×4 | between the coach's two voices |
| `characters/pip.png` | 128×128 | the coach's avatar, drawn at 36 |
| `board/light.png`, `dark.png` | 64×64 | the board's squares |
| `pieces/<colour><piece>.png` | 46–52 wide, 70–102 tall | a piece is drawn at `k = square/64`, bottom-centred — taller than its square on purpose (the black king is 52×102) |

## 5. The components

- **A button** is one of four kinds — `primary` (raised), `quiet` (flat), `icon` (the round face), `square`
  (the square face) — and the *shape* says whether it is live: raised means pressable, flat means not. A
  press swaps the raised face for the flat one, which is the feedback a device that asks for less motion
  still gets.
- **A disabled button is grey, flat and silent.** It leaves the pack's blue for a drawn face in the pack's
  own two greys (`#dadce7` face, `#b0b0ba` rim), keeps the same silhouette, is not interactive at all
  (`eventMode: 'none'`, and a tap on it does nothing — a check taps one and asserts the handler did not
  fire), and **carries its reason in its own label**: `setDisabled(true, 'waiting for Pip')` draws "Show me
  — waiting for Pip". Disabling and the reason are one call on purpose — there is no way to grey a control
  out without writing down what a child is waiting for.
- **A chip** is a readout, not a control (`eventMode: 'none'`), and it says its state in words as well as
  in a tint — "not yet", "Knight" — because a child who cannot tell two greys apart still has to read it.
- **A panel** is a white card (drawn: the pack has no white panel, and the shadow is 2px of ink at 6%, not
  a blur, which would cost a render target per card on a phone) or the pack's flat strip for the one line a
  screen uses to say where you are. On the strip, body copy is ink, not `inkSoft`: `inkSoft` on the flat
  blue is only 2.67:1.
- **A bar is handed a value and a max and holds no total of its own.** At zero it draws the track and no
  fill; a nub would read as "a little" when the truth is "none".
- **The coach has two voices and they are two elements.** The bubble is Pip judging *your* move and it
  keeps what it said until you move again; the line under the divider is *what just happened* — his move,
  a threat, a check. They must never be one element: his reply used to be written into the bubble 332ms
  after every tap, so the grade was gone before a child could read it, and no styling fixes a sentence
  that has been overwritten. `handle.voices()` returns the two text nodes so a check can hold them and
  prove they are not the same one.
- **The kit is handed its numbers.** No component writes a course total down: a bar gets `value`/`max`, a
  chip gets its count, a screen that needs a total counts it off `src/data/lessons.js`
  (`scripts/verify-site.ts` fails a written total in `src/ui/**` and `src/scenes/**`).

## 6. What a screen may show at 360×640

640 is the whole screen, and a screen's chrome is not free: every pixel a screen adds above the board is a
smaller board, and the board is the only thing that gives way. The kit's own parts, measured above, are
what a screen's chrome is built from — a header line, a coach panel (101 tall), a row of controls (48), a
chip (30) — and the browser list in `docs/SYSTEM.md` §3 is still the check: at 360×640 nothing a child
needs may be below the fold, and the only thing that may be cut is the board, down to its 240px floor. A
screen that cannot fit says so by scrolling the one long thing on it — the course's own move record — and
never by hiding a control.

**Verified by looking, not by asserting:** `#/kit/phone` draws the whole kit in the frame and reports
`content.used`; the check runs at 1400×900 so the frame is drawn 1:1, takes a screenshot of each frame,
and a human looks at it. Automated checks do not prove a button is legible.

## 7. Motion

One movement in the kit — a pressed button dips to 0.97 for as long as the press lasts — and **off under
`prefers-reduced-motion: reduce`**, where the face swap alone carries the press. The board's own slide
(only the piece that just moved, 0.16s) is `docs/PORT.md`'s rule and the board card's to draw. Nothing in
the kit loops, and nothing moves while a child is thinking about their own move.

## 8. Accessibility

- Every text pair clears AA on the surface it is used on (§2), and every glyph the kit draws is ink on the
  face it sits on.
- Nothing is signalled by colour alone: a state is a word ("not yet", "waiting for Pip"), a shape (raised
  or flat) or both.
- `measure()` reports the *hit area*, not the label, because the hit area is what a finger gets, and
  `window.learnChessKit.points()` reports the centre of each one — so a browser check taps a control
  rather than its own guess at the pixels.
- The canvas is one node to a screen reader, so a control hands its name up: `spoken()` returns
  "Show me, waiting for Pip", and a screen passes it to the shell's live region (`#status` in
  `index.html`). A per-square name for the board is the board card's business and is not solved here.

## 9. What this card does not own

`src/board/**` (#39) owns the board and the pieces; `src/scenes/lesson.js` (#41) and `src/scenes/path.js`
(#42) own their screens; `sw.js` is nobody's here. `src/scenes/kit.js` is this card's own route and is the
page a reviewer looks at.

**`src/scenes/kit.js` is not in `sw.js`'s `SHELL` list**, and that is a deviation, written down rather than
hidden. The rule in `sw.js` is that a file the app needs to draw goes into its list in the same commit —
and `placeholder.js` is already there — but this card's `Do not touch` list names `sw.js`, so the list is
left alone and the cost is stated: a returning visitor's worker fetches `kit.js` from the network the
first time the route is asked for and caches it from then on (the fetch handler is cache-first and stores
what it fetches), so the route works offline after one online visit. **No file goes stale and no `CACHE`
bump is owed** — nothing already in `SHELL` changed. Two lines make it exact if a reviewer would rather
have it: `'src/scenes/kit.js'` in `SHELL`, and `CACHE` to a name no branch holds. It is not a screen a
learner reaches, so it is also the one route that could be dropped from the offline list on purpose.

## 10. The path — the map a child walks

`#/path` is `#42`'s screen and the one the game opens on, because it is where a learner starts: one open
stop, the rest of the course locked behind it, and Pip standing on the one they are up to. The stops, the
forks and the legs are the course's `requires` graph drawn. `src/path/layout.js` derives the layout and
`src/path/progress.js` says what state each stop is in; the screen draws what those two return and decides
nothing about the course itself.

| | |
|---|---|
| the map's column | `min(window, 520)` — the width the old document capped the board's column at, so a wider window gets margins rather than a stretched phone |
| a stop's circle | 64px, a detour's 48px — `docs/PORT.md`'s own two numbers, and 48 is the tap floor |
| the type | the kit's ramp at scale 1 at every width — title 13.5px (a detour's 12), the line under it 12px. A finger does not get smaller on a laptop, and neither does a caption |
| a caption's width | the space one column has between its neighbours — 105px at 360, 155px at 520 — so two captions can never touch |
| a row | 152px; the first stop stands 66px down, which is Pip's room rather than a margin |
| the map's height | the deepest stop plus its circle plus a 104px footing, or what was really drawn plus 16px, whichever is more — a caption can grow the map and none can be cut off by a constant |

**The state of a stop is a shape and a word, and the trail's shape is what says walked.** Done wears the
pack's tick on the white chip surface it is measured legible on (6.48:1, §2), open wears the pack's round
face with its own number in ink (**5.24:1**), locked wears the kit's grey disabled face with the padlock —
and the lesson that opens it is written underneath in every locked stop's caption, so nothing has to be
told apart by a shade of grey. A leg not walked is a line of dots, a leg that is a solid line; the colours
are the palette's (`mute` on the ground measures **1.94:1** and the walked `action` **2.7:1**, both
decorative pairs — the dotted/solid shape carries the meaning and the colour only agrees), and a detour's
thread is the same two at half the weight, from its lesson to the pack and nowhere else.

**The map scrolls and the header does not.** The path is taller than a phone (about 1,270px of map against
490px of window at 360×640), and the page must not scroll: the canvas is the whole viewport and the board
screen that follows this one keeps a fixed frame. So the map is one Pixi container moved by the pointer,
finger or wheel, clamped to what there is to scroll, and the header — the rank and the two counts — is
drawn over it on an opaque curtain that is interactive, so a stop sliding underneath cannot be tapped
through it. It is a drag and a wheel handler rather than a native scrollbar because a scrollbar means
putting the map in the DOM beside the canvas, which is the second rendering system this port exists to
avoid; a translated container is one system. The canvas already carries `touch-action: none`, so the
browser does not scroll the page under a finger; the wheel is therefore taken natively with
`{ passive: false }`, because the page must not scroll behind the game either.

**A tap is not a drag.** Pixi fires `pointertap` on whatever the finger lifted over, however far it
travelled, so the gesture sets a flag once the pointer has moved more than 6px and a stop that was scrolled
under a finger never counts as pressed. Six is small enough that a scroll begins at once and large enough
that a shaky finger still taps; `~/tmp/pw/path-check.ts` drags *over a stop* and asserts no sheet opened.

**A locked stop is a door, not a wall.** It opens a sheet — the kit's card on a scrim, with the raised
button in front and the flat one for "not now" — that names the lesson which opens it, and offers the
button that walks there when that lesson is playable. The map's stops and the sheet's buttons both report
where they are, so a browser check taps a control rather than its own guess at the pixels. Two things are
deliberately not this card's: the route a stop hands over (`#/lesson/<n>` for a lesson, `#/pack/<id>` for a
detour — `src/scenes/lesson.js` is `#41`'s, so the button lands on the shell's honest "no screen called
lesson" until it exists), and a per-square name for the board, which is the board card's business.

**The one deviation this section carries, and the single line that pays it.** `src/main.js` is in `sw.js`'s
`SHELL` list and this card changes it — the screen the game opens on becomes the path — so the rule at the
top of `sw.js` ("to a file in it bumps `CACHE` in the same commit") is owed and **not paid, because `sw.js`
is on this card's `Do not touch` list**. The consequence is measured from the fetch handler's own code
rather than guessed: the handler is cache-first and only ever writes to the cache on a **miss**, and a
browser only re-installs a worker when `sw.js`'s bytes change — so a visitor who already holds
`learn-chess-v15` keeps the cached, older `main.js` and its old default screen until `sw.js` changes
(`#/path` is still reachable by hash; the map just does not open by itself). `src/scenes/path.js`,
`src/path/**` and `src/ui/**` are the same on-demand class as `kit.js` and `src/board/**` — fetched once,
cached from then on — so they do not change that answer. The line that pays the debt is one, and the name
is read off the branches rather than taken from this paragraph:

```js
const CACHE = 'learn-chess-v17';   // v16 is the highest name any branch holds — `feat/board-and-pieces`
```
