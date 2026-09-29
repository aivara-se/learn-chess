/* A panel — the surface a screen is written on.
 *
 * Two tones, and which one to use is decided by the content rather than the
 * mood: `card` is the white card the game's own copy sits on (a title and a
 * body line), and `action` is the pack's flat face, for the one strip a screen
 * uses to say where you are. Both draw at a width the caller gives and a height
 * the copy needs, so a panel can never be shorter than the words in it.
 *
 * The card is drawn, not sliced: the pack has no white panel, and inventing a
 * nine-slice out of a blue button would be a lie about where the shape came
 * from. The shadow is two pixels of ink at 6% — not a blur, which costs a
 * render target per card on a phone.
 */
import { Container, Graphics, NineSliceSprite } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, LIFT, NINE, PAD, TYPE, card, scale as clamped, text } from './theme.js';
import { SPRITE, texture } from './assets.js';

export function createPanel(parent, { units = 300, height = 0, scale = 1, tone = 'card', title = '', body = '' } = {}) {
  const k = clamped(scale);
  const w = Math.round(units * k);
  const pad = Math.round(PAD * k);
  const wrap = w - Math.round(2 * PAD * k);
  const node = new Container();

  const onAction = tone === 'action';
  const titleNode = title ? text(title, { size: Math.round(TYPE.body * k), weight: '700', colour: COLOUR.ink, wrap }) : null;
  const bodyNode = body ? text(body, { size: Math.round(TYPE.small * k), weight: '500', colour: onAction ? COLOUR.ink : COLOUR.inkSoft, wrap }) : null;
  const needed = Math.round(2 * PAD * k) + (titleNode ? titleNode.height + Math.round(LIFT * k) : 0) + (bodyNode ? bodyNode.height : 0);
  const h = height ? Math.round(height * k) : Math.max(Math.round(56 * k), needed);

  const shape = onAction
    ? new NineSliceSprite({ texture: texture(SPRITE.flat), leftWidth: NINE.flat.left, rightWidth: NINE.flat.right, topHeight: NINE.flat.top, bottomHeight: NINE.flat.bottom, width: w, height: h })
    : card(new Graphics(), w, h, k);
  node.addChild(shape);

  let y = pad;
  if (titleNode) { titleNode.position.set(pad, y); node.addChild(titleNode); y += titleNode.height + Math.round(LIFT * k); }
  if (bodyNode) { bodyNode.position.set(pad, y); node.addChild(bodyNode); }

  node.eventMode = 'none';
  parent.addChild(node);
  return {
    node,
    tone,
    titleNode,
    bodyNode,
    measure: () => ({ kind: 'panel', tone, width: w, height: h }),
    destroy() { parent.removeChild(node); node.destroy({ children: true }); },
  };
}
