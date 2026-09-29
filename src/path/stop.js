/* One stop on the map, drawn — and the tap it answers.
 *
 * The states are the course's, and each one is a shape and a word rather than a
 * colour: **done** wears the pack's tick, **open** wears its number (a boss wears
 * the king, a detour a plus — "more of this", the one thing a pack asks), and
 * **locked** wears the padlock with the lesson that opens it written underneath.
 * The circle follows the state too — a locked stop leaves the pack's blue for the
 * drawn grey face the kit's disabled control wears, and a done stop is the white
 * chip surface the pack's tick is measured legible on (6.48:1, `docs/DESIGN.md`),
 * because the pack's own tick and lock are drawn for a light surface and vanish on
 * the pack's own blue.
 *
 * The drawing is one node with its origin at the circle's centre, so a stop is
 * placed by its own coordinate and its caption hangs below without arithmetic at
 * the call site. `box` reports what the stop really occupies — caption included,
 * in the node's own coordinates — because the screen has to know whether the map
 * is tall enough for the last caption, and a constant would be a guess.
 *
 * A tap is a tap, not a drag: the map moves under a finger, so the caller passes a
 * `panned()` test and a stop that was scrolled never counts as pressed. Pixi fires
 * `pointertap` on whatever the finger lifted over however far it travelled, so the
 * guard belongs here rather than in the gesture.
 *
 * The words are the caller's: this file draws a stop, it does not decide what a
 * stop says. `line` is the sentence under the name, `glyph` is what an open stop
 * wears.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, TYPE, scale as clamped, text } from '../ui/theme.js';
import { SPRITE, sprite } from '../ui/assets.js';

const STAR = 12;        // one star in the row under a stop's name
const STAR_GAP = 2;
const PIP = 36;         // Pip, standing where the child is
const PIP_LIFT = 14;    // how far above the circle he stands

/* A ring drawn as twelve dots: a detour is not a stop on the path, and a dotted
 * edge says so before a child reads the word "optional" underneath. */
function dotted(graphics, radius, colour, size) {
  for (let step = 0; step < 12; step += 1) {
    const angle = (step / 12) * Math.PI * 2;
    graphics.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, size).fill(colour);
  }
  return graphics;
}

export function createStop(parent, { stop, state, glyph, line, puzzles, here, caption, room = 0, scale = 1, panned, onTap }) {
  const k = clamped(scale);
  const pack = stop.kind === 'pack';
  const r = Math.round((stop.size / 2) * k);
  const rim = Math.max(1, Math.round(k));
  const pip = Math.round(PIP * k);
  /* Pip stands beside the stop, on the side the map has room for: in the last column
   * his 36px would otherwise hang past the edge of the map and be cut in half. */
  const pipRight = room >= r + Math.round(2 * k) + pip;
  const node = new Container();
  node.position.set(stop.x, stop.y);

  if (state === 'open') {
    /* The pack's own round face, drawn whole: a circle does not slice. */
    const face = sprite(SPRITE.round, { width: r * 2, height: r * 2 });
    face.position.set(-r, -r);
    node.addChild(face);
  } else {
    const face = new Graphics()
      .circle(0, 0, r)
      .fill(state === 'done' ? COLOUR.card : COLOUR.muteSoft)
      .stroke({ width: rim, color: state === 'done' ? COLOUR.line : COLOUR.mute, alignment: 0.5 });
    node.addChild(face);
  }
  if (pack) {
    node.addChild(dotted(new Graphics(), r + Math.round(6 * k), COLOUR.inkMute, Math.max(1, Math.round(1.4 * k))));
  }

  const mark = state === 'locked' ? SPRITE.lock : state === 'done' ? SPRITE.tick : null;
  if (mark) {
    const size = Math.round(r * 1.05);
    const icon = sprite(mark, { width: size, height: size });
    icon.position.set(-size / 2, -size / 2);
    node.addChild(icon);
  } else {
    const label = text(glyph, { size: Math.round(r * 0.94), weight: '700', colour: COLOUR.ink });
    label.anchor.set(0.5);
    node.addChild(label);
  }

  /* Pip stands where the child is. The ring says the same thing in a shape and the
   * caption says it in words, so nothing here is carried by a colour alone. */
  if (here) {
    node.addChild(new Graphics().circle(0, 0, r + Math.round(5 * k)).stroke({ width: Math.max(2, Math.round(3 * k)), color: COLOUR.ink, alignment: 1 }));
    const mark = sprite(SPRITE.pip, { width: pip, height: pip });
    mark.position.set(pipRight ? r + Math.round(2 * k) : -(r + Math.round(2 * k) + pip), -Math.round(PIP_LIFT * k) - pip);
    node.addChild(mark);
  }

  const title = text(stop.title, {
    size: Math.round((pack ? TYPE.tiny : TYPE.small) * k),
    weight: '700',
    colour: COLOUR.ink,
    align: 'center',
    wrap: caption,
  });
  title.anchor.set(0.5, 0);
  title.position.set(0, r + Math.round(6 * k));
  node.addChild(title);
  let low = title.position.y + title.height;

  if (puzzles.of) {
    const width = puzzles.of * (Math.round(STAR * k) + Math.round(STAR_GAP * k)) - Math.round(STAR_GAP * k);
    let x = -width / 2;
    for (let i = 0; i < puzzles.of; i += 1) {
      const size = Math.round(STAR * k);
      const star = sprite(i < puzzles.stars ? SPRITE.star : SPRITE.starOutline, { width: size, height: size });
      star.position.set(x, low + Math.round(4 * k));
      node.addChild(star);
      x += size + Math.round(STAR_GAP * k);
    }
    low += Math.round(4 * k) + Math.round(STAR * k);
  }

  const sub = text(line, {
    size: Math.round(TYPE.tiny * k),
    weight: '500',
    colour: here ? COLOUR.ink : COLOUR.inkMute,
    align: 'center',
    wrap: caption,
  });
  sub.anchor.set(0.5, 0);
  sub.position.set(0, low + Math.round(5 * k));
  node.addChild(sub);

  const box = {
    left: Math.min(-r, -Math.round(caption / 2), here && !pipRight ? -(r + Math.round(2 * k) + pip) : 0),
    right: Math.max(r, Math.round(caption / 2), here && pipRight ? r + Math.round(2 * k) + pip : 0),
    top: here ? -Math.round(PIP_LIFT * k) - pip : -r,
    bottom: sub.position.y + sub.height,
  };

  node.eventMode = 'static';
  node.hitArea = new Rectangle(-r, -r, r * 2, r * 2);
  node.cursor = 'pointer';
  node.on('pointertap', () => { if (!panned()) onTap(stop); });

  parent.addChild(node);
  return {
    node,
    id: stop.id,
    kind: stop.kind,
    state,
    title: stop.title,
    line,
    stars: puzzles,
    /* The name the shell's live region is handed when a stop is tapped: the canvas
     * is one node, so a stop has to say what it is out loud. */
    spoken: () => `${stop.title}: ${line}`,
    box,
    /* The hit area is what a finger gets, and it is the circle: the caption belongs
     * to the stop but is not something a child taps. */
    measure: () => ({ id: stop.id, kind: stop.kind, state, title: stop.title, line, stars: puzzles, here, x: stop.x, y: stop.y, width: r * 2, height: r * 2, box }),
  };
}
