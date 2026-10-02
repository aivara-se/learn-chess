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
  the pack's page) and **nothing from it is used**: the twelve pieces and the two board tiles
  were tight crops of its **top-down, _plastic_** renders (`Pieces/White/White - Plastic 1
  128x128.png`, `Pieces/Black/Black - Plastic 1 128x128.png`, `Boards/Tops/Top - Plastic TD
  512x520.png`) until the operator's own generated set replaced them; the marble, wood, glass
  and isometric renders were never used. It is kept so the archive matches what was actually
  collected.
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
- `assets/pieces/**` — the twelve chess pieces — and **every marker on the lessons map**:
  `assets/map/marker-tower-*.png` (the three lesson towers), `marker-pack-{mine,farm,cave}.png`
  (the places a detour wears), `marker-boss.png` (the crossed swords) and `marker-arrow.png`
  (the quest pin over the current stop). All of it comes from **one sheet the operator sent**,
  the generator's 3168×1344 set, shipped here as `assets/source/generated-set.png` (kept as
  provenance and deliberately not precached: 431 KB nothing loads). The pieces are the alpha it
  came with, cut to each piece's own bounds, box-downscaled to the size the game draws (the
  king lands 41×99, where the CC0 pack's king was 52×102) and quantised to one 32-colour palette
  for the whole set; all twelve are scaled by **one shared factor**, so a pawn is still a pawn
  beside a king. Each marker is cut to its own bounds and drawn on its own canvas standing on
  its base. Every sprite is exported at 2×.
- `assets/board/light.png`, `assets/board/dark.png` — the board's two squares, drawn for this
  project: flat 64×64 tiles with a one-pixel speckle, and both tones taken out of the piece
  set's own palette (`#d8d9db` and `#746865`) so the board cannot drift away from the pieces
  standing on it.

## The lessons map

`assets/map/**` is the world the path is drawn on: **one painting**
(`assets/map/world.jpg`), the route's bead and its glow, the stop marker set (the
lesson towers in their open / done / locked states, a detour medallion, the done /
open / locked overlays the medallion and the boss crest wear, the boss crest, a
gold star, the golden arrow) and the banner the star count is written on.

**The twenty landmark props are gone.** `assets/map/prop-*.png` — trees, rocks, the
hedgerow, the village, the bridge, the fence, the temple, the lava fissure, the ash and
the smoke — were still in the manifest and still precached, 33 KB every visitor
downloaded for nothing: no module had drawn one since the map became a single painting.
Their vector sources stay in `assets/source/map/` as provenance, and nothing ships from
them.

**The painting is the operator's own, supplied for this project and shipped as sent.**
`assets/map/world.jpg` is the file he mailed to `mama@aivara.se` — `Generated Image
September 30, 2026 - 10_30PM.jpg`, 1584×672, **1,110,084 bytes**, sha256
`d18509f674d57d97823b290c4768ee4e99ab84600d80e7ec97850ad2f6753e11` — committed
byte-for-byte and unmodified: not cut, not quantised, not re-encoded, by his decision. He
sent it, and holds whatever rights he has in it; it ships here on his word, for this game.
Its ratio is 2.357:1 (1584 ÷ 672) and it is not 21:9. He also sent a second copy with the
road painted flat `#FF0000`, and the road's course in `src/map/road.js` is read off that
marking — the marked copy itself is not in this repository.

**Everything else under `assets/map/` was drawn as vector art for this project** — an
SVG per sprite in `assets/source/map/`, exported to PNG at 2× in the authoring session;
the repository holds the SVG and the exported PNG, and no build step.
`assets/source/map/contact-sheet.png` is the review aid that shows every sprite at the
size the map draws it. Its first section still shows the three grounds the map was cut
into before it became one painting (`#64`), and it does not show `world.png`: it predates
the painting, so read its sprite sections against the tree and not its grounds. The
world's own vector source (`world.svg`) and the three terrain bands it was cut into went
when the map became one painting (`#64`): those bands are not in this repository any
more, because they are not in the game any more.

**The Kingdom Rush campaign map the operator sent as a reference was an inspiration
only.** What was taken from it is a composition — a journey the eye follows, a dotted
route that curves with the ground, markers on poles, earned stars under a stop, a count
in a banner, the contrast between a painted world and clean plastic chrome. No Ironhide
Game Studio asset is used, copied or traced: no icon, no shield design, no character, no
castle, no logo, and the screenshot itself is not in this repository or in any of its
history. Every pixel of the drawn art shipped here is this project's own, and the
palette is the one in `docs/DESIGN.md` plus the painting's own greens and browns.

## From this repository's own earlier release

`assets/favicon.svg`, `assets/icon-180.png`, `assets/icon-192.png`, `assets/icon-512.png`,
`assets/icon-maskable-512.png` and `assets/share-card.png` are the files this site itself
published before the rebuild — taken unchanged from the `v1` tag, because the page still
names the addresses they live at. Their art is CC0 like the rest of the old course's
([`docs/PORT.md`](docs/PORT.md)).
