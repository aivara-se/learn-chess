/* The kit's values — the ones every screen reads instead of inventing its own.
 *
 * Every colour and every size here was measured on the surface it is used on,
 * and docs/DESIGN.md carries the table each one came from. The blue is not
 * chosen: it is the Kenney UI pack's own blue, sampled out of the bytes of the
 * shipped sprites in `assets/ui/**`, so a part the kit draws and a part the pack
 * draws cannot drift apart.
 *
 * A screen passes a `scale`. The kit clamps it at its floor, because the tap
 * floor is a floor and not a suggestion — a caller cannot ask for a control a
 * finger cannot hit by passing a fraction.
 */
import { Text } from '../../vendor/pixi/pixi.min.mjs';

export const COLOUR = {
  /* the frame behind the game, and the card a screen is written on */
  ground: 0xeef3ff,
  card: 0xffffff,
  cardSoft: 0xf6f8ff,
  line: 0xdce4f7,

  /* ink, three tiers, each measured on the card */
  ink: 0x182046,      // 15.74:1 on the card
  inkSoft: 0x454f72,  // 8.03:1 — the body copy
  inkMute: 0x5f698a,  // 5.42:1 — the small print

  /* the pack's blue family, read off button.png / panel.png / star.png */
  action: 0x1c9fd7,   // the flat face; ink on it is 5.24:1
  actionTop: 0x34b9f2,
  actionGlow: 0x36bdf7,
  actionRim: 0x167da8,
  actionDeep: 0x146587,  // the raised button's bottom edge

  /* tones, only ever a tinted surface with the matching dark ink on it */
  good: 0x0f7b46,     // 4.76:1 on goodSoft
  goodSoft: 0xe3f7ec,
  bad: 0xb8232b,      // 5.46:1 on badSoft
  badSoft: 0xffe9ea,
  warn: 0x8a5a00,     // 5.44:1 on warnSoft
  warnSoft: 0xfff4e0,

  /* the pack's own greys, which is what a control that is not live is drawn in */
  mute: 0xb0b0ba,
  muteSoft: 0xdadce7,
};

/* The type ramp at scale 1. 17px is the body size — the old app's own
 * comfortable line, and the card's starting point — and nothing in the kit
 * draws below the small tier. */
export const TYPE = { body: 17, label: 17, small: 13.5, tiny: 12 };

/* What a finger hits. The board's squares are the one documented exception, and
 * docs/DESIGN.md is where it is documented. */
export const TAP_FLOOR = 48;
export const PAD = 16;
export const GAP = 14;
/* The vertical gap *inside* a component — between a caption and its bar, a
 * title and its body, the bubble and the line under it. Smaller than GAP on
 * purpose: side by side, two things read as two; stacked, they read as one
 * thought, and 14px between them makes a sentence look like a paragraph. */
export const LIFT = 8;
export const ROW = 26;

/* The nine-slice borders for each pack sprite, cut from the alpha of the file
 * itself: 6px of cap each side keeps the rounded corner and the 1px rim, and
 * 8px top and bottom keeps the top highlight and the bottom edge bar. */
export const NINE = {
  raised: { left: 6, right: 6, top: 8, bottom: 8 },
  flat: { left: 6, right: 6, top: 8, bottom: 8 },
  square: { left: 6, right: 6, top: 8, bottom: 8 },
  pill: { left: 6, right: 6, top: 6, bottom: 6 },
};

export const SCALE = { floor: 1, phone: 1, wide: 1.5 };

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function scale(requested) {
  const asked = Number(requested);
  return Number.isFinite(asked) ? Math.max(SCALE.floor, asked) : SCALE.phone;
}

/* Motion is a preference, not a decoration. Everything that moves in the kit is
 * off when the device asks for less; what is left is a state that changes (a
 * face, a colour), and a state change is not an animation. */
export function animates() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function text(string, { size = TYPE.body, weight = '600', colour = COLOUR.ink, align = 'left', wrap = 0 } = {}) {
  const node = new Text({ text: string, style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill: colour, align } });
  if (wrap > 0) {
    node.style.wordWrap = true;
    node.style.wordWrapWidth = wrap;
    node.style.lineHeight = Math.round(size * 1.35);
  }
  return node;
}

/* A rounded card, drawn rather than sliced: the pack has no white panel, and a
 * card is the one surface the game writes on. The shadow is two pixels of ink
 * at 6% under the fill — not a blur filter, which would cost a render target
 * for every card on a screen. */
export function card(graphics, width, height, k, tone = COLOUR.card) {
  const r = Math.round(RADIUS_SCALE * k);
  graphics.roundRect(Math.round(2 * k), Math.round(3 * k), width - Math.round(4 * k), height, r).fill({ color: COLOUR.ink, alpha: 0.06 });
  graphics.roundRect(0, 0, width, height, r).fill(tone).stroke({ width: Math.max(1, Math.round(k)), color: COLOUR.line, alignment: 0.5 });
  return graphics;
}

const RADIUS_SCALE = 16;
