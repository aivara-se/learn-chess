/* The sheet — what a tap answers with.
 *
 * The map has one thing to say that does not fit on it: a stop that is not open
 * still answers, names the lesson that opens it, and — once that lesson is
 * playable — offers the button that walks the child there. That is the old rule and
 * a good one: a locked stop is a door, not a wall. A stop that looks playable and
 * does nothing is the one outcome the design document forbids.
 *
 * The sheet is the card the kit draws, on a scrim, with the two buttons a child
 * already knows from the rest of the game: a raised one for the way forward and a
 * flat one for "not now". It is built at the size the window has when it opens and
 * thrown away when it closes, so a sheet can never be left standing over a screen
 * that changed size under it.
 *
 * It is built here rather than in `src/ui/**` because it is not part of the kit: the
 * kit's components are the parts every screen shares, and a sheet is how this screen
 * answers a tap. `#41`'s lesson screen wants the same thing — that is the moment to
 * move it, not before.
 */
import { Container, Graphics } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, GAP, LIFT, PAD, TAP_FLOOR, TYPE, card, scale as clamped, text } from '../ui/theme.js';
import { createButton } from '../ui/button.js';
import { SPRITE, sprite } from '../ui/assets.js';

const MAX_WIDTH = 420;

export function openSheet(parent, { width, height, scale = 1, icon = '', title, text: body, action = '', cancel = '', onAction, onCancel, onClosed }) {
  const k = clamped(scale);
  const pad = Math.round(PAD * k);
  const node = new Container();
  const scrim = new Graphics().rect(0, 0, width, height).fill({ color: COLOUR.ink, alpha: 0.45 });
  node.addChild(scrim);

  const box = new Container();
  const shape = new Graphics();
  const face = icon ? sprite(SPRITE[icon] ?? SPRITE.lock, { width: Math.round(28 * k), height: Math.round(28 * k) }) : null;

  const boxWidth = Math.round(Math.min(width, MAX_WIDTH) - 2 * pad);
  const wrap = boxWidth - Math.round(2 * PAD * k);
  const titleNode = text(title, { size: Math.round(TYPE.body * k), weight: '700', colour: COLOUR.ink });
  const bodyNode = text(body, { size: Math.round(TYPE.small * k), weight: '500', colour: COLOUR.inkSoft });
  for (const line of [titleNode, bodyNode]) {
    line.style.wordWrap = true;
    line.style.wordWrapWidth = wrap;
    line.style.lineHeight = Math.round(line.style.fontSize * 1.35);
  }
  box.addChild(shape);
  if (face) box.addChild(face);
  box.addChild(titleNode, bodyNode);

  /* One pass down the card: everything is placed by its own height and the gaps
   * between them are the kit's, so a longer sentence makes a taller sheet rather
   * than a button pushed off the card. */
  let y = pad;
  const titleX = face ? pad + face.width + Math.round(GAP * k) : pad;
  if (face) face.position.set(pad, y);
  titleNode.position.set(titleX, y);
  y += Math.max(titleNode.height, face ? face.height : 0) + Math.round(LIFT * k);
  bodyNode.position.set(pad, y);
  y += bodyNode.height + Math.round(GAP * k);

  const buttons = [];
  const add = (label, options) => {
    const button = createButton(box, { label, scale: k, width: (boxWidth - 2 * pad) / k, ...options });
    button.node.position.set(pad, y);
    buttons.push(button);
    y += Math.round(TAP_FLOOR * k) + Math.round(LIFT * k);
  };
  if (action) add(action, { onPress: () => { close(); onAction?.(); } });
  if (cancel) add(cancel, { kind: 'quiet', onPress: () => { close(); onCancel?.(); } });

  const boxHeight = y - Math.round(buttons.length ? LIFT * k : GAP * k) + pad;
  card(shape, boxWidth, boxHeight, k);
  box.position.set(Math.round((width - boxWidth) / 2), Math.round(Math.max(pad, (height - boxHeight) / 2)));
  node.addChild(box);

  /* The scrim closes the sheet: a tap outside the card is "not now", the same
   * answer the flat button gives. It is interactive, so it also swallows a tap
   * that was meant for the map underneath. */
  scrim.eventMode = 'static';
  scrim.on('pointertap', () => { close(); onCancel?.(); });
  parent.addChild(node);

  /* Closing happens from three places — the two buttons, the scrim, and the screen
   * being taken down under it — so it has to survive being called twice: the layer
   * the sheet lives on is destroyed by the shell, and a second `removeChild` on a
   * dead node throws where nothing can catch it. */
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (node.parent) node.parent.removeChild(node);
    node.destroy({ children: true });
    /* The screen holds the open sheet and has to be told when it goes: a screen that
     * only learns a sheet closed by checking a flag would hand a stale one to the
     * next reader, and its own handle would go on reporting words that are gone. */
    onClosed?.();
  }

  /* What the sheet is showing, for a check: read once, while the nodes are alive —
   * a check that arrives after the sheet closed must get the words it showed rather
   * than an exception out of a destroyed one. */
  const shown = {
    title: titleNode.text,
    text: bodyNode.text,
    action: action || null,
    cancel: cancel || null,
    buttons: buttons.map((button) => button.label()),
    /* Where each button really is, in the page's own pixels: a check taps the control
     * rather than a guess at where the card put it. */
    points: buttons.map((button) => {
      const size = button.measure();
      return {
        label: button.label(),
        x: Math.round(box.position.x + button.node.position.x + size.width / 2),
        y: Math.round(box.position.y + button.node.position.y + size.height / 2),
      };
    }),
    box: { x: box.position.x, y: box.position.y, width: boxWidth, height: boxHeight },
  };

  return {
    node,
    close,
    state: () => ({ ...shown }),
  };
}
