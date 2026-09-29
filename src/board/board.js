/* The board: sixty-four squares cut from the game's own tiles, the letters and
 * numbers that name them, and what is drawn on a square — the square a learner
 * has picked, and the squares their piece can go to.
 *
 * **Two containers, and the split is the point.** `surface` is the board and
 * everything a piece stands over; `marks` is drawn *above* the pieces, because a
 * ring on a square an enemy piece stands on has to be seen around it — the old
 * app appended the ring after the piece in the same square for the same reason.
 * A screen adds them in that order:
 *
 *     layer.addChild(board.surface, pieces.view, board.marks)
 *
 * **Every pixel decision is made once per layout.** The square is a whole, even
 * number of pixels, the size of every tile is set when the layout is made and
 * never recomputed per frame, and the board's origin is a whole pixel: a board
 * that resamples every frame is a blurry board. `place` re-lays the board out;
 * it does not rebuild it.
 *
 * The board is drawn from White's side unless it is told otherwise. The colour
 * of a square comes from the square rather than from the cell it is drawn in —
 * a1 and h8 stay dark whichever way the board faces — and the labels follow the
 * learner: the ranks down the edge nearest their left hand, the files along the
 * bottom of the board as they see it.
 */
import { Assets, Container, Graphics, Sprite, Text } from '../../vendor/pixi/pixi.min.mjs';
import { BOARD_TILES } from './art.js';
import { boardLayout, cornerOf, fileLabel, isDarkSquare, rankLabel, squareOf } from './geometry.js';

/* The tiles are cut at one native square — `assets/manifest.json` says so — and
 * a square of the board is the tile at `square / TILE`: one scale per layout,
 * picked from the container and stuck to. */
const TILE = 64;

/* The two tiles, once. They are the board's whole surface, and a screen that
 * cannot load its own art must not draw half a board — so the load is awaited
 * while this module is evaluated, and a route whose board cannot be loaded is a
 * route the shell reports as one that did not start. */
const [LIGHT, DARK] = await Promise.all([Assets.load(BOARD_TILES.light), Assets.load(BOARD_TILES.dark)]);

/* The furniture on a square — its coordinates, the ring on a square a learner
 * picked, the dot on one their piece can reach — is drawn in one of two inks,
 * chosen by the square it stands on: the old app's measured board ink on a light
 * square, and the old app's cream on a dark one. The pack's plastic board is
 * white and near-black, so no single ink reads on both — the shipped dark tile's
 * own pixels are (40, 40, 40), and the old ink on it is 1.2:1. Measured against
 * the rendered tiles, `#2c3350` on the light one is 9.2:1 and `#f7e8c9` on the
 * dark one is 12.2:1; the selection's amber is 1.4:1 on the light tile and 8.1:1
 * on the dark, which is why the ink ring inside it is what carries the shape. */
const INK = { light: 0x2c3350, dark: 0xf7e8c9 };
const PICK = 0xffb01f;
const WHITE = 0xffffff;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const inkFor = (square) => (isDarkSquare(square) ? INK.dark : INK.light);

/* The label's inset from its square's corner, and the widths of the two rings,
 * as proportions of a square: the old app's 3px, 4px and 5px on the 43px square
 * it drew them on. */
const PAD = 0.07;
const EDGE = 0.093;
const PICK_WIDTH = 0.116;

function text() {
  return new Text({ text: '', style: { fontFamily: FONT, fontWeight: '700' } });
}

export function createBoard() {
  const surface = new Container();
  const marks = new Container();
  const tiles = [];        // 64 sprites in cell order; the layout moves them, it does not rebuild them
  const ranks = [];        // the numbers down one side
  const files = [];        // the letters along one edge
  const highlight = new Graphics();
  const targets = new Graphics();
  let layout = { square: 0, side: 0, left: 0, top: 0 };
  let flipped = false;
  let state = { selected: null, targets: [] };

  /* The ring on the square a learner picked: the old app's
   * `box-shadow: inset 0 0 0 4px ink, inset 0 0 0 9px amber`, which is a dark
   * ring on the square's own edge and an amber one from there inwards. It goes
   * over the tiles and under everything else, so it reads as a highlight beneath
   * the piece standing on it. */
  function drawHighlight() {
    highlight.clear();
    const { selected } = state;
    if (selected == null || !layout.square) return;
    const size = layout.square;
    const ink = inkFor(selected);
    const dark = Math.max(2, Math.round(size * EDGE));
    const amber = Math.max(2, Math.round(size * PICK_WIDTH));
    const { x, y } = cornerOf(selected, layout, flipped);
    highlight.rect(x + dark / 2, y + dark / 2, size - dark, size - dark).stroke({ width: dark, color: ink });
    highlight
      .rect(x + dark + amber / 2, y + dark + amber / 2, size - 2 * dark - amber, size - 2 * dark - amber)
      .stroke({ width: amber, color: PICK });
  }

  /* What a piece can reach: a ring around a piece it may take, a dot on a square
   * it may move to — the old app's two shapes, in the old app's proportions. */
  function drawTargets() {
    targets.clear();
    if (!layout.square) return;
    const size = layout.square;
    for (const target of state.targets) {
      const { x, y } = cornerOf(target.square, layout, flipped);
      const cx = x + size / 2;
      const cy = y + size / 2;
      const ink = inkFor(target.square);
      if (target.capture) {
        const outer = size * 0.46;
        targets.circle(cx, cy, outer - size * 0.047).stroke({ width: Math.max(2, size * 0.094), color: ink });
        targets.circle(cx, cy, outer - size * 0.117).stroke({ width: Math.max(1, size * 0.047), color: WHITE });
      } else {
        targets.circle(cx, cy, size * 0.16).fill(ink).stroke({ width: Math.max(1, size * 0.031), color: WHITE });
      }
    }
  }

  function draw() {
    drawHighlight();
    drawTargets();
  }

  /* Built once, moved after that: the 64 tiles, the highlight over them, then
   * the labels — the old app's order, which is why the selection ring passes
   * under the coordinates printed inside a square. */
  function build() {
    if (tiles.length) return;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const tile = new Sprite(LIGHT);
        tiles[row * 8 + col] = tile;
        surface.addChild(tile);
      }
    }
    surface.addChild(highlight);
    for (let i = 0; i < 8; i++) {
      ranks[i] = text();
      files[i] = text();
      surface.addChild(ranks[i], files[i]);
    }
    files.forEach((file) => file.anchor.set(1, 1));
    marks.addChild(targets);
  }

  /**
   * Size and place the board in a viewport. `room` is the shorter side the board
   * has been given: a screen keeping a band for its own words passes it, and
   * everything else gives way to the board before the board does.
   *
   * Returns the layout — `{ square, side, left, top }` — because whoever draws
   * the pieces is placing them on this board and has to be able to ask where it
   * is.
   */
  function place({ width, height, flipped: face = false, room = Math.min(width, height) }) {
    build();
    layout = boardLayout({ width, height, room });
    flipped = !!face;
    const size = layout.square;
    const pad = Math.max(2, Math.round(size * PAD));
    const fontSize = Math.max(9, Math.round(size * 0.21));
    const scale = size / TILE;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const tile = tiles[row * 8 + col];
        tile.texture = isDarkSquare(squareOf(row, col, flipped)) ? DARK : LIGHT;
        tile.position.set(layout.left + col * size, layout.top + row * size);
        tile.scale.set(scale);
      }
    }

    const rankCol = flipped ? 7 : 0;
    const fileRow = flipped ? 0 : 7;
    for (let i = 0; i < 8; i++) {
      const rank = ranks[i];
      rank.text = rankLabel(flipped ? i : 7 - i);
      rank.style = { fontFamily: FONT, fontWeight: '700', fontSize, fill: inkFor(squareOf(i, rankCol, flipped)) };
      rank.position.set(layout.left + rankCol * size + pad, layout.top + i * size + pad);

      const file = files[i];
      file.text = fileLabel(flipped ? 7 - i : i);
      file.style = { fontFamily: FONT, fontWeight: '700', fontSize, fill: inkFor(squareOf(fileRow, i, flipped)) };
      file.position.set(layout.left + (i + 1) * size - pad, layout.top + (fileRow + 1) * size - pad);
    }

    /* The same square, the same marks: a layout that has moved must redraw what
     * stands on it, or a resize leaves the rings where the squares used to be. */
    draw();
    return layout;
  }

  return {
    /* The board and everything a piece stands over. */
    surface,
    /* The rings and dots, over the pieces. */
    marks,
    place,
    /**
     * What is drawn on the board: the square a learner has picked, and the
     * squares their piece can go to. A target is `{ square, capture }` — the
     * caller holds the position and so knows whether a piece stands there, and
     * the shape follows from that: a ring around a piece, a dot on an empty
     * square. Nothing here is wired to a tap; that is a screen's business.
     */
    mark({ selected = null, targets: list = [] }) {
      state = { selected, targets: list };
      draw();
    },
    layout: () => layout,
  };
}
