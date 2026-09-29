/* The board's arithmetic: how big a square is, where a square sits on the
 * screen, which square is painted first, and which squares are the dark ones.
 *
 * There is no PixiJS in here on purpose. The two mappings that a renderer gets
 * wrong are facts `bun test` can hold still without a browser — the engine
 * numbers squares from a1 (0 = a1 … 63 = h8) while a screen numbers rows from
 * the top, and the whole board mirrors when it is drawn from Black's side — and
 * this app has already shipped that board upside down once. `AGENTS.md` writes
 * the rule out: the cell in row `row` and column `col` is square
 * `(7 - row) * 8 + col`, and `row * 8 + (7 - col)` when the board is flipped.
 *
 * `board.js` and `pieces.js` both read their geometry from here, so the squares
 * and the pieces cannot disagree about where e4 is.
 */
import { squareName } from '../engine/engine.js';

/* The board is square, and it is what gives way: a screen's chrome takes room
 * from the board, never the other way round. 240px across (`SQUARE_MIN` × 8) is
 * the floor PORT.md measures — eight 48px squares do not fit on a phone — and
 * 560px (`SQUARE_MAX` × 8) is the widest the old app ever drew one. */
export const SQUARE_MIN = 30;
export const SQUARE_MAX = 70;

/**
 * The side of one square, in whole pixels, for a board drawn in `room` pixels.
 *
 * The square is always even: a piece is anchored at the bottom *centre* of its
 * square, and an even square puts that centre on a whole pixel, so a piece is
 * never drawn between two of them.
 */
export function squareSize(room) {
  const fit = Math.floor(room / 8);
  const even = fit - (fit % 2);
  return Math.max(SQUARE_MIN, Math.min(even, SQUARE_MAX));
}

/**
 * Where a board of that size sits in a viewport, centred.
 *
 * `room` is the shorter of the space the board has been given — pass it when a
 * screen keeps a band for its own chrome, or the board takes the whole viewport.
 */
export function boardLayout({ width, height, room = Math.min(width, height) }) {
  const square = squareSize(room);
  const side = square * 8;
  return {
    square,
    side,
    left: Math.round((width - side) / 2),
    top: Math.round((height - side) / 2),
  };
}

/**
 * The cell a square is drawn in: `col` from the left of the board, `row` from
 * the top of it, both 0-based and both counting from White's corner unless the
 * board is flipped.
 */
export function cellOf(sq, flipped = false) {
  const rank = sq >> 3;
  const file = sq & 7;
  return flipped ? { row: rank, col: 7 - file } : { row: 7 - rank, col: file };
}

/** The square drawn in a cell — the direction `AGENTS.md` states, and the
 *  inverse of `cellOf`. */
export function squareOf(row, col, flipped = false) {
  return flipped ? row * 8 + (7 - col) : (7 - row) * 8 + col;
}

/** The top-left corner of a square, in viewport pixels. */
export function cornerOf(sq, layout, flipped = false) {
  const { row, col } = cellOf(sq, flipped);
  return {
    x: layout.left + col * layout.square,
    y: layout.top + row * layout.square,
  };
}

/**
 * The point a piece is placed at: the bottom centre of its square.
 *
 * The pieces are tight crops of the pack's 64px render and are taller than one
 * square — the king is 102px in a 64px square — so a piece stands *on* its
 * square with its body rising out of it, exactly as `assets/manifest.json`
 * records ("bottom-centred with its base on the square's bottom edge"). A piece
 * centred in its square would hang over the square in front of it.
 */
export function anchorOf(sq, layout, flipped = false) {
  const { x, y } = cornerOf(sq, layout, flipped);
  return { x: x + layout.square / 2, y: y + layout.square };
}

/** a1 and h8 are the dark ones — the colour belongs to the square, not to the
 *  cell it happens to be drawn in. */
export function isDarkSquare(sq) {
  return ((sq >> 3) + (sq & 7)) % 2 === 0;
}

/**
 * The order the pieces are painted in: the far rank first, so a piece standing
 * in front of another covers it the way a top-down game stacks. The file breaks
 * the tie and nothing else depends on it.
 */
export function paintOrder(sq, flipped = false) {
  const rank = sq >> 3;
  const file = sq & 7;
  return (flipped ? rank : 7 - rank) * 8 + file;
}

/** The letter that names file `file` (0 = the a-file). */
export function fileLabel(file) {
  return squareName(file)[0];
}

/** The number that names rank `rank` (0 = the first rank). */
export function rankLabel(rank) {
  return squareName(rank * 8)[1];
}
