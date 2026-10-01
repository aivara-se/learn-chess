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
| `src/path/layout.js` | where every stop stands: its x from the course's `requires` graph, its y from the road the painting draws |
| `src/map/road.js` | the painting's own size, and the road's centre down it, measured off the painting (§10) |
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
  `tiny` is for a specimen's own caption and for the words on a stop on the map, where
  the room is the layout's and a name, a row of stars and a line have to fit into it.
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
| `board/light.png`, `dark.png` | 64×64 | the board's squares — flat, a one-pixel speckle, tones `#d8d9db` and `#746865` out of the piece set's own palette |
| `pieces/<colour><piece>.png` | 36–43 wide, 61–99 tall | a piece is drawn at `k = square/64`, bottom-centred — taller than its square on purpose (the king is 41×99) |

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

`#/path` is the screen the game opens on, because it is where a learner starts: one
open stop, the rest of the course locked behind it, and Pip standing on the one they
are up to. The stops, the forks and the legs are the course's `requires` graph drawn.
`src/path/layout.js` derives the layout and `src/path/progress.js` says what state each
stop is in; the screen draws what those two return and decides nothing about the course
itself.

**The world is one painting, and it is the operator's.** `assets/map/world.jpg` is his own
artwork, shipped **exactly as he sent it** — mailed to `mama@aivara.se` as `Generated Image
September 30, 2026 - 10_30PM.jpg`, **1584×672, 1.06 MB**, JPEG — by his decision: not cut,
not quantised, not re-encoded. It is a smooth illustration rather than a pixel grid, and the
cover fit draws it at **0.86× to 1.00×** of its own pixels at every window shape the game is
played at, so it is drawn with smoothing on (`IMAGE` in `src/map/terrain.js`). The pieces go
the other way and set `nearest` in `src/board/pieces.js`, because they are pixel art
magnified: the filter follows the art, not the project. Its ratio is **2.357:1**
(1584 ÷ 672) and it is not **21:9 (2.333)**. Nothing in this repository may call it that.

**Edge to edge, and it pans sideways.** The painting is drawn at a **cover fit** — the
larger of `window/1584` and `window/672` — so it fills the window in both directions at
every window shape and nothing shows round it (`src/map/terrain.js`; `tests/map.test.ts`
holds it at the shapes the game is played at). Because no phone and no laptop is
2.353:1, a cover always leaves the world **wider than the pane**, and that is the pan:
the map is one container moved by a pointer drag and by the wheel, clamped to what there
is to pan in each direction, and the course is read left to right across it. The page
itself must not scroll — the canvas is the whole viewport, and the board screen that
follows keeps a fixed frame — so the gesture is a translated container rather than a
native scrollbar, which is the second rendering system this port exists to avoid. The
wheel is taken with `{ passive: false }`, and a wheel moves the world along x: a device
that sends its scroll as `deltaY` is what every horizontal map has to answer. The view
opens with the child's own stop in the middle of the window, clamped to what the world
has.

**A stop's place is derived, and it is derived from two things.** Its **x is its depth
in the `requires` graph** — the course read left to right, spread across the stretch of
the painting the road runs through (`SPAN` in `src/map/road.js`) — and its **y is where
the painting's road runs at that x**. No hand-placed coordinate: a lesson added to the
graph is placed by the graph, and `tests/path.test.ts` holds both halves of that rule
for every stop the course has.

**The road is measured off the painting, and the numbers are the record.**
`src/map/road.js` carries the road's centre as a share of the painting's height, at
every sixteenth of its width. It was traced by reading each column for the tan of
packed dirt, keeping the run nearest the column before it — a roof and a road are the
same brown, so continuity is what separates them — and then drawing the trace back onto
the painting and looking at it: it follows the road over the bridge and past the mill.

**On the painting that ships now, that reader does not work, and the numbers came from the
operator's own hand instead.** Re-run against the new painting it locked onto a 98px
plough field, a 75px patch of bare dirt and 2–4px fence slivers, and a tightened
road-shaped rule wandered by ±100px; packed dirt, a field, a fence line and a road are all
the same brown, and the new painting's road is also cut into pieces by the river and the
buildings. So he marked the road himself — flat `#FF0000`, edge to edge — and the table
above is read off that marking: the stroke is 28–44px wide on his 3168×1344 copy and stays
inside that band across the whole frame, which is what says one road was followed rather
than a field. The marking also showed the old table was wrong here by up to 0.44 of the
height — about 282px at a 640-tall window — because this painting's road runs diagonally.
The one place the trace climbs the roofs is the village, at `u` past about 0.88, where
the painting's street bends down behind the houses; the village street does run on to
about 0.95 and then the painting has gardens and no road at all, so the table — and the
span the stops stand on — ends at the last place the road is really there. A stop past
that table would be a stop standing on a roof.

| | |
|---|---|
| the world | the painting's own 640×272 grid, drawn at `max(window/640, window/272)` — the cover, which is what makes it edge to edge and what makes the pan real |
| a stop's x | `SPAN.from + step × depth`, where `step` is the span over the deepest lesson in the course — the course's own shape, never a coordinate |
| a stop's y | the road's centre at that x, times the scale, plus the stop's own offset — zero for a stop on the road |
| a fork | two branches, one above the road and one below, `FORK` apart: **48 screen px** each way. It is a screen measurement because what has to fit is a 72px marker and a 12px caption at every window, and a caption does not get smaller on a laptop. **No course uses it any more**: the operator's path is linear, and `scripts/verify-site.ts` fails a course that puts two lessons at one depth |
| a detour | half a step past the lesson that teaches it, on the road: a medallion beside the path, never a third branch of a fork. `scripts/verify-site.ts` fails a course with more than one lesson at one depth |
| a caption | as wide as its stop's room — the world's margin on one side, its far edge on the other, and half the distance to the nearest stop whose ground it shares; at most **348**, at least **60** |
| the chrome | the art's star banner in the window's top-right corner, and nothing else: the rank strip and the puzzle chip the port drew are not on this screen |

**A stop's marker is the art's** (`src/map/marker.js`): a lesson's shield 64×72, a
detour's medallion 48×54, a boss's crest 76×84 — 64 and 48 are the port's own two
widths and both are at or over the tap floor; the heights are the art's, and
`tests/map.test.ts` holds the layout's own table of those sizes to them. **The state of
a stop is a shape and a word**: the white chip and its tick for done, the glow for open,
the iron band and its padlock for locked, and a locked stop still writes the lesson that
opens it underneath, so nothing has to be told apart by a shade of grey. The open stop
still wears its own number, in ink on the glow (**12.12:1**). **The words hang on the
side the stop stands off the road** — a fork's two branches write outwards, so their
captions cannot meet in the middle, and a stop on the road writes below its marker —
and every word wears the art's parchment `#efdfbb` as a halo behind its glyphs
(**11.95:1**), which is what keeps them legible over a busy painting. The type is the
kit's tiny tier, 12px, at every width: a finger does not get smaller on a laptop and
neither does a caption.

**The route is a run of the art's beads** (16px, a detour's thread at 10, 22px spacing
unwalked and 12 walked so a walked leg's beads touch), each bead carrying its own dark
outline — measured by the art card at 15.3:1 on the brightest ground and 11.9:1 on the
darkest — so the shape says the state and the brightness agrees with it. The star row
under a stop is the art's gold star at 16px, one per drill, unearned ones ghosted. **The
vignette** is a dark fade in the art's outline ink (`#1d222b`, 0.5 at the edge, over the
last 72px) at the window's own sides, top and bottom; nothing there animates, and the
only thing on this screen that moves is the arrow over the stop the child is on, which
stops moving under `prefers-reduced-motion: reduce`.

**A tap is not a pan.** Pixi fires `pointertap` on whatever the finger lifted over,
however far it travelled, so the gesture sets a flag once the pointer has moved more
than 6px and a stop panned under a finger never counts as pressed. Six is small enough
that a pan begins at once and large enough that a shaky finger still taps. **A locked
stop is a door, not a wall**: it opens a sheet — the kit's card on a scrim, with the
raised button in front and the flat one for "not now" — that names the lesson which
opens it, and offers the button that walks there when that lesson is playable. The map's
stops and the sheet's buttons both report where they are, so a browser check taps a
control rather than its own guess at the pixels.

**What this card retired.** `terrain-meadow.png`, `terrain-pass.png` and
`terrain-ash.png` came out of `assets/map/`, `assets/manifest.json`, `ATTRIBUTION.md`
and this section in one commit, with their SVG source `assets/source/map/world.svg`,
because the world they composed is gone: there is one painting and no slice of it. The
rows went with them — 152px bands a stop's depth had to stay inside — and so did
`src/path/place.js`, whose whole job was to move a row down until the words under the
stop above it cleared. Captions cannot collide with a marker below them any more
because there is no "below": a fork's two branches write on opposite sides and a stop
on the road is the only thing at its own x. The rank strip and the solved chip left
this screen for the same reason the header did — with no column to size a bar against,
every word the map adds is a word written over the painting.

**The record of this art is `assets/manifest.json`, and it is checked.** 33 files,
**97 KB (98,937 bytes)** against the **500 KB** budget the map's own screen pays before
it can open — down from 336 KB, because the painting replaces 291 KB of terrain bands —
and `scripts/verify-site.ts` (§4) holds every entry to the bytes and the `sha256` it
records, fails a file under `assets/map/` the record does not name, and fails the whole
art past its budget. The screen draws thirteen of those files — the table in
`src/ui/assets.js` is the whole list of its sprites — and the rest are the props, which
no module in this tree names.

**The cache name is `learn-chess-v20`, and the change that took it is this one.** The
name has to move because the shell is served cache-first: a device that has played
before holds `src/scenes/path.js`, `src/path/layout.js`, `src/path/stop.js`,
`src/map/terrain.js` and `src/ui/assets.js` — every one of them changed here — and
re-fetches none of them without a new worker, so it would go on drawing three terrain
bands under a map that has one painting. The ladder, read off the branches rather than
from a paragraph
(`for br in $(git branch -r); do git show $br:sw.js | grep -m1 '^const CACHE'; done`),
stood at `v19` on `main` when this branch was cut — `#63` took it — and no branch held
`v20` or anything above it. A change to a file in `SHELL`, or to the list, takes the next
name in the same commit; [`docs/SYSTEM.md`](SYSTEM.md) §4 is the rule and what the
on-demand class costs.

**The map's own files, and who draws what.** `src/map/road.js` is the painting's size
and the road's course; `src/map/terrain.js` is the cover fit and the one sprite;
`src/map/route.js`, `src/map/marker.js`, `src/map/banner.js` and `src/map/edges.js` are
the trail, the markers, the counter and the vignette; `src/path/layout.js` is where
every stop stands and `src/scenes/path.js` composes them. `src/scenes/kit.js` remains
this kit's own route — and it is still not in `sw.js`'s `SHELL` list, which is a rule
rather than a deviation: an on-demand screen is fetched when it is first opened and
cached from then on, and [`docs/SYSTEM.md`](SYSTEM.md) §4 says what that costs.
