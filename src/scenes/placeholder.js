/* The screen the game opens on while the course is being rebuilt.
 *
 * It is a placeholder with one job: to prove the pipeline end to end — route →
 * module → stage → pixels — before any feature exists, and to be the thing a
 * browser check at 360px and at 1440px can look at. A drawn board is enough for
 * that; it is not the board.
 *
 * The path (#11) and the lesson (#10) are the real screens, and whichever of
 * them lands first deletes this file rather than leaving a second first screen
 * behind it.
 *
 * It takes one parameter: `#/placeholder/black` draws the board from Black's
 * side. That is the route convention's one demonstration — the engine numbers
 * squares 0 = a1 … 63 = h8 and the drawing is what maps them to the screen.
 */
import { Container, Graphics, Text } from '../../vendor/pixi/pixi.min.mjs';

/* The old app's measured palette; the game's own colours are #9's to set. */
const SQUARE_LIGHT = 0xf7e8c9;
const SQUARE_DARK = 0x8fc177;
const INK = 0x182046;
const INK_SOFT = 0x454f72;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

let board = null;    // the container the squares live in
let squares = null;  // the 64 squares, redrawn whenever the size changes
let heading = null;
let caption = null;
let flipped = false;

function text(string, size, fill) {
  return new Text({
    text: string,
    style: { fontFamily: FONT, fontSize: size, fontWeight: '600', fill },
  });
}

/* The whole of the drawing, for one size: the square is a whole number of
 * pixels and the board is centred on it, because half a pixel is a blurred
 * edge and a board that is re-derived every frame is a board that shimmers. */
function layout(context) {
  const side = Math.floor((Math.min(context.width, context.height) * 0.78) / 8) * 8;
  const square = side / 8;
  const left = Math.round((context.width - side) / 2);
  const top = Math.round((context.height - side) / 2);

  squares.clear();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      /* Screen position to board square, from White's side or from Black's. The
       * colour comes from the square, not the cell: a1 and h8 stay dark. */
      const file = flipped ? 7 - col : col;
      const rank = flipped ? row : 7 - row;
      const light = (file + rank) % 2 === 1;
      squares
        .rect(left + col * square, top + row * square, square, square)
        .fill(light ? SQUARE_LIGHT : SQUARE_DARK);
    }
  }

  const titleSize = Math.max(16, Math.min(30, Math.round(square * 0.72)));
  heading.style.fontSize = titleSize;
  caption.style.fontSize = Math.max(12, Math.round(titleSize * 0.52));
  /* Both texts are anchored at their centre, so each is placed at the middle of
   * the space it has: above the board for the title, below it for the line. */
  heading.position.set(Math.round(context.width / 2), Math.round(top / 2));
  caption.position.set(
    Math.round(context.width / 2),
    Math.round(top + side + (context.height - top - side) / 2),
  );
}

export default {
  mount(context) {
    flipped = context.params[0] === 'black';
    squares = new Graphics();
    board = new Container();
    board.addChild(squares);
    heading = text('Learn chess', 24, INK);
    caption = text('The course is being rebuilt — this is the shell.', 13, INK_SOFT);
    heading.anchor.set(0.5);
    caption.anchor.set(0.5);
    context.layer.addChild(board, heading, caption);
    layout(context);
  },

  resize(context) {
    if (squares) layout(context);
  },

  /* The shell destroys the layer and its children after this runs; dropping the
   * references is what keeps a late resize from touching destroyed objects. */
  unmount() {
    board = null;
    squares = null;
    heading = null;
    caption = null;
  },
};
