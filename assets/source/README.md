# assets/source — the packs, as they came

The four archives here are the packs this game's art was chosen from, downloaded and left
**unmodified** so that every shipped file can be traced back to something a reader can open
and check. Terms, and what was done to each pack, are in
[`../../ATTRIBUTION.md`](../../ATTRIBUTION.md); the file-by-file list is
[`../manifest.json`](../manifest.json).

| archive | what it is | used for |
|---|---|---|
| `chess-pack.zip` | 2D Chess Pack, Screaming Brain Studios (CC0) | the pieces and the board tiles |
| `kenney_ui-pack.zip` | Kenney UI Pack (CC0) | the buttons, panels and the star |
| `kenney_interface-sounds.zip` | Kenney Interface Sounds (CC0) | the move, the star and the swoosh |
| `kenney_ui-audio.zip` | Kenney UI Audio (CC0) | collected as a candidate; nothing from it ships |

## Why these are not in `assets/manifest.json`

`assets/manifest.json` is the offline list: `sw.js` precaches exactly what it names. These
four archives are 22MB and the game never requests one of them, so listing them would put a
22MB download in front of a child's first screen — the one thing the assets card says must
not happen. They are shipped as provenance, and the manifest's `note` says so.

## What was built from them

- **The atlas** — `../pieces/` (twelve sprites, `<colour><piece>.png`), `../board/`
  (`light.png`, `dark.png`), `../ui/`, `../characters/`, `../audio/`.
- **The rule the sprites follow**, recorded in `../manifest.json`: a board square is 64
  native px; a piece sprite is a tight crop of the 2D Chess Pack's top-down *plastic* render
  with a 3px contrasting rim added, and the game draws it at `k = square / 64`, standing on
  the square bottom-centred with its base on the square's bottom edge.
- **How it was cut** — ImageMagick, driven by `sheet.ts` (Bun) in the build scratch, which
  is also the contact-sheet generator the card asked for to be rewritten from Python. It is
  not shipped here: the assets card's file list is `assets/**` and `ATTRIBUTION.md`, and a
  generator that shells out to ImageMagick would need a home in `scripts/` and a line in the
  structure map, which is the operator's to write.
