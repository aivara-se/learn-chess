/* One stop on the map, drawn — and the tap it answers.
 *
 * The illustration is the art's and lives in `src/map/marker.js`: the tower a
 * lesson wears, the medallion a detour wears, the boss crest, and the golden
 * arrow on the stop the child is on. What is left here is what only this screen
 * knows — the lesson's number, which is the **only word on the map**, and the two
 * questions a tap asks: was this a pan, and is the stop open.
 *
 * Three things a reader should know.
 *
 * **The number is the whole of what a stop says.** A tower wears its lesson's
 * number underneath it and nothing else; a detour and a boss stop wear no word at
 * all. Every other thing a child might want to read — the lesson's name, what it
 * teaches, which stop is which, why a door is shut — is on the sheet a tap opens
 * (`src/path/sheet.js`), which is where the words belong now: they were a caption
 * no bigger than a fingernail written over a painting, and the map reads as a map
 * without them.
 *
 * **The number is drawn on the painting, so it wears a halo.** The map used to be
 * drawn on the app's own pale ground, where ink was enough; it is a painted world
 * now, and it is busy everywhere. The number is the ink the kit writes in with the
 * art's own parchment `#efdfbb` around it — `ink` on that parchment is 11.9:1 and
 * the parchment on the darkest ground the painting has is 13.9:1, so whichever
 * ground a stop stands on, one of the pair carries the word. That is the same
 * two-tone rule the art card measured its sprites on, applied to the app's text.
 *
 * **The number hangs off what the marker really drew** (`marker.box.bottom`), not
 * off a number beside it, so a marker drawn a little taller than the circle it
 * replaced cannot have its number written through it.
 *
 * A tap is a tap, not a pan: the map moves under a finger, so the caller passes a
 * `panned()` test and a stop that was panned never counts as pressed. Pixi fires
 * `pointertap` on whatever the finger lifted over however far it travelled, so the
 * guard belongs here rather than in the gesture.
 *
 * The number is the caller's: this file draws a stop, it does not decide which
 * lesson is number three.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, TYPE, scale as clamped, text } from '../ui/theme.js';
import { createMarker } from '../map/marker.js';

const HALO = 0xefdfbb;  // the art's parchment, around the words the app writes

export function createStop(parent, { stop, state, number = '', here = false, scale = 1, panned, onTap }) {
  const k = clamped(scale);
  const node = new Container();
  node.position.set(stop.x, stop.y);

  const marker = createMarker(node, { kind: stop.kind, state, here });

  /* The one word: the lesson's number, centred under its tower. `number` is the
   * caller's — a detour and a boss stop pass none, because neither is a lesson and
   * numbering them would say they were steps on the course. */
  let num = null;
  let bottom = marker.box.bottom;
  if (number) {
    num = text(number, { size: Math.round(TYPE.tiny * k), weight: '700', colour: COLOUR.ink, align: 'center' });
    num.style.stroke = { color: HALO, width: 3 };
    num.anchor.set(0.5, 0);
    num.position.set(0, marker.box.bottom + Math.round(6 * k));
    node.addChild(num);
    bottom = num.position.y + num.height;
  }

  /* The box is the ground the stop really asks for: the marker and the number
   * under it. The width is the marker's own, not the number's, because a number
   * is two digits at the very most and the marker is what a finger and a
   * neighbouring stop have to stay clear of. */
  const box = { left: marker.box.left, right: marker.box.right, top: marker.box.top, bottom };

  node.eventMode = 'static';
  node.hitArea = marker.hit;
  node.cursor = 'pointer';
  node.on('pointertap', () => { if (!panned()) onTap(stop); });

  parent.addChild(node);
  return {
    node,
    id: stop.id,
    kind: stop.kind,
    state,
    title: stop.title,
    number,
    arrow: marker.arrow,
    /* The name the shell's live region is handed when a stop is tapped: the canvas
     * is one node, so a stop has to say what it is out loud. The map shows a number
     * and no words, so the spoken name is where the words still are. */
    spoken: () => `${stop.title}, ${state}`,
    box,
    /* The hit area is what a finger gets, and it is the marker's own box: the
     * number belongs to the stop but is not something a child taps. */
    measure: () => ({ id: stop.id, kind: stop.kind, state, title: stop.title, number, x: stop.x, y: stop.y, width: marker.hit.width, height: marker.hit.height, box }),
  };
}
