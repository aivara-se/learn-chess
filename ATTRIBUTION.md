# Attribution

What is in the art, where it came from, and what was done to it. Every shipped file is
either **CC0** or **generated for this project**, which is the rule decided in the licence
card: nothing here owes anybody a credit, nothing is share-alike, and a generated sprite
has no third-party terms at all. That is why the familiar Staunton `cburnett` set
(GPL-2.0+ / CC-BY-SA-3.0) is not here.

This file is provenance and courtesy, not an obligation. The unmodified archives of every
pack are in [`assets/source/`](assets/source/), and the file-by-file list is
[`assets/manifest.json`](assets/manifest.json).

## Packs

- **2D Chess Pack** — Screaming Brain Studios — **CC0** ("credit is appreciated, but never
  required") — <https://opengameart.org/content/2d-chess-pack>. The archive ships unmodified
  as `assets/source/chess-pack.zip` (it carries no licence file inside; the CC0 statement is
  the pack's page). Modified: the twelve pieces and the two board tiles are tight crops of
  the **top-down, _plastic_** renders (`Pieces/White/White - Plastic 1 128x128.png`,
  `Pieces/Black/Black - Plastic 1 128x128.png`, `Boards/Tops/Top - Plastic TD 512x520.png`),
  cut to the sprite's own bounds and, for the pieces, given a 3px contrasting rim so a piece
  reads against either square. Nothing else of the pack ships: the marble, wood, glass and
  isometric renders are not used.
- **Kenney UI Pack** — Kenney — **CC0** — <https://kenney.nl/assets/ui-pack>. The archive
  ships unmodified as `assets/source/kenney_ui-pack.zip`. Modified: none — twelve of the
  shipped UI images are byte-for-byte copies of pack members (the pack's *Blue* set for the
  interactive parts — including the tick, `PNG/Blue/Default/icon_checkmark.png` — *Grey*
  for the star outline and the progress track, and its one `Extra/Default/divider.png`).
  `assets/manifest.json` names the member each one came from.
- **Kenney Interface Sounds** — Kenney — **CC0** —
  <https://kenney.nl/assets/interface-sounds>. The archive ships unmodified as
  `assets/source/kenney_interface-sounds.zip`. Modified: none — the three shipped sounds are
  byte-for-byte copies of `drop_001.ogg` (a move), `confirmation_002.ogg` (a star) and
  `select_003.ogg` (a swoosh).
- **Kenney UI Audio** — Kenney — **CC0** — <https://kenney.nl/assets/ui-audio>. The archive
  ships unmodified as `assets/source/kenney_ui-audio.zip` and **nothing from it is used**:
  the three sounds above come from Interface Sounds, and this pack was downloaded as a
  candidate. It is kept so the archive matches what was actually collected.
- **Inter** — Rasmus Andersson — **OFL 1.1** — <https://rsms.me/inter/>. Shipped as the latin
  subset at `assets/fonts/inter-latin.woff2`, with the licence beside it in
  `assets/fonts/OFL-Inter.txt`. Not modified.
- **Space Grotesk** — Florian Karsten — **OFL 1.1** — <https://fonts.floriankarsten.com/space-grotesk>.
  Shipped as the latin subset at `assets/fonts/space-grotesk-latin.woff2`, with the licence
  beside it in `assets/fonts/OFL-SpaceGrotesk.txt`. Not modified.

## Generated for this project

No third-party terms, because there is no third party. The 1024×1024 originals were made
with an image generator and cut down to the size the game draws; the generator's raws are
not shipped, since the game never loads them.

- `assets/characters/pip.png` — Pip, the pawn who coaches. The old app's hand-drawn pawn,
  carried into the game as a sprite.
- `assets/ui/lock.png` — the mark on a lesson a learner has not unlocked yet.
- `assets/ui/rank-badge.png` — the badge beside a rank on the path.

## The lessons map (generated for this project)

`assets/map/**` is the world the path is drawn on: three terrain bands (meadow and village, the
rocky pass, the ash), twenty landmark props, the route's bead and its glow, the stop marker set
(a shield, a detour medallion, a pole and pennant, the done / open / locked overlays, the boss
crest, a gold star, the golden arrow) and the banner the star count is written on. It was **drawn
as vector art for this project** — an SVG per sprite, and one `world.svg` for the whole world,
in `assets/source/map/`. The PNGs are 2× exports of those sources, made in the authoring
session; the repository holds the SVG and the exported PNG, and no build step. The three
terrain bands are that one painting cut at three fixed rows, so the rows on either side of a cut
are the same bytes and a stitched map cannot show a seam. `assets/source/map/contact-sheet.png`
is the review aid that shows every sprite at the size the map draws it.

**The Kingdom Rush campaign map the operator sent as a reference was an inspiration only.** What
was taken from it is a composition — a journey read top to bottom from green to ash, a dotted
route that curves with the ground, markers on poles, earned stars under a stop, a count in a
banner, the contrast between a painted world and clean plastic chrome. No Ironhide Game Studio
asset is used, copied or traced: no icon, no shield design, no character, no castle, no logo, and
the screenshot itself is not in this repository or in any of its history. Every pixel shipped here
is this project's own, and the palette is the one in `docs/DESIGN.md` plus the map's own greens,
rocks and ash.

## From this repository's own earlier release

`assets/favicon.svg`, `assets/icon-180.png`, `assets/icon-192.png`, `assets/icon-512.png`,
`assets/icon-maskable-512.png` and `assets/share-card.png` are the files this site itself
published before the rebuild — taken unchanged from the `v1` tag, because the page still
names the addresses they live at. Their art is CC0 like the rest of the old course's
([`docs/PORT.md`](docs/PORT.md)).
