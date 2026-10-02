/* One stop on the map, drawn — and the tap it answers.
 *
 * The illustration is the art's and lives in `src/map/marker.js`: the tower a
 * lesson wears, the place a detour wears, the crossed swords on a boss stop, and
 * the quest pin over the stop the child is on. What is left here is what only this
 * screen knows — the two questions a tap asks: was this a pan, and is the stop open.
 *
 * **A stop carries no word at all.** Not its name, not its number, not why its door
 * is shut: the map is the painting and its markers, and that is the whole of it. A
 * child who wants to know what a stop is taps it — the sheet that opens names the
 * lesson, says what it teaches and says which lesson opens it, which is a screen
 * with the room to say a thing properly. The words were a caption no bigger than a
 * fingernail written over somebody's drawing, and the map reads as a map without
 * them.
 *
 * **The marker is therefore the whole of a stop**, and `box` is the marker's own
 * box: there is nothing hanging off it for a neighbouring stop to collide with, so
 * the only rule the layout has to keep is that no two markers are drawn over each
 * other (`tests/path.test.ts` holds that at the shapes the game is played at).
 *
 * A tap is a tap, not a pan: the map moves under a finger, so the caller passes a
 * `panned()` test and a stop that was panned never counts as pressed. Pixi fires
 * `pointertap` on whatever the finger lifted over however far it travelled, so the
 * guard belongs here rather than in the gesture.
 */
import { Container } from '../../vendor/pixi/pixi.min.mjs';
import { createMarker } from '../map/marker.js';

export function createStop(parent, { stop, state, here = false, panned, onTap }) {
  const node = new Container();
  node.position.set(stop.x, stop.y);

  const marker = createMarker(node, { id: stop.id, kind: stop.kind, state, here });

  const box = { left: marker.box.left, right: marker.box.right, top: marker.box.top, bottom: marker.box.bottom };

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
    arrow: marker.arrow,
    /* The name the shell's live region is handed when a stop is tapped: the canvas
     * is one node, so a stop has to say what it is out loud. The map shows no words
     * at all, so the spoken name is the only place a screen reader — or anyone who
     * cannot see the painting — learns what the stop is. */
    spoken: () => (state === 'locked' ? `${stop.title}, locked` : `${stop.title}, ${state}`),
    box,
    /* The hit area is what a finger gets, and it is the marker's own box: there is
     * nothing else on a stop to tap. */
    measure: () => ({ id: stop.id, kind: stop.kind, state, title: stop.title, x: stop.x, y: stop.y, width: marker.hit.width, height: marker.hit.height, box }),
  };
}
