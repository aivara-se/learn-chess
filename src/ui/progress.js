/* A progress bar — the pack's own track and fill, from a value the caller
 * counted.
 *
 * The kit never knows a total: `value` and `max` are handed in, so a bar can
 * only be as right as the count behind it, and no screen can write a course
 * total into the chrome. A bar at zero draws the track with no fill rather than
 * a nub, because a nub reads as "a little" when the truth is "none".
 */
import { Container, NineSliceSprite } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, LIFT, NINE, TYPE, scale as clamped, text } from './theme.js';
import { SPRITE, texture } from './assets.js';

export function createProgress(parent, { value = 0, max = 1, units = 240, scale = 1, caption = '' } = {}) {
  const k = clamped(scale);
  const w = Math.round(units * k);
  const bar = Math.round(16 * k);
  const capNode = caption ? text(caption, { size: Math.round(TYPE.small * k), weight: '500', colour: COLOUR.inkSoft }) : null;
  const capHeight = capNode ? capNode.height + Math.round(LIFT * k) : 0;

  const node = new Container();
  const track = new NineSliceSprite({ texture: texture(SPRITE.track), leftWidth: NINE.pill.left, rightWidth: NINE.pill.right, topHeight: NINE.pill.top, bottomHeight: NINE.pill.bottom, width: w, height: bar });
  const fill = new NineSliceSprite({ texture: texture(SPRITE.fill), leftWidth: NINE.pill.left, rightWidth: NINE.pill.right, topHeight: NINE.pill.top, bottomHeight: NINE.pill.bottom, width: bar, height: bar });
  track.position.set(0, capHeight);
  fill.position.set(0, capHeight);
  if (capNode) capNode.position.set(0, 0);
  node.addChild(track, fill);
  if (capNode) node.addChild(capNode);

  const set = (count, of = max) => {
    const share = of > 0 ? Math.max(0, Math.min(1, count / of)) : 0;
    fill.visible = share > 0;
    fill.width = Math.max(bar, Math.round(w * share));
    return share;
  };
  set(value);

  node.eventMode = 'none';
  parent.addChild(node);
  return {
    node,
    set,
    measure: () => ({ kind: 'progress', width: w, height: capHeight + bar }),
    destroy() { parent.removeChild(node); node.destroy({ children: true }); },
  };
}
