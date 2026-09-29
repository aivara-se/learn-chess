/* The pieces: one sprite per piece the engine puts on the board, standing on
 * their squares, and the one movement the game keeps.
 *
 * A position is a FEN. The engine parses it, this module asks it what stands on
 * every square, and a sprite is drawn at the scale the board gives it —
 * `square / 64`, the size the pack was cut at, which is the scale
 * `assets/manifest.json` records ("the game draws a piece at k = square/64").
 * A sprite is anchored at the **bottom centre** of its square and the pieces are
 * painted from the far rank forward, so a piece in front covers the one behind
 * it the way a top-down game stacks. The scale is set when the layout is made
 * and never re-derived per frame: a piece that resamples every frame is a piece
 * that shimmers.
 *
 * One thing moves: the piece that just arrived slides in from the square it
 * left, in 160ms — the old app's `.pc.walk { animation: walk 0.16s ease-out }`,
 * and the one animation `docs/PORT.md` keeps, because a redraw cannot show which
 * piece went where. Under `prefers-reduced-motion: reduce` the piece is simply
 * there, and nothing else in here moves at all.
 */
import { Assets, Container, Sprite } from '../../vendor/pixi/pixi.min.mjs';
import { parseFen, pieceAt } from '../engine/engine.js';
import { piecePath } from './art.js';
import { anchorOf, paintOrder } from './geometry.js';

/** The size the pack was cut at, and the one the manifest names. */
const NATIVE = 64;

/** The walk, in milliseconds: the old app's 0.16s, kept as the port contract. */
export const WALK_MS = 160;

/* Every sprite in one request, for the twelve pieces the engine can report. The
 * paths come from `art.js`, and a sprite the site does not ship is a load that
 * fails here rather than a square that stays empty. */
const COLOURS = ['w', 'b'];
const TYPES = ['P', 'N', 'B', 'R', 'Q', 'K'];
const KINDS = COLOURS.flatMap((color) => TYPES.map((type) => ({ color, type })));
const SPRITES = new Map(
  await Promise.all(KINDS.map(async (kind) => [`${kind.color}${kind.type}`, await Assets.load(piecePath(kind))])),
);

export function createPieces({ app }) {
  const view = new Container();
  view.sortableChildren = true;    // the sprites carry the paint order; the sort is what applies it
  const sprites = new Map();       // square -> the sprite standing on it
  const walking = [];              // the sprites on the move, with how far through they are
  let layout = { square: 0, side: 0, left: 0, top: 0 };
  let flipped = false;

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function place(sprite, sq) {
    const { x, y } = anchorOf(sq, layout, flipped);
    sprite.scale.set(layout.square / NATIVE);
    sprite.zIndex = paintOrder(sq, flipped);
    sprite.position.set(x, y);
  }

  /* One step of every walk in flight. The sprites are taken out of the list
   * first, so a walk started by the arrival of another one lands in the new list
   * rather than in the middle of this step. */
  function step(ticker) {
    if (!walking.length) return;
    const moving = walking.splice(0);
    for (const walk of moving) {
      walk.elapsed += ticker.deltaMS;
      const t = Math.min(walk.elapsed / WALK_MS, 1);
      const eased = 1 - (1 - t) * (1 - t);    // `ease-out`, near enough at this length
      if (t < 1) {
        walk.sprite.position.set(
          Math.round(walk.to.x + walk.dx * (1 - eased)),
          Math.round(walk.to.y + walk.dy * (1 - eased)),
        );
        walking.push(walk);
      } else {
        walk.sprite.position.set(walk.to.x, walk.to.y);
        walk.arrive();
      }
    }
  }

  app.ticker.add(step);

  return {
    /* The sprites, to be added between the board and its marks. */
    view,

    /**
     * Where the board is and which way it faces. Called before the first `show`
     * and again on every resize: the pieces standing on the board are moved to
     * the new squares rather than rebuilt.
     */
    setViewport({ layout: board, flipped: face = false }) {
      layout = board;
      flipped = !!face;
      for (const [sq, sprite] of sprites) place(sprite, sq);
    },

    /** The pieces for a position, on the board `setViewport` last described. */
    show(fen) {
      const position = parseFen(fen);
      view.removeChildren().forEach((sprite) => sprite.destroy());
      sprites.clear();
      for (let sq = 0; sq < 64; sq += 1) {
        const piece = pieceAt(position, sq);
        if (!piece) continue;
        const sprite = new Sprite(SPRITES.get(`${piece.color}${piece.type}`));
        sprite.anchor.set(0.5, 1);
        sprite.roundPixels = true;
        place(sprite, sq);
        sprites.set(sq, sprite);
        view.addChild(sprite);
      }
    },

    /**
     * Walk the piece now standing on `to` in from `from` — the move itself has
     * already been made in the position this was shown. Resolves when the piece
     * has arrived, and immediately when there is nothing to animate: under
     * reduced motion, or when no piece stands on `to` at all, it resolves to
     * `false` and the piece was simply there.
     */
    walk({ from, to }) {
      const sprite = sprites.get(to);
      if (!sprite || reducedMotion()) return Promise.resolve(false);
      const target = { x: sprite.x, y: sprite.y };
      const start = anchorOf(from, layout, flipped);
      sprite.position.set(start.x, start.y);
      return new Promise((resolve) => {
        walking.push({
          sprite,
          to: target,
          dx: start.x - target.x,
          dy: start.y - target.y,
          elapsed: 0,
          arrive: () => resolve(true),
        });
      });
    },

    /* The shell destroys the layer and its children; this is the part of
     * stopping that is not the shell's to do. */
    destroy() {
      app.ticker.remove(step);
      walking.length = 0;
      sprites.clear();
    },
  };
}
