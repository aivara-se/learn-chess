/* Which square a tap landed on.
 *
 * The board is drawn and the pieces are placed from `src/board/geometry.js`, and
 * this is the inverse of that one mapping — the operation `AGENTS.md` writes out
 * in full because this app has already shipped a board upside down: the cell in
 * row `row` and column `col` is square `(7 - row) * 8 + col`, and
 * `row * 8 + (7 - col)` when the board is flipped.
 *
 * It is a module of its own, with no PixiJS in it, for the same reason the
 * geometry is: a renderer that maps a tap two pixels off is a renderer that
 * plays the wrong move, and `tests/lesson.test.ts` can ask this one question
 * without a browser — every square tapped at its own centre comes back as
 * itself, in both orientations.
 */
import { squareOf } from '../board/geometry.js';

/** The square under a point in the board's own coordinates, or `null` for a
 *  point outside it. `layout` is what `board.place()` returned. */
export function squareAt(point, layout, flipped = false) {
  if (!layout?.square) return null;
  const col = Math.floor((point.x - layout.left) / layout.square);
  const row = Math.floor((point.y - layout.top) / layout.square);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return squareOf(row, col, !!flipped);
}
