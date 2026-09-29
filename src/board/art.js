/* The board's art: which file a square and a piece are drawn from.
 *
 * Every path here is an entry in `assets/manifest.json` — the record of what the
 * site ships, that the offline worker precaches and that `ATTRIBUTION.md` gives
 * the terms for. The rule lives here rather than in twelve spellings of
 * `assets/pieces/…png` so there is one place to read and one place to change;
 * `tests/board.test.ts` fails when this file names anything the manifest does
 * not ship, so the two cannot drift apart.
 */

/** The two board tiles: one file per square colour, 64px each. */
export const BOARD_TILES = {
  light: 'assets/board/light.png',
  dark: 'assets/board/dark.png',
};

/** The sprite for a piece as the engine reports one — a colour `'w'` or `'b'`,
 *  and a type `'P'` … `'K'`, which is what `pieceAt` answers with. */
export function piecePath({ color, type }) {
  return `assets/pieces/${color}${type.toLowerCase()}.png`;
}
