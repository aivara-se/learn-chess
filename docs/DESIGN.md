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
| | | the map's glow `#ffdf88` — the number the open stop wears | **12.12:1** |
| | | the art's parchment `#efdfbb` — the halo behind every caption on the map | **11.95:1** |
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

**Two pairs are the map's, and both are the app's own ink on the art's own colour.** The number the
open stop wears is drawn over the art's glow — `#182046` on `#ffdf88`, the glow's own centre pixel read
out of `assets/map/marker-state-open.png`, **12.12:1** — and every word under a stop on the map is that
same ink with the art's parchment `#efdfbb` around it, **11.95:1**. That is the two-tone rule of the
table above applied to a painting rather than to a card, and the halo's own edge against each ground is
measured in §10. Both pairs were measured on the rendered map for `#54`: the parchment and the ink are
both in a 360×640 screenshot's own histogram, which is how a vision read that called the captions *white
with a dark outline* was settled — the pixels say ink on parchment, twice now.

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
(#42) own their screens. `src/scenes/kit.js` is this card's own route and is the page a reviewer looks at.

**`src/scenes/kit.js` is not in `sw.js`'s `SHELL` list, and that is now a rule rather than a deviation.**
`SHELL` is the first frame's closure: the files the game needs to boot and to draw the screen it opens
on, and `scripts/verify-shell.ts` fails the tree when the list does not name that screen or is not closed
under its own imports. A screen the router imports on demand — `#/kit`, `#/lesson/1`, `#/board-fixture/*`
— is fetched when it is first opened and cached from then on. What that costs, and why the list is not
simply "every screen", is [`docs/SYSTEM.md`](SYSTEM.md) §4. Until #43 this section was a deviation note,
written because this card's `Do not touch` list named `sw.js`: the list still held the shell's deleted
`placeholder.js` and named none of the files the game actually opens on, which is how a returning
visitor's browser met *"There is no screen called `path`"* with the network off.

## 10. The path — the map a child walks

`#/path` is `#42`'s screen and the one the game opens on, because it is where a learner starts: one open
stop, the rest of the course locked behind it, and Pip standing on the one they are up to. The stops, the
forks and the legs are the course's `requires` graph drawn. `src/path/layout.js` derives the layout and
`src/path/progress.js` says what state each stop is in; the screen draws what those two return and decides
nothing about the course itself.

| | |
|---|---|
| the map's column | `min(window, 520)` — the width the old document capped the board's column at, so a wider window gets margins rather than a stretched phone |
| a stop's marker | the art's (`src/map/marker.js`): a lesson's shield 64×72, a detour's medallion 48×54, a boss's crest 76×84 — 64 and 48 are the port's own two widths and 48 is the tap floor; the heights are the art's |
| the type | the kit's ramp at scale 1 at every width — title 13.5px (a detour's 12), the line under it 12px. A finger does not get smaller on a laptop, and neither does a caption |
| a caption's width | the space one column has between its neighbours — 105px at 360, 155px at 520 — so two captions can never touch |
| a row | 152px; the first stop stands 66px down, which is Pip's room rather than a margin |
| the map's height | the deepest stop plus its marker plus a 104px footing, what was really drawn plus 16px, or the painting's own 1280px, whichever is more — a caption can grow the map and none can be cut off by a constant, and the ground is never short of the last thing drawn on it |

**The state of a stop is a shape and a word, and the trail's shape is what says walked.** The marker set is
the art's (`src/map/marker.js`): a lesson wears a heraldic shield on a pole, a detour a medallion with the dotted ring
around it, a boss stop the crest, and each carries one overlay per state — the white chip and its tick for
done, the glow for open, the iron band and its padlock for locked. A locked stop still writes the lesson
that opens it underneath, so nothing has to be told apart by a shade of grey; the open stop still wears its
own number, in ink on the glow the art draws (**12.12:1**). A leg is a run of the art's beads: a leg not
walked is a sparse run, a leg walked is a close-set one whose beads touch, and the bead carries its own dark
outline — measured by the art card at 15.3:1 on the brightest ground and 11.9:1 on the darkest — so the
shape says the state and the brightness agrees with it. A detour's thread is the same bead at half the
weight. The words under a stop are the app's ink with the art's parchment `#efdfbb` drawn as a halo behind
every glyph (**11.95:1**), which is what keeps them legible on grass, snow and ash alike; the halo's own
edge against the painting runs from 12.94:1 against the ash's median ground up to 4.58:1 at its 95th
percentile, and it is softest where the ground is mid-tone (3.47:1 at the pass's median grey, where the ink
alone measures the same 3.47:1) — the words are the app's text on the app's parchment, not a shape read off
the ground. The measurements this paragraph quotes, and the two pairs that are new with the art, are in
§2 with the rest of the measured pairs.

**The ground is one painting cut into three regions, and a stop's region is its depth in the course.**
The painting is a single 520×1280 world (`assets/source/map/world.svg`), exported at 2× and cut at two
fixed rows into the three bands the map draws: **the meadow and its village** (y 0–446, rows 0–2), **the
rocky pass and its peaks** (y 446–890, rows 3–5) and **the dark end, the ash and the lava** (y 890–1280,
rows 6–7). A stop's row is `66 + 152·depth` — its depth in the `requires` graph, which is what
`src/path/layout.js` derives and `scripts/verify-site.ts` checks — so the region a stop stands in is a
fact about the course rather than a coordinate: green first, hostile last, and the fall of the ground
*is* the difficulty curve. `src/map/terrain.js` places each band where the painting was cut and never
wraps one against a row, and the one place a row and a region disagree is deliberate, drawn and
recorded: `finish-it` and `italian` share row 5, the ash front is a diagonal with a slow wave, and the
painting puts the left branch on char and the right on rock. `tests/map.test.ts` walks every stop the
layout places and asks whether the row it stands at falls in the band its region names.

**Why the map is painted and the board is plastic.** The board's squares and pieces are the 2D Chess
Pack's own top-down *plastic* render, cut to each sprite's bounds with a 3px rim (§4); the map is vector
art drawn for this project. The split is the subject: a chess board is an object a child reads the
pieces off, and plastic keeps a piece legible against either square at 64px — while the path is a
*place*, and a place has to read as one from a glance at the ground. The journey from green to ash is
the whole of what the map says before a word is read, and a tile set carries no such journey. The
composition came from the reference the operator sent (a journey read top to bottom, a route that
curves, markers on poles, earned stars under a stop, a count in a banner); `ATTRIBUTION.md` records that
nothing of it is used, and every pixel of the map is this project's own.

**The map's own art, as the numbers stand since #54.** Each band is the painting's own slice, placed where
it was cut: 520×446, 520×444, 520×390, drawn at the column's width and left at the height it was painted
against, so the seams are the painting's and no band is stretched to a row. The route is the art's bead at
16px (a detour's thread at 10), spaced 12px walked and 22px not (8 and 15 for a thread), with the glow under
each walked bead at 34px. The star counter is the art's banner at the top-right of the map's column, 360×78
at its own size, carrying the two numbers `src/path/progress.js` derives. The star row under a stop is the
art's gold star at 22px, one per drill, unearned ones ghosted rather than drawn in a second colour. The
edges are a dark vignette in the art's outline ink (`#1d222b`, 0.5 at the edge, over the last 72px), drawn
at the map's own sides and the window's own top and bottom; nothing there animates, and the only thing on
this map that moves is the arrow on the stop the child is on, which stops moving under
`prefers-reduced-motion: reduce`.

**The record of this art is `assets/manifest.json`, and it is checked.** 35 files, **344,274 bytes
(336 KB)** against the **500 KB** budget the map's own screen pays before it can open — the three bands
are 297,985 of those bytes — and `scripts/verify-site.ts` (§4) holds every entry to the bytes and the
`sha256` it records, fails a file under `assets/map/` the record does not name, and fails the whole art
past its budget. The screen draws fifteen of those files — the table in `src/ui/assets.js` is the whole
list of its sprites — and the other twenty are the props, which no module in this tree names. What that
costs the precache is measured on `#54`; nothing here decides it.

**The map scrolls and the header does not.** The path is taller than a phone (the painting is 1,280px
against 409px of window at 360×640 — measured in the browser, and the header grew when the star counter
moved onto the map's own banner), and the page must not scroll: the canvas is the whole viewport and the board
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
where they are, so a browser check taps a control rather than its own guess at the pixels. A per-square
name for the board is the board card's business and is not solved here.

**The cache name is `learn-chess-v17`, and the change that took it is `#43`'s — the one this paragraph
used to argue was not owed.** The argument was true as far as it went: the map's commits touch
`src/scenes/path.js`, `src/path/**`, `src/ui/**` and `src/map/**`, none of which was in `SHELL`, and
nothing already in `SHELL` had changed since the board card's `v15` → `v16`. But that was a description of
the bug rather than a reason the name was free: **the files the map is drawn from are the files the game
opens on**, and a `SHELL` that does not name them leaves the offline game broken — a visitor who loaded it
once had `index.html` and `src/main.js` in the precache and nothing else, and the router answered *"There
is no screen called `path`"* on the next load with no network. `#43` puts the screen the game opens on and
its closure into `SHELL`, deletes the placeholder screen the list still named, takes the next name nobody
holds, and puts both rules into `scripts/verify-shell.ts` so the list cannot go stale again. The ladder,
read off the branches rather than from a paragraph
(`for br in $(git branch -r); do git show $br:sw.js | grep -m1 '^const CACHE'; done`), stood at `v16` on
`main` and on every other branch at `v16` or below, so `v17` was the name nobody held. A change to a file
in `SHELL`, or to the list, takes the next name in the same commit; [`docs/SYSTEM.md`](SYSTEM.md) §4 is the
rule and what the on-demand class costs.
