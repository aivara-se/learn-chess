/* The board's own rules — run with `bun test`.
 *
 * The board is drawn from the engine's numbering (0 = a1 … 63 = h8) into a
 * screen's (rows from the top), and this app has already shipped that board
 * upside down once, so the corners and the two orientations are asserted here
 * rather than looked at. The rest is the arithmetic a layout is made of — the
 * size of a square, where the board lands, the point a piece stands on, the
 * order the pieces are painted in — and the art: every file the board names has
 * to be one the site actually ships.
 */
import { describe, expect, test } from 'bun:test';
import { parseSquare } from '../src/engine/engine.js';
import {
  SQUARE_MAX,
  SQUARE_MIN,
  anchorOf,
  boardLayout,
  cellOf,
  cornerOf,
  fileLabel,
  isDarkSquare,
  paintOrder,
  rankLabel,
  squareOf,
  squareSize,
} from '../src/board/geometry.js';
import { BOARD_TILES, piecePath } from '../src/board/art.js';

const A1 = parseSquare('a1');
const H1 = parseSquare('h1');
const A8 = parseSquare('a8');
const H8 = parseSquare('h8');

const LAYOUT = { square: 42, side: 336, left: 12, top: 152 };

describe('the size of a square', () => {
  test('is whole, even, and inside the floor and the cap', () => {
    for (const room of [100, 240, 320, 344, 559, 560, 1200, 4000]) {
      const square = squareSize(room);
      expect(square % 2).toBe(0);
      expect(square).toBeGreaterThanOrEqual(SQUARE_MIN);
      expect(square).toBeLessThanOrEqual(SQUARE_MAX);
    }
  });

  test('is what the room has, down to the floor and up to the cap', () => {
    expect(squareSize(344)).toBe(42); // a phone held upright, less the margin around the board
    expect(squareSize(SQUARE_MIN * 8 - 1)).toBe(SQUARE_MIN);
    expect(squareSize(SQUARE_MAX * 8 + 1000)).toBe(SQUARE_MAX);
  });
});

describe('the layout', () => {
  test('centres the board in the viewport it was given, in whole pixels', () => {
    expect(boardLayout({ width: 360, height: 640, room: 344 })).toEqual({
      square: 42,
      side: 336,
      left: 12,
      top: 152,
    });
    expect(boardLayout({ width: 1280, height: 800, room: 706 })).toEqual({
      square: SQUARE_MAX,
      side: 560,
      left: 360,
      top: 120,
    });
  });
});

describe('the square a cell holds', () => {
  test('puts White at the bottom of the screen when the board is not flipped', () => {
    expect(squareOf(7, 0)).toBe(A1);
    expect(squareOf(7, 7)).toBe(H1);
    expect(squareOf(0, 0)).toBe(A8);
    expect(squareOf(0, 7)).toBe(H8);
  });

  test('turns the board a half turn when it is drawn from Black’s side', () => {
    expect(squareOf(0, 0, true)).toBe(H1);
    expect(squareOf(0, 7, true)).toBe(A1);
    expect(squareOf(7, 0, true)).toBe(H8);
    expect(squareOf(7, 7, true)).toBe(A8);
  });

  test('and the cell of a square is the way back, both ways round', () => {
    for (const flipped of [false, true]) {
      for (let sq = 0; sq < 64; sq += 1) {
        const { row, col } = cellOf(sq, flipped);
        expect(squareOf(row, col, flipped)).toBe(sq);
      }
    }
  });

  test('keeps a1 and h8 dark and h1 and a8 light, whichever way the board faces', () => {
    /* The colour belongs to the square, not to the cell it is drawn in — and a
     * half turn moves a1 to the far corner without turning a1 light. */
    expect(isDarkSquare(A1)).toBe(true);
    expect(isDarkSquare(H8)).toBe(true);
    expect(isDarkSquare(H1)).toBe(false);
    expect(isDarkSquare(A8)).toBe(false);
  });
});

describe('where a piece stands', () => {
  test('on the bottom centre of its square', () => {
    expect(cornerOf(A1, LAYOUT)).toEqual({ x: 12, y: 152 + 7 * 42 });
    expect(anchorOf(A1, LAYOUT)).toEqual({ x: 12 + 21, y: 152 + 8 * 42 });
    expect(anchorOf(H8, LAYOUT)).toEqual({ x: 12 + 7 * 42 + 21, y: 152 + 42 });
  });

  test('on whole pixels for every square, whichever way the board faces', () => {
    for (const flipped of [false, true]) {
      for (let sq = 0; sq < 64; sq += 1) {
        const { x, y } = anchorOf(sq, LAYOUT, flipped);
        expect(Number.isInteger(x)).toBe(true);
        expect(Number.isInteger(y)).toBe(true);
      }
    }
  });
});

describe('the order the pieces are painted in', () => {
  test('draws the far rank first, so a piece in front covers the one behind it', () => {
    expect(paintOrder(A8)).toBeLessThan(paintOrder(A1));
    expect(paintOrder(H8)).toBeLessThan(paintOrder(H1));
  });

  test('turns round with the board', () => {
    expect(paintOrder(A1, true)).toBeLessThan(paintOrder(A8, true));
    expect(paintOrder(H1, true)).toBeLessThan(paintOrder(H8, true));
  });

  test('gives each of the sixty-four squares an order of its own', () => {
    for (const flipped of [false, true]) {
      const orders = new Set(Array.from({ length: 64 }, (_, sq) => paintOrder(sq, flipped)));
      expect(orders.size).toBe(64);
    }
  });
});

describe('the labels', () => {
  test('name the files and the ranks the way a chessboard does', () => {
    expect(Array.from({ length: 8 }, (_, file) => fileLabel(file)).join('')).toBe('abcdefgh');
    expect(Array.from({ length: 8 }, (_, rank) => rankLabel(rank)).join('')).toBe('12345678');
  });
});

describe('the art the board names', () => {
  test('derives a sprite from the piece the engine reports', () => {
    expect(piecePath({ color: 'w', type: 'P' })).toBe('assets/pieces/wp.png');
    expect(piecePath({ color: 'b', type: 'Q' })).toBe('assets/pieces/bq.png');
  });

  test('names nothing the manifest does not ship', async () => {
    const manifest = await Bun.file(new URL('../assets/manifest.json', import.meta.url).pathname).json();
    const shipped = new Set<string>(manifest.assets.map((asset: { path: string }) => asset.path));
    const letters = ['P', 'N', 'B', 'R', 'Q', 'K'];
    const kinds = ['w', 'b'].flatMap((color) => letters.map((type) => ({ color, type })));
    for (const path of [...Object.values(BOARD_TILES), ...kinds.map(piecePath)]) {
      expect(shipped.has(path)).toBe(true);
    }
  });
});
