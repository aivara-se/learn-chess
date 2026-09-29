/* The board as a route you can look at — the fixture the two board cards after
 * this one are read against.
 *
 *     #/board-fixture/<pose>
 *
 * with five poses: `start`, `fork`, `mate`, `promotion` and `empty`. Two more
 * segments may follow it, in either order:
 *
 *     a square name   pick that square and draw the squares its piece can reach
 *     `black`         draw the board from Black's side
 *
 * so `#/board-fixture/fork`, `#/board-fixture/promotion/a7` and
 * `#/board-fixture/mate/g5/black` are all addresses. The square is picked from
 * the engine's own legal moves for the piece standing there; nothing here is
 * wired to a tap, because this screen is the *look* of a board and #10 is where
 * the taps arrive.
 *
 * The fork and the mate are the course's own positions — the pack's first drill
 * and a mate in one from the ladder — read out of `src/data/lessons.js` rather
 * than copied, so a drill that moves in the data moves here too. The promotion
 * pose is this file's own: the course has no promotion drill, and the fixture is
 * not course data.
 *
 * It leaves a handle on `window` — `learnChessBoard` — as the shell does, so a
 * browser check can ask the screen what it drew and make one piece walk without
 * a lesson around it:
 *
 *     await window.learnChessBoard.walk('d5', 'f6')   // resolves when it lands
 */
import { Text } from '../../vendor/pixi/pixi.min.mjs';
import {
  START_FEN,
  legalMoves,
  legalMovesFrom,
  makeMove,
  parseFen,
  parseSquare,
  pieceAt,
  squareName,
  toFen,
} from '../engine/engine.js';
import { LESSONS, PACKS } from '../data/lessons.js';
import { createBoard } from '../board/board.js';
import { createPieces } from '../board/pieces.js';

/* The room the board keeps for its own two lines, and the margin around it. At
 * the sizes this screen is read at — a phone held upright and a laptop — the
 * board is the width of the viewport and the square is 42px or the 70px cap. */
const CHROME = 78;
const MARGIN = 8;

/* The old app's measured palette for words on the page; the game's own colours
 * are #9's to set, exactly as `src/scenes/placeholder.js` notes about its own. */
const INK = 0x182046;
const INK_SOFT = 0x454f72;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** A drill from the course, found by the move it teaches. */
function drill(drills, best) {
  const found = drills.find((one) => one.best === best);
  if (!found) throw new Error(`the course has no drill whose move is ${best}`);
  return found;
}

const mateInOne = LESSONS.find((lesson) => lesson.id === 'mate-in-one');
const forkPack = PACKS.find((pack) => pack.id === 'fork');
const mate = drill(mateInOne.drills, 'g5f7');
const fork = drill(forkPack.drills, 'd5f6');

const POSES = {
  start: {
    title: 'The starting position',
    caption: 'Eight pawns and eight pieces a side. The letters run along the bottom, the numbers up the side: a1 is dark.',
    fen: START_FEN,
  },
  fork: {
    title: forkPack.title,
    caption: fork.prompt,
    fen: fork.fen,
    pick: 'd5',
  },
  mate: {
    title: mateInOne.title,
    caption: mate.prompt,
    fen: mate.fen,
    pick: 'g5',
  },
  promotion: {
    title: 'A pawn one step from the last rank',
    caption: 'A pawn that reaches the far rank becomes a queen. Both sides have one a step away.',
    fen: '4k3/P6p/8/8/8/8/p6P/4K3 w - - 0 1',
    pick: 'a7',
  },
  empty: {
    title: 'An empty board',
    caption: 'Sixty-four squares and nothing on them. a1 is a dark square, h1 is a light one.',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
  },
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* `#/board-fixture/fork/d5/black`: the pose, a square to pick, and which way the
 * board faces. A segment that names none of those is not an address this screen
 * can draw, and the screen says so rather than drawing something else. */
function readRoute(params) {
  const [name = 'start', ...rest] = params;
  let flipped = false;
  let picked = -1;
  for (const segment of rest) {
    if (segment === 'black') {
      flipped = true;
      continue;
    }
    const sq = parseSquare(segment);
    if (sq < 0) return { problem: `“${segment}” is neither a square nor “black”` };
    picked = sq;
  }
  return { name, flipped, picked, pose: POSES[name] ?? null };
}

let scene = null;

/* Everything the fixture draws, for one viewport: the board, the pieces, the two
 * lines of words, and the position they are about. */
function layout(context) {
  const room = Math.min(context.width - MARGIN * 2, context.height - CHROME - MARGIN * 2);
  const board = scene.board.place({
    width: context.width,
    height: context.height,
    room,
    flipped: scene.flipped,
  });
  scene.pieces.setViewport({ layout: board, flipped: scene.flipped });

  const titleSize = Math.min(26, Math.max(16, Math.round(board.square * 0.5)));
  const captionSize = Math.min(16, Math.max(12, Math.round(board.square * 0.34)));
  scene.title.style.fontSize = titleSize;
  scene.caption.style.fontSize = captionSize;
  scene.title.style.wordWrapWidth = context.width - MARGIN * 2;
  scene.caption.style.wordWrapWidth = context.width - MARGIN * 2;
  scene.title.position.set(Math.round(context.width / 2), Math.round(board.top / 2));
  scene.caption.position.set(
    Math.round(context.width / 2),
    Math.round(board.top + board.side + (context.height - board.top - board.side) / 2),
  );

  scene.board.mark({ selected: scene.picked >= 0 ? scene.picked : null, targets: scene.targets });
}

/** A screen that cannot draw the address it was given says which part it did not
 *  understand, and draws nothing else. */
function problem(context, text) {
  const title = new Text({ text, style: { fontFamily: FONT, fontWeight: '700', fill: INK } });
  const caption = new Text({
    text: `Try ${Object.keys(POSES).join(', ')} — like #/board-fixture/start.`,
    style: { fontFamily: FONT, fill: INK_SOFT, wordWrap: true, wordWrapWidth: context.width - MARGIN * 2 },
  });
  const centre = Math.round(context.width / 2);
  title.anchor.set(0.5, 0.5);
  title.position.set(centre, Math.round(context.height / 2 - 20));
  caption.anchor.set(0.5, 0.5);
  caption.position.set(centre, Math.round(context.height / 2 + 12));
  context.layer.addChild(title, caption);
}

export default {
  mount(context) {
    const route = readRoute(context.params);
    if (route.problem || !route.pose) {
      problem(context, route.problem ?? `There is no pose called “${route.name}”.`);
      return;
    }

    const position = parseFen(route.pose.fen);
    const named = route.picked >= 0 ? route.picked : parseSquare(route.pose.pick ?? '');
    const piece = named >= 0 ? pieceAt(position, named) : null;
    /* A square is picked only when one of the player's own pieces stands on it —
     * the rule a tap will follow in #10 — and the squares it can reach are the
     * engine's own moves, one mark per square. */
    const picked = piece && piece.color === position.turn ? named : -1;
    const moves = picked >= 0 ? legalMovesFrom(position, picked) : [];
    const targets = [
      ...new Map(moves.map((move) => [move.to, { square: move.to, capture: !!pieceAt(position, move.to) }])).values(),
    ];

    const board = createBoard();
    const pieces = createPieces({ app: context.app });
    const title = new Text({ text: '', style: { fontFamily: FONT, fontWeight: '700', fill: INK, wordWrap: true } });
    const caption = new Text({
      text: '',
      style: { fontFamily: FONT, fill: INK_SOFT, wordWrap: true, align: 'center' },
    });
    title.anchor.set(0.5);
    caption.anchor.set(0.5);
    context.layer.addChild(board.surface, pieces.view, board.marks, title, caption);

    const notes = [];
    if (route.flipped) notes.push('drawn from Black’s side');
    if (reducedMotion()) notes.push('reduced motion is on');
    title.text = picked >= 0 ? `${route.pose.title} — ${squareName(picked)} picked` : route.pose.title;
    caption.text = [route.pose.caption, ...notes].join(' · ');

    scene = {
      board,
      pieces,
      title,
      caption,
      flipped: route.flipped,
      position,
      picked,
      targets,
    };
    /* The board first — it is what places the pieces — and then the position. */
    layout(context);
    pieces.show(route.pose.fen);

    /* The handle a browser check reads, in the shape the shell already uses for
     * its own. `walk` makes the move in the position the screen is showing and
     * resolves when the piece has landed, so the check can time it. */
    window.learnChessBoard = {
      pose: () => route.name,
      fen: () => toFen(scene.position),
      layout: () => ({ ...scene.board.layout(), flipped: scene.flipped }),
      picked: () => (scene.picked >= 0 ? squareName(scene.picked) : null),
      targets: () => scene.targets.map((target) => squareName(target.square)),
      walk: (from, to) => {
        const move = legalMoves(scene.position).find(
          (one) => one.from === parseSquare(from) && one.to === parseSquare(to),
        );
        if (!move) return Promise.resolve(false);
        scene.position = makeMove(scene.position, move);
        scene.pieces.show(toFen(scene.position));
        return scene.pieces.walk(move);
      },
    };
  },

  resize(context) {
    if (scene) layout(context);
  },

  /* The shell destroys the layer and its children after this runs; dropping the
   * references is what keeps a late resize from touching destroyed objects, and
   * the ticker has to be let go of by hand. */
  unmount() {
    scene?.pieces.destroy();
    scene = null;
    delete window.learnChessBoard;
  },
};
