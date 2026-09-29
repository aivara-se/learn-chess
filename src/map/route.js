/* The route: the dotted trail of beads the child walks, and the two states a leg
 * has always had.
 *
 * A leg is the line `src/path/layout.js` draws between two stops — the maths is
 * the layout's and this file changes only how the line looks. On it sits the art
 * card's bead, run along the leg at a spacing that carries the state: **a leg not
 * yet walked is a sparse, dim run of beads, a leg already walked is a close-set,
 * bright one whose beads touch**, so a walked leg reads as a path and an unwalked
 * one as a trail of dots. The shape is the difference and the brightness agrees
 * with it, which is the rule the design document sets for anything the map says
 * with a line — and the bead carries its own dark outline, so it stays legible on
 * grass, snow and ash alike (the art card measured it: 15.3:1 on the brightest
 * ground, 11.9:1 on the darkest).
 *
 * A detour's thread is the same bead at half the weight, from the lesson that
 * teaches the idea to the pack itself and nowhere else.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { MAP, sprite } from '../ui/assets.js';

/* The bead's own numbers. The art is exported at 2×: a 32px file is a 16px bead. */
export const BEAD = {
  route: { size: 16, glow: 34, walked: 12, unwalked: 22 },
  detour: { size: 10, glow: 22, walked: 8, unwalked: 15 },
};

/* How far a bead keeps clear of the marker it runs from or to, so no bead is drawn
 * under a stop: half the stop plus a little air. */
const clear = (stop) => Math.round((stop?.size ?? 64) / 2) + 6;

/* The beads along one leg, as points. Pure arithmetic on purpose — the spacing,
 * the run's ends and the way the beads cover the leg are `tests/map.test.ts`'s
 * business, and a check that has to read a renderer to see them is not a check. */
export function beadRun(from, to, { spacing, clearFrom = 0, clearTo = 0 }) {
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  if (span === 0 || spacing <= 0) return [{ x: from.x, y: from.y }];
  const start = Math.min(clearFrom, span * 0.45);
  const end = span - Math.min(clearTo, span * 0.45);
  const points = [];
  for (let at = start; at <= end + 0.5; at += spacing) {
    const t = at / span;
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return points.length ? points : [{ x: from.x, y: from.y }];
}

/* The trail, drawn under the stops: `parent` is the map's legend layer, the first
 * child of the world, so a stop always sits on top of the legs that point at it.
 * `walked(id)` is the caller's — the screen asks `src/path/progress.js`, and this
 * file never reads the record itself. */
export function drawRoute(parent, { legs, byId, walked }) {
  const node = new Container();
  /* Paint, not a control: a bead is never a tap target, and a bead run over a stop
     must never stand between a finger and that stop. */
  node.eventMode = 'none';
  const drawn = [];
  for (const leg of legs) {
    const from = byId.get(leg.from);
    const to = byId.get(leg.to);
    if (!from || !to) continue;
    const shape = leg.kind === 'detour' ? BEAD.detour : BEAD.route;
    const walked_ = !!walked(leg.from);
    const spacing = walked_ ? shape.walked : shape.unwalked;
    const points = beadRun(from, to, { spacing, clearFrom: clear(from), clearTo: clear(to) });
    for (const point of points) {
      if (walked_) {
        const glow = sprite(MAP.beadGlow, { width: shape.glow, height: shape.glow });
        glow.alpha = 0.7;
        glow.position.set(Math.round(point.x - shape.glow / 2), Math.round(point.y - shape.glow / 2));
        node.addChild(glow);
      }
      const bead = sprite(MAP.bead, { width: shape.size, height: shape.size });
      bead.alpha = walked_ ? 1 : 0.62;
      bead.position.set(Math.round(point.x - shape.size / 2), Math.round(point.y - shape.size / 2));
      node.addChild(bead);
      drawn.push({ kind: leg.kind, from: leg.from, to: leg.to, walked: walked_, x: Math.round(point.x), y: Math.round(point.y) });
    }
  }
  parent.addChild(node);
  return { node, beads: drawn };
}
