/* The coach — and the one piece of behaviour this card owns: he has two voices,
 * and they are two elements.
 *
 * `verdict` is Pip judging *your* move. It keeps what it said until you move
 * again. `reply` is *what just happened* — his move in words, a threat, a check
 * — and it is written outside the bubble, under the pack's divider. They must
 * never be one element: his reply used to be written into the bubble 332ms
 * after every tap, so the grade was gone before a child could read it, and no
 * amount of styling fixes a sentence that has been overwritten.
 *
 * So the component hands back both nodes and nothing else writes to them:
 * `handle.voices()` returns the two text objects, and a browser check can hold
 * them and prove they are not the same node. docs/DESIGN.md carries the rule.
 *
 * The tone tints the bubble's surface and border only — the verdict is a word
 * ("Perfect!" / "Oops"), and a tone is never the only thing saying which it is.
 */
import { Container, Graphics } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, LIFT, PAD, TAP_FLOOR, TYPE, scale as clamped, text } from './theme.js';
import { SPRITE, sprite } from './assets.js';

const TONE = {
  plain: { fill: COLOUR.cardSoft, line: COLOUR.line },
  good: { fill: COLOUR.goodSoft, line: COLOUR.good },
  warn: { fill: COLOUR.warnSoft, line: COLOUR.warn },
  bad: { fill: COLOUR.badSoft, line: COLOUR.bad },
};

export function createSpeech(parent, { units = 300, scale = 1, avatar = true } = {}) {
  const k = clamped(scale);
  const width = Math.round(units * k);
  const gap = Math.round(LIFT * k);
  const pad = Math.round(PAD * k);
  const face = avatar ? Math.round(36 * k) : 0;
  const bubbleX = avatar ? face + gap : 0;
  const bubbleW = width - bubbleX;

  const node = new Container();
  const shape = new Graphics();
  const avatarNode = avatar ? sprite(SPRITE.pip, { width: face, height: face }) : null;
  const bubble = text('Tap a piece, then tap where it should go.', { size: Math.round(TYPE.body * k), colour: COLOUR.ink, wrap: bubbleW - pad });
  const divider = sprite(SPRITE.divider, { width, height: Math.max(2, Math.round(4 * k)) });
  const reply = text('', { size: Math.round(TYPE.small * k), colour: COLOUR.inkSoft, wrap: width });

  node.addChild(shape);
  if (avatarNode) node.addChild(avatarNode);
  node.addChild(bubble, divider, reply);

  let tone = 'plain';
  let height = 0;

  /* One layout, run whenever either voice is written: the bubble is as tall as
   * the sentence in it, the reply line sits below the divider, and the two can
   * never overlap because they are placed from the same pass. */
  const place = () => {
    const box = Math.max(face, bubble.height + pad, Math.round(TAP_FLOOR * k));
    const colours = TONE[tone] ?? TONE.plain;
    shape.clear();
    shape.roundRect(bubbleX, 0, bubbleW, box, Math.round(16 * k))
      .fill(colours.fill)
      .stroke({ width: Math.max(1, Math.round(k)), color: colours.line, alignment: 0.5 });
    if (avatarNode) avatarNode.position.set(0, 0);
    bubble.position.set(bubbleX + Math.round(pad / 2), Math.round((box - bubble.height) / 2));
    divider.position.set(0, box + gap);
    reply.position.set(0, box + gap + divider.height + gap);
    height = box + gap + divider.height + gap + reply.height;
  };

  const handle = {
    node,
    verdict(line, next = 'plain') {
      tone = TONE[next] ? next : 'plain';
      bubble.text = line;
      place();
      return handle;
    },
    reply(line) {
      reply.text = line;
      place();
      return handle;
    },
    /* The two voices, as two nodes. A caller that finds one of these is the
     * other has just written Pip's move over his verdict. */
    voices: () => ({ verdict: bubble, reply }),
    tone: () => tone,
    measure: () => ({ kind: 'coach', width, height }),
    destroy() { parent.removeChild(node); node.destroy({ children: true }); },
  };

  place();
  node.eventMode = 'none';
  parent.addChild(node);
  return handle;
}
