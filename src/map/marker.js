/* One stop's marker, drawn in the art's own vocabulary.
 *
 * A lesson wears the operator's tower in the state it is in — open, done or
 * locked — and the tower is the whole marker: no overlay sits on it. A detour
 * wears the place the sheet draws for it (a mine, a farm, a cave), a boss stop
 * wears the crossed swords, and the quest pin hangs over the stop the child is on.
 * This file places them; it does not decide anything the screen knows — the kind
 * and the state are the caller's, and a stop draws no words at all
 * (`src/path/stop.js`).
 *
 * Three things a reader should know:
 *
 *   - **The marker is drawn about the stop's own point.** A lesson's tower is
 *     64×96, so it stands 48px above and below the point the layout gives the
 *     stop.
 *   - **A non-tower marker wears its state as a corner badge**, the art's own
 *     overlay drawn small rather than across the middle: the plate the overlay was
 *     drawn on is shield-shaped and covered the part of a mine or a farm that says
 *     which place it is. `OVERLAY` is still the box the overlays were measured
 *     against; it is no longer the size they are drawn at.
 *   - **A detour's place is picked per stop**, not per kind: `PACK_FOR` maps the
 *     pack's own id to the sprite the sheet drew for it, because three detours that
 *     all wore one icon said nothing about where they were. `tests/path.test.ts`
 *     holds every pack to having one.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR } from '../ui/theme.js';
import { MAP, sprite } from '../ui/assets.js';

/* The art's drawn sizes, read off each entry's `source` line in
 * `assets/manifest.json` — the manifest is the record. */
export const MARKER = {
  lesson: { asset: null, width: 64, height: 96, tower: true },
  pack: { asset: null, width: 48, height: 54 },
  /* The swords are drawn at the tower's own width where the art's own crest was
   * 76: a boss stop is the last stop before the bridge and ten stops have to fit in
   * the road west of it, so a marker wider than the step would be drawn over its
   * neighbour. `src/path/layout.js` holds the rule and says why. */
  boss: { asset: MAP.boss, width: 64, height: 72 },
};
export const TOWER_FOR = { done: MAP.towerDone, open: MAP.towerOpen, locked: MAP.towerLocked };
/* Which place a detour wears. The id is the pack's own, so a fourth pack added to
 * the course needs a line here as well as a sprite — and `tests/path.test.ts`
 * fails a pack the sheet has no place for. */
export const PACK_FOR = { fork: MAP.mine, pin: MAP.farm, 'back-rank': MAP.cave };
export const OVERLAY = { width: 64, height: 72 };
/* The state badge: the art's own overlay drawn small, in the corner of the marker
 * it belongs to. It is deliberately not drawn over the marker's middle any more —
 * a place is a picture of a place, and the plate the overlay was drawn on covered
 * exactly the part that says which place it is. The badge keeps the padlock and the
 * tick legible as marks while the icon underneath stays readable. */
export const BADGE = { width: 30, height: 34 };
export const ARROW = { width: 30, height: 36, gap: 4 };

const OVERLAY_FOR = { done: MAP.done, open: MAP.open, locked: MAP.locked };

/* The marker for one stop. Returns the node (its origin is the stop's own point),
 * the face's own box, the arrow when this is the stop the child is on, and the
 * rectangle a finger gets. It draws no text: no stop on this map carries a word. */
export function createMarker(parent, { id = '', kind = 'lesson', state = 'locked', here = false }) {
  const shape = MARKER[kind] ?? MARKER.lesson;
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  const node = new Container();

  const asset = shape.tower
    ? (TOWER_FOR[state] ?? TOWER_FOR.locked)
    : (kind === 'pack' ? (PACK_FOR[id] ?? MAP.mine) : shape.asset);
  const face = sprite(asset, { width: shape.width, height: shape.height });
  face.position.set(-halfW, -halfH);
  node.addChild(face);

  if (kind === 'pack') {
    /* A detour is not a stop on the path, and its dotted edge says so now that no
     * word underneath does. The art card drew no detour-specific sprite beyond the
     * place itself and left this ring to the code; it is drawn about the place's own
     * box, which sits centred in it. */
    const ring = new Graphics();
    const radius = halfW + 4;
    for (let step = 0; step < 12; step += 1) {
      const angle = (step / 12) * Math.PI * 2;
      ring.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.6).fill(COLOUR.inkMute);
    }
    node.addChild(ring);
  }

  /* A lesson's state is the tower itself, so it wears no badge. Every other marker
   * wears the art's own overlay drawn small, in its bottom-right corner: the padlock
   * for a locked stop, the tick for a finished one. Drawn at full size the overlay's
   * plate covered the middle of the icon — which is the part that says *which place*
   * this is — so it is a badge now, and the state is still a shape rather than a
   * shade of grey. */
  if (!shape.tower) {
    const badge = sprite(OVERLAY_FOR[state] ?? OVERLAY_FOR.locked, { width: BADGE.width, height: BADGE.height });
    badge.position.set(halfW - BADGE.width, halfH - BADGE.height);
    node.addChild(badge);
  }

  let arrow = null;
  if (here) {
    /* The quest pin, hung over the stop the child is on with its point at the
     * marker's crown. It is drawn as the sheet drew it: the tip points down, which
     * is the direction it has to point, so unlike the arrow it replaced this screen
     * turns nothing. */
    arrow = sprite(MAP.arrow, { width: ARROW.width, height: ARROW.height });
    arrow.anchor.set(0.5);
    arrow.position.set(0, -halfH - ARROW.gap - ARROW.height / 2);
    node.addChild(arrow);
  }

  parent.addChild(node);
  return {
    node,
    arrow,
    kind,
    state,
    face: { width: shape.width, height: shape.height },
    box: {
      left: -halfW,
      right: halfW,
      top: arrow ? -halfH - ARROW.gap - ARROW.height : -halfH,
      bottom: halfH,
    },
    hit: new Rectangle(-halfW, -halfH, shape.width, shape.height),
  };
}
