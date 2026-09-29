/* A chip — one number in the chrome: a star count, a streak, a rank, or the
 * state of something a child has not reached yet.
 *
 * The icon is the pack's own (a star, a tick, the rank badge, the padlock) and
 * the pill is drawn, because the pack's only pill is the progress bar's.
 *
 * A chip is a readout, not a control: it carries `eventMode: 'none'`, and it
 * changes nothing about the game. `tone: 'locked'` is the same grey a locked
 * stop wears on the path, and the chip says the state in words beside the icon
 * as well as in its tint — "not yet", "earned" — because a child who cannot
 * tell two greys apart still has to be able to read it.
 */
import { Container, Graphics } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, GAP, TYPE, scale as clamped, text } from './theme.js';
import { SPRITE, sprite } from './assets.js';

export function createChip(parent, { icon = 'star', value = '', label = '', scale = 1, tone = 'plain' } = {}) {
  const k = clamped(scale);
  const h = Math.round(30 * k);
  const pad = Math.round(10 * k);
  const gap = Math.round(GAP * k);
  const locked = tone === 'locked';
  const earned = tone === 'earned';
  const faded = locked ? COLOUR.inkMute : COLOUR.ink;

  const iconNode = sprite(SPRITE[icon] ?? SPRITE.star, { width: Math.round(18 * k), height: Math.round(18 * k) });
  const valueNode = value ? text(value, { size: Math.round(15 * k), weight: '700', colour: faded }) : null;
  const labelNode = label ? text(label, { size: Math.round(TYPE.small * k), weight: '500', colour: faded }) : null;

  const parts = [iconNode, valueNode, labelNode].filter(Boolean);
  const w = Math.round(2 * pad + parts.reduce((n, part) => n + Math.ceil(part.width), 0) + gap * (parts.length - 1));

  const shape = new Graphics()
    .roundRect(0, 0, w, h, Math.round(h / 2))
    .fill(earned ? COLOUR.goodSoft : locked ? COLOUR.cardSoft : COLOUR.card)
    .stroke({ width: Math.max(1, Math.round(k)), color: earned ? COLOUR.good : COLOUR.line, alignment: 0.5 });

  const node = new Container();
  node.addChild(shape);
  let x = pad;
  for (const part of parts) {
    part.anchor.set(0, 0.5);
    part.position.set(x, Math.round(h / 2));
    x += Math.ceil(part.width) + gap;
    node.addChild(part);
  }

  node.eventMode = 'none';
  parent.addChild(node);
  return {
    node,
    tone,
    say: () => (labelNode ? String(labelNode.text) : ''),
    measure: () => ({ kind: 'chip', tone, width: w, height: h }),
    destroy() { parent.removeChild(node); node.destroy({ children: true }); },
  };
}
