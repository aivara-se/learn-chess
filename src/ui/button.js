/* A button — the one thing a child taps, in the pack's own faces.
 *
 * A raised face (`button.png`) is the pressable state; the flat face
 * (`panel.png`) is a quiet state and the pressed moment. That is deliberate:
 * "pressable" is then a *shape*, not a colour, so a child who cannot tell two
 * blues apart still sees which control is live.
 *
 * The disabled surface is the one face that is drawn rather than sliced,
 * because the pack has no greyed-out button in it. It is drawn in the pack's
 * own two greys (`star-outline.png`'s `#dadce7` face, `progress-track.png`'s
 * `#b0b0ba` rim), with the same silhouette, so a disabled control reads as the
 * same control — flat, grey, not interactive, and carrying its reason in its
 * own label ("Hint — waiting for Pip"). The pair is measured in
 * docs/DESIGN.md.
 *
 * Kinds: `primary` (raised), `quiet` (flat), `icon` (the round face and an
 * arrow), `square` (the square face and a tick). The pack's round and square
 * faces carry an icon rather than words, so their label is the name a screen
 * reader and the shell's live region get, not something drawn on the face.
 *
 * Every button is at least TAP_FLOOR tall and no narrower than it. The floor is
 * applied to the hit area as well as to the drawing, and `measure()` reports the
 * hit area, because the hit area is what a finger gets.
 */
import { Container, Graphics, NineSliceSprite, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, GAP, NINE, PAD, TAP_FLOOR, TYPE, animates, scale as clamped, text } from './theme.js';
import { SPRITE, sprite, texture } from './assets.js';

function slice(path, borders, width, height) {
  return new NineSliceSprite({ texture: texture(path), leftWidth: borders.left, rightWidth: borders.right, topHeight: borders.top, bottomHeight: borders.bottom, width, height });
}

/* The two glyphs the round and square faces carry, drawn in ink rather than
 * taken from the pack: the pack's own arrow and tick are painted in the pack's
 * blue, so on the pack's own blue faces they are the same colour as what they
 * sit on — measured, the arrow's fill against the face's mid-tone is 1.2:1 and
 * its rim is 1.85:1. The sprites stay in the tree for a surface they can be
 * seen on; a child cannot see a blue chevron on a blue button. */
function glyphFor(name, size) {
  const ink = { color: COLOUR.ink, width: Math.max(2, Math.round(size * 0.11)), cap: 'round', join: 'round' };
  const s = size / 24;
  const node = new Graphics();
  if (name === 'tick') {
    node.moveTo(4 * s, 12.5 * s).lineTo(10 * s, 18.5 * s).lineTo(20 * s, 5.5 * s).stroke(ink);
  } else {
    node.moveTo(7 * s, 5 * s).lineTo(20 * s, 12 * s).lineTo(7 * s, 19 * s).closePath().fill(COLOUR.ink);
  }
  return node;
}

export function createButton(parent, { label = '', kind = 'primary', scale = 1, width = 0, icon = null, onPress = null } = {}) {
  const k = clamped(scale);
  const height = Math.round(TAP_FLOOR * k);
  const fixed = width ? Math.round(width * k) : 0;
  const iconSize = icon ? Math.round(28 * k) : 0;
  const labelled = kind === 'primary' || kind === 'quiet';
  const radius = Math.round(6 * k);

  const node = new Container();
  const content = text(label, { size: Math.round(TYPE.label * k), colour: COLOUR.ink, weight: '600' });
  const glyph = icon ? glyphFor(icon, iconSize) : null;

  /* The faces, all the same size and stacked: `live` is the kind's own face,
   * `pressed` is the raised button's flat face (only a raised button has one),
   * and `disabled` is the drawn grey slab. One is visible at a time. */
  const facePath = kind === 'primary' ? SPRITE.raised : kind === 'square' ? SPRITE.square : SPRITE.flat;
  const borders = kind === 'primary' ? NINE.raised : kind === 'square' ? NINE.square : NINE.flat;
  const live = kind === 'icon' ? sprite(SPRITE.round, { width: height, height }) : slice(facePath, borders, height, height);
  const pressed = kind === 'primary' ? slice(SPRITE.flat, NINE.flat, height, height) : null;
  const disabled = new Graphics();
  const surfaces = { live, disabled };
  if (pressed) surfaces.pressed = pressed;
  node.addChild(...Object.values(surfaces));

  const state = { disabled: false, pressed: false, reason: '', label };
  const shown = () => (state.disabled ? state.label + (state.reason ? ` — ${state.reason}` : '') : state.label);
  const parts = () => (labelled ? [glyph, content] : [glyph]).filter(Boolean);

  /* One place decides the size, and it reads the label *as it stands now* — so
   * a disabled control that names its reason is a bigger control, not a label
   * spilling out of a face. */
  let box;
  const fit = () => {
    content.text = shown();
    const list = parts();
    const row = list.reduce((n, part) => n + Math.ceil(part.width), 0) + (list.length > 1 ? Math.round(GAP * k) : 0);
    box = { width: kind === 'icon' || kind === 'square' ? height : fixed || Math.max(height, row + Math.round(2 * PAD * k)), height };
    for (const [name, surface] of Object.entries(surfaces)) {
      if (name === 'disabled') continue;   // drawn at the box's own size, not scaled to it
      surface.width = box.width;
      surface.height = box.height;
    }
    disabled.clear();
    const rim = { width: Math.max(1, Math.round(k)), color: COLOUR.mute, alignment: 0.5 };
    if (kind === 'icon') disabled.circle(box.height / 2, box.height / 2, box.height / 2).fill(COLOUR.muteSoft).stroke(rim);
    else disabled.roundRect(0, 0, box.width, box.height, radius).fill(COLOUR.muteSoft).stroke(rim);

    let x = Math.round((box.width - row) / 2);
    for (const part of list) {
      /* Placed by their own bounds rather than by an anchor: a Text and a Sprite
       * carry an anchor and a drawn glyph does not, and one rule for all three
       * is one place for the centring to go wrong. */
      part.position.set(x, Math.round((box.height - part.height) / 2));
      node.addChild(part);
      x += Math.ceil(part.width) + Math.round(GAP * k);
    }
    node.hitArea = new Rectangle(0, 0, box.width, box.height);
    paint();
  };

  const paint = () => {
    const wanted = state.disabled ? 'disabled' : state.pressed && pressed ? 'pressed' : 'live';
    for (const [name, surface] of Object.entries(surfaces)) surface.visible = name === wanted;
  };

  node.eventMode = 'static';
  node.cursor = 'pointer';

  const handle = {
    node,
    kind,
    /* Disabling and the reason are one call on purpose: there is no way to grey
     * a control out without writing down, in the caller's own code, what a
     * child is waiting for. */
    setDisabled(disabled_, reason = '') {
      state.disabled = !!disabled_;
      state.reason = state.disabled ? reason : '';
      node.eventMode = state.disabled ? 'none' : 'static';
      node.cursor = state.disabled ? 'default' : 'pointer';
      fit();
      return handle;
    },
    get disabled() { return state.disabled; },
    label: () => state.label,
    /* The one string a screen reader would be given, since the canvas is a
     * single node: a screen hands this to the shell's live region. */
    spoken: () => (state.disabled && state.reason ? `${state.label}, ${state.reason}` : state.label),
    /* Which surface is drawn right now — the face a check can assert on. */
    face: () => (state.disabled ? 'disabled' : state.pressed && pressed ? 'pressed' : 'live'),
    measure: () => ({ kind, width: box.width, height: box.height, disabled: state.disabled }),
    destroy() { parent.removeChild(node); node.destroy({ children: true }); },
  };

  /* Press is a face first and a dip second: the face swap is what a child sees
   * on a device that asks for less motion, so the feedback never disappears
   * with the animation. */
  const down = () => { if (!state.disabled) { state.pressed = true; if (animates()) node.scale.set(0.97); paint(); } };
  const up = () => { if (!state.disabled) { state.pressed = false; node.scale.set(1); paint(); } };
  node.on('pointerdown', down);
  node.on('pointerup', up);
  node.on('pointerupoutside', up);
  node.on('pointertap', () => { if (!state.disabled && typeof onPress === 'function') onPress(handle); });

  fit();
  parent.addChild(node);
  return handle;
}
