/* The stop a child plays — `#/lesson/<n>` for a lesson, `#/pack/<id>` for a
 * detour — where they read one idea and play the puzzles that teach it.
 *
 * A stop is data (`src/data/lessons.js`) and it is walked as a list of steps:
 * a paragraph to read, the diagram to look at, the puzzles to play, and the
 * panel that says what is open now. `src/lesson/steps.js` makes that list; this
 * screen draws it. **A pack is this screen under a second address**: the route
 * resolves differently (`src/lesson/address.js`) and the words around the board
 * say what a detour needs to say, and the drill loop, the coach, the star rule
 * and the record are the ones below — once, because a second copy of them is
 * what `docs/PORT.md` says a port must never become.
 *
 * **The drill loop is `v1`'s, whole.** The prompt, the hint, tapping a piece and
 * then a square it can reach, the wrong answer in the app's own words, the star
 * for a solve on the first try, and the reveal that plays the accepted move on
 * the board and says what it was. `docs/PORT.md` is the contract and every one of
 * those was measured in the old app; nothing here is simplified away.
 *
 * **The coach has two voices and they are two elements.** The bubble is Pip
 * judging the move just played and it keeps what it said until the child moves
 * again; the line under the divider is what happened, and the reveal is written
 * there. His reply used to be written into the bubble 332ms after a tap, which
 * is why `docs/PORT.md` carries the bug: a verdict a child cannot read is a
 * verdict that does not exist.
 *
 * Three things a reader should know before changing it:
 *
 *   - **The grade is a search, so the move is painted first and graded after.**
 *     In `v1` the search ran before the repaint and a tap at level 3 froze the
 *     board for a fifth of a second with nothing on screen to say it had landed.
 *   - **The board takes what its screen has left, down to its 240px floor, and
 *     everything else gives way before it does** (`docs/PORT.md`). Its room is
 *     measured from the blocks above and below it, so a longer verdict is a
 *     taller page and never a smaller board.
 *   - **The strip at the bottom of the window is the shell's.** `#status` is a
 *     fixed bar over the canvas while it carries a sentence, so the page stops
 *     short of it by `STATUS` and no control is drawn underneath it.
 *
 * `window.learnChessLesson` is the handle a browser check reads, beside the
 * shell's own `window.learnChess` and the kit's `window.learnChessKit`: the step
 * the screen is on, every square where it is really drawn, the controls, the
 * coach's two voices, and what was written to the child's record. A check reads
 * it on `#/pack/<id>` too — the handle is the screen's, and the screen is one,
 * whichever address opened it.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, GAP, LIFT, PAD, TAP_FLOOR, TYPE, card, text } from '../ui/theme.js';
import { SPRITE, loadChrome, sprite } from '../ui/assets.js';
import { createButton } from '../ui/button.js';
import { createSpeech } from '../ui/speech.js';
import { LESSONS } from '../data/lessons.js';
import * as progress from '../path/progress.js';
import { createBoard } from '../board/board.js';
import { createPieces } from '../board/pieces.js';
import { cornerOf, squareSize } from '../board/geometry.js';
import { makeMove, parseFen, pieceAt, squareName, toFen } from '../engine/engine.js';
import { lessonAddress } from '../lesson/address.js';
import { nextStop, numberOf, openedBy, puzzlesIn, stepsFor } from '../lesson/steps.js';
import { describeMove, grade, NAMES } from '../lesson/coach.js';
import { answered, answerMove, moveFor, targetsFor } from '../lesson/drill.js';
import { squareAt } from '../lesson/board-input.js';
import { solve } from '../lesson/record.js';

/* Loaded at the top of the module on purpose: the shell imports a scene inside
 * its own try/catch, so a sprite that is not there is a screen the shell knows
 * how to report rather than a promise nobody is holding. */
const SPRITES = await loadChrome();

/* The column the lesson lives in — 520 is the width the old document capped the
 * board's column at, and the path's own choice, so a wider window gets margins
 * rather than a stretched phone. Everything inside it is the kit at scale 1: a
 * finger does not get smaller on a laptop, and neither does a line of copy. */
const COLUMN = 520;
const TOP = 8;        // the header's own margin from the top of the window
const ROW = 10;       // between the blocks of a step
const DRAG = 6;       // how far a finger travels before it is a drag, not a tap
const FLOOR = 240;    // the board's own floor, `docs/PORT.md`
const STAR = 22;      // the star a solved puzzle wears on the completion card
/* What the shell's own bar takes at the bottom of the window while it carries a
 * sentence. `#status` is fixed over the canvas and grows with the words in it —
 * a drill's hint is fifty-five characters, which wraps to two lines on a phone —
 * so the page reserves the taller of the two, measured in the browser at
 * 360×640: 66px for two lines of 14px copy and its padding. */
const STATUS = 66;

/* …and the gap a control keeps from it: a button whose edge is the bar's edge is
 * a button half of whose taps land on the bar. */
const CLEAR = 4;

const status = document.getElementById('status');

let view = null;
let wheel = null;

/* ---- the shell's live region, which is the only voice this screen has ---- */

function announce(line) {
  status.textContent = line;
  status.hidden = !line;
}

const sayStar = (star) => (star ? 'Correct — a star!' : 'Correct!');

/* ---- small pieces of the kit, composed ---- */

/**
 * A white card with as many wrapped lines as it is given. The card itself is
 * `theme.js`'s, so the radius, the rim and the 2px shadow are the measured ones;
 * the height comes from the words in it rather than from a constant, because a
 * card that is shorter than its own copy is copy a child cannot read.
 *
 * An entry may also be `{ node, height }` — a piece built by the caller and laid
 * out in the flow, which is how the completion card carries its row of stars.
 */
function cardBox(parent, { width, lines = [], gap = LIFT }) {
  const wrap = width - 2 * PAD;
  const entries = lines.map((line) => {
    if (line.node) return line;
    const node = text(line.string, {
      size: line.size ?? TYPE.body,
      weight: line.weight ?? '600',
      colour: line.colour ?? COLOUR.ink,
      align: line.align ?? 'left',
      wrap,
    });
    return { node, height: node.height };
  });
  const inner = entries.reduce((total, entry, i) => total + entry.height + (i ? gap : 0), 0);
  const height = Math.round(2 * PAD + inner);

  const shape = new Graphics();
  card(shape, width, height, 1);
  const box = new Container();
  box.addChild(shape);
  let y = PAD;
  for (const entry of entries) {
    entry.node.position.set(PAD, Math.round(y));
    box.addChild(entry.node);
    y += entry.height + gap;
  }
  parent.addChild(box);
  return { node: box, entries, height };
}

/* A star won is the pack's filled star and a star not won its outline: two
 * shapes, so the row reads to a child who cannot tell two colours apart. */
function starRow(parent, got, of) {
  const box = new Container();
  for (let i = 0; i < of; i += 1) {
    const node = sprite(i < got ? SPRITE.star : SPRITE.starOutline, { width: STAR, height: STAR });
    node.position.set(i * (STAR + 4), 0);
    box.addChild(node);
  }
  parent.addChild(box);
  return { node: box, width: Math.max(0, of * (STAR + 4) - 4), height: STAR };
}

/* How far into the lesson the child is. The dots are the only sign of it, so
 * they are a shape as well as a colour: a puzzle is a star, a page to read is a
 * dot, and the step they are on wears a ring. */
function stepDots(parent, steps, at, won) {
  const box = new Container();
  const size = 16;
  const pitch = size + 8;
  const mark = (node, i) => { node.position.set(i * pitch, 2); box.addChild(node); };
  steps.forEach((step, i) => {
    if (step.kind === 'drill') {
      mark(sprite(won.has(step.i) ? SPRITE.star : SPRITE.starOutline, { width: size, height: size }), i);
    } else {
      mark(new Graphics().circle(size / 2, size / 2, 4).fill(COLOUR.mute), i);
    }
    if (i === at) {
      box.addChild(new Graphics().circle(i * pitch + size / 2, 2 + size / 2, size / 2 + 2).stroke({ width: 2, color: COLOUR.ink }));
    }
  });
  parent.addChild(box);
  return { node: box, width: Math.max(0, steps.length * pitch - 8), height: size + 4 };
}

/* A row of the kit's buttons, wrapped when the column is narrower than they are.
 * The buttons themselves come back, because a check wants their hit areas and
 * the centre of each one in the page's own pixels. */
function rowOf(parent, specs, width, gap = GAP) {
  const node = new Container();
  const buttons = [];
  let x = 0;
  let y = 0;
  let tallest = 0;
  for (const spec of specs) {
    const button = createButton(node, { scale: 1, ...spec });
    const size = button.measure();
    if (x > 0 && x + size.width > width) {
      y += tallest + LIFT;
      x = 0;
      tallest = 0;
    }
    button.node.position.set(x, y);
    x += size.width + gap;
    tallest = Math.max(tallest, size.height);
    buttons.push(button);
  }
  parent.addChild(node);
  return { node, buttons, height: y + tallest };
}

/* ---- the board ---- */

/* One board and one set of pieces for the whole screen. The board is re-laid and
 * the pieces are re-shown per step; they are never rebuilt, because the walk
 * animation belongs to the sprite that already stands on the square, and a
 * screen that rebuilds its pieces cannot show which piece went where. */
function makeBoard(context) {
  const node = new Container();
  const board = createBoard();
  const pieces = createPieces({ app: context.app });
  const hit = new Graphics();
  hit.eventMode = 'static';
  node.addChild(board.surface, pieces.view, board.marks, hit);
  hit.on('pointertap', (event) => {
    /* A tap is not a drag: `pointertap` fires on whatever the finger lifted over,
     * so a board scrolled under one never counts as pressed. */
    if (view?.dragged) return;
    const drill = view?.drill;
    if (!drill || view.step !== drill.at) return;
    const at = node.getGlobalPosition();
    tapSquare(squareAt({ x: event.global.x - at.x, y: event.global.y - at.y }, view.band.layout, drill.flipped));
  });
  return { node, board, pieces, hit, layout: null, side: 0 };
}

/* Size the board into the room it has been given, in the column's own width, and
 * answer with the side it really drew: a whole, even square, never a fraction of
 * one. */
function placeBoard(band, { width, room, flipped, interactive }) {
  const side = squareSize(Math.min(room, width - 2 * PAD)) * 8;
  const layout = band.board.place({ width, height: side, room: side, flipped });
  band.pieces.setViewport({ layout, flipped });
  band.hit.hitArea = new Rectangle(layout.left, layout.top, layout.side, layout.side);
  band.hit.eventMode = interactive ? 'static' : 'none';
  band.layout = layout;
  band.side = side;
  return side;
}

/* The piece on its way, if one is.
 *
 * `src/board/pieces.js` shows a position by destroying every sprite and building
 * the new ones, and a walk in flight is a promise over one of those sprites. So
 * a repaint that lands while a piece is still walking replaces the sprite
 * underneath it: the board's ticker then reaches for a destroyed sprite, throws,
 * and the ticker is what dispatches events — the screen stops answering taps
 * altogether. Measured, not guessed: two `show()` calls inside the same 160ms
 * walk freeze `#/lesson/1` (the board module is #8's, and this defect and its
 * patch are written up in the pull request rather than changed here — this card
 * is told not to touch `src/board/**`).
 *
 * What this screen can do is never be the caller that trips it: nothing is
 * repainted while a piece is walking — the walk a wrong move is taken back with
 * included, which is the window this screen used to leave open: it kept `busy`
 * only while the child's own move walked out, and a Hint or a tap during the
 * walk back is the same repaint in the same walk. So every step change waits for
 * the board to come to rest first, and so does every tap and every hint. */
let walking = Promise.resolve(false);

/* ---- the drill loop ---- */

const pieceWord = (piece) => (piece ? `${piece.color === 'w' ? 'white' : 'black'} ${NAMES[piece.type]}` : 'empty');

/* What the board is asked to draw right now: the hint, when one was asked for and
 * the child has not touched the board since, and otherwise their own selection. */
function marks(drill) {
  if (drill.hintMove && drill.selected == null) {
    return {
      selected: drill.hintMove.from,
      targets: [{ square: drill.hintMove.to, capture: !!pieceAt(drill.pos, drill.hintMove.to) }],
    };
  }
  return { selected: drill.selected, targets: drill.targets };
}

/* Repaint the drill's position, and start a walk if one was asked for. Hands back
 * the walk to wait on — the one it started, or the one still in flight — so a
 * caller can hold its own painting until the piece has landed: a wrong move is
 * taken back only once it has been seen. */
function paintDrill({ walk = null } = {}) {
  const drill = view.drill;
  view.band.board.mark(marks(drill));
  view.band.pieces.show(toFen(drill.pos));
  /* Only a paint that starts a walk replaces the one being waited on; a paint
   * with no walk of its own leaves the promise alone, so nothing lets go of a
   * piece that is still on its way. */
  if (walk) walking = view.band.pieces.walk(walk);
  return walking;
}

function turnName(drill) {
  if (drill.solved) return 'Puzzle solved';
  if (drill.shown) return 'The move is shown';
  return drill.pos.turn === 'w' ? 'White to move — your turn' : 'Black to move — your turn';
}

/* Tap a piece, then tap where it goes — `v1`'s rule, and the promotion rule with
 * it: a tap on a square four promoting moves reach means the one the drill
 * accepts, because a child cannot have meant another. */
function tapSquare(square) {
  const drill = view?.drill;
  if (!drill || square == null || drill.locked || drill.busy) return;
  const pos = drill.pos;

  if (drill.selected != null && drill.targets.some((target) => target.square === square)) {
    const move = moveFor(pos, drill.selected, square, drill.drill);
    drill.selected = null;
    drill.targets = [];
    drill.hintMove = null;
    if (move) play(move);
    else paintDrill();
    return;
  }

  const piece = pieceAt(pos, square);
  if (piece?.color === pos.turn) {
    if (drill.selected === square) {
      drill.selected = null;
      drill.targets = [];
    } else {
      drill.selected = square;
      drill.targets = targetsFor(pos, square);
    }
    drill.hintMove = null;
    paintDrill();
    announce(drill.targets.length
      ? `${squareName(square)}, ${pieceWord(piece)}, ${drill.targets.length} ${drill.targets.length === 1 ? 'square' : 'squares'} to move to`
      : `${squareName(square)}, ${pieceWord(piece)}, nowhere to go`);
    return;
  }

  drill.selected = null;
  drill.targets = [];
  drill.hintMove = null;
  paintDrill();
  announce(piece ? `${squareName(square)}, ${pieceWord(piece)}` : `${squareName(square)}, empty`);
}

/* A move the child played. Everything that changes the screen happens here, and
 * the grade — the only search in the lesson — happens after the paint. */
function play(move) {
  const drill = view.drill;
  const pos = drill.pos;
  const ok = answered(drill.drill, move);
  drill.tries += 1;
  drill.last = move;
  drill.selected = null;
  drill.targets = [];
  drill.hintMove = null;
  drill.pos = makeMove(pos, move);

  const revealed = !ok && drill.tries >= 2;
  drill.solved = ok;
  drill.shown = revealed;
  if (ok || revealed) drill.locked = true;
  /* A wrong move is on the board to be seen: taps wait until it has walked back. */
  if (!ok && !revealed) drill.busy = true;

  /* A move that has just lost the puzzle is not walked in: the reveal plays the
   * answer a moment later, and animating a move that is about to be replaced is
   * motion the child cannot read. */
  const walked = paintDrill(revealed ? {} : { walk: { from: move.from, to: move.to } });

  let written = null;
  if (ok || revealed) {
    /* A star is a first-try solve, and this loop is the only place that knows
     * what the child did: one wrong move, or one look at the hint, and the
     * puzzle is solved without a star. A puzzle the coach had to show is still
     * solved — the path opens on it like any other — it just carries no star. */
    written = solve(view.unit, drill.index, { firstTry: ok && drill.tries === 1 && !drill.hinted });
  }
  drawStep();
  announce(ok
    ? `${sayStar(written?.star)} ${turnName(drill)}.`
    : revealed ? 'Here is the move.' : 'Not that one. Have another go.');

  /* Pip's verdict is a search: the move is on the board first and he says what
   * he thought of it after. `drill` is re-checked because a route change in the
   * meantime has taken the screen down. */
  setTimeout(() => {
    if (view?.drill !== drill) return;
    const said = grade(pos, move);
    let reply;
    if (ok) {
      reply = drill.drill.why;
    } else if (revealed) {
      const best = answerMove(pos, drill.drill);
      if (best) {
        drill.pos = makeMove(pos, best);
        drill.last = best;
        paintDrill({ walk: { from: best.from, to: best.to } });
        reply = `The move is to ${describeMove(pos, best).verb}. ${drill.drill.why}`;
      } else {
        reply = drill.drill.why;
      }
    } else {
      reply = `${drill.drill.hint}. Have another go.`;
    }
    view.coach.verdict(said.line, said.tone);
    view.coach.reply(reply);
    drawStep();
    /* the reply is the one thing this screen exists to hand over, so it is put
     * above the row the moment he says it */
    showReply();
    /* …and then the piece goes back where it came from, so the puzzle is the
     * puzzle again. Graded from `pos`, never from the move that was taken back. */
    if (!ok && !revealed) {
      walked.finally(() => {
        if (view?.drill !== drill) return;
        drill.pos = pos;
        drill.last = null;
        /* The walk back is a walk this screen started, so the guard holds for it
         * too: `paintDrill()` is a `show()`, `show()` destroys every sprite, and
         * a walk in flight is a promise over one of them. A tap or a hint in
         * this window is what the board's ticker throws on
         * (`src/board/pieces.js`, #8) — so the screen is busy for the whole
         * walk, not just the half of it that is the move. */
        drill.busy = true;
        const back = paintDrill({ walk: { from: move.to, to: move.from } });
        back.finally(() => {
          if (view?.drill !== drill) return;
          drill.busy = false;
        });
      });
    }
  }, 0);
}

/* The hint: the drill's own sentence in the coach's second voice, and the piece
 * and the square the answer moves between ringed on the board. It costs the
 * star — "a star means first try", and a hint is not a first try.
 *
 * The guard is the same one a tap takes: while a piece is walking, a repaint is
 * a destroyed sprite under a live walk, and the board's ticker throws on it. */
function hint() {
  const drill = view?.drill;
  if (!drill || drill.locked || drill.busy) return;
  const best = answerMove(drill.pos, drill.drill);
  drill.hinted = true;
  drill.selected = null;
  drill.targets = [];
  drill.hintMove = best ? { from: best.from, to: best.to } : null;
  paintDrill();
  view.coach.verdict('Here is the idea.', 'plain');
  view.coach.reply(drill.drill.hint);
  drawStep();
  showReply();
  announce(drill.drill.hint);
}

/* ---- the header ---- */

/* The header is where the child is and how far in: the stop and the puzzle in
 * words, and the dots below them as a shape. The lesson's name is not here — the
 * pages that are read carry it, as the old app's own bar carried the stop's
 * number rather than its title, and a header tall enough for a two-line title is
 * a header that costs the board room on the smallest phone. */
function buildHeader(context) {
  const column = view.column;
  const group = new Container();
  const line = text('', { size: TYPE.tiny, weight: '700', colour: COLOUR.inkMute, align: 'center', wrap: column - 2 * PAD });
  line.anchor.set(0.5, 0);
  line.position.set(Math.round(column / 2), TOP);
  const dotsY = TOP + line.height + 4;
  const dots = new Container();
  group.addChild(line, dots);
  /* 20 is the dots' own height (`stepDots`), reserved whether or not a step has
   * drawn them yet: a header that grew when the first step landed would move the
   * whole page under the child. */
  const height = dotsY + 20 + 6;

  /* The header is a curtain over the page: opaque, and interactive so a control
   * scrolling underneath it cannot be tapped through. */
  const curtain = new Graphics().rect(0, 0, context.width, height).fill(COLOUR.ground);
  curtain.eventMode = 'static';
  curtain.hitArea = new Rectangle(0, 0, context.width, height);
  group.addChild(curtain);

  view.header = { group, line, dots, dotsY, height };
  return view.header;
}

function drawHeader() {
  const header = view.header;
  const step = view.steps[view.step];
  const puzzles = puzzlesIn(view.steps);
  const at = puzzles.indexOf(step);
  /* Where the child is and how far in: a lesson is its number on the path, and a
   * detour is its own name, because it has no number to count to. */
  const where = progress.isPack(view.unit)
    ? view.unit.title
    : `Lesson ${numberOf(view.unit)} of ${LESSONS.length}`;
  header.line.text = at >= 0 ? `${where} · Puzzle ${at + 1} of ${puzzles.length}` : where;

  const record = progress.read();
  const won = new Set(puzzles
    .filter((entry) => progress.firstTry(record, progress.drillKey(view.unit.id, entry.i)))
    .map((entry) => entry.i));
  header.dots.removeChildren().forEach((node) => node.destroy({ children: true }));
  const dots = stepDots(header.dots, view.steps, view.step, won);
  dots.node.position.set(Math.round((view.column - dots.width) / 2), header.dotsY);
}

/* ---- the step, drawn ---- */

function applyScroll(next) {
  view.scroll = Math.max(0, Math.min(view.maxScroll, Math.round(next)));
  view.page.position.set(view.left, view.header.height - view.scroll);
}

/* Lay the blocks of the current step out from the top of the page: each one is
 * placed from the one above it, so a longer paragraph or a taller verdict is a
 * taller page and never an overlap. The board's own size is decided when the
 * step is built; the blocks below it move instead.
 *
 * The controls are the one exception, and they are pinned on purpose: they sit
 * just above the shell's own bar, **in their own layer outside this page**, and
 * `room` is what the flow may still use — so a scroll moves the reading and
 * never the way on. A row *inside* the page scrolls with the reply, and then the
 * row covers the reply at every position the child can reach: re-measuring the
 * coach grows the page without ever growing the window. What scrolls is the
 * reading; the row the child taps stays where it is. */
function place() {
  const pinned = view.controlsBlock;
  let y = 0;
  for (const block of view.blocks) {
    if (block === pinned) continue;
    y += block.gap ?? 0;
    block.node.position.set(block.x ?? PAD, Math.round(y));
    y += block.height;
  }
  const room = Math.max(0, view.viewport - pinned.height - ROW);
  view.contentHeight = Math.round(y);
  view.maxScroll = Math.max(0, view.contentHeight - room);
  pinned.node.position.set(pinned.x ?? PAD, Math.round(view.header.height + view.viewport - pinned.height));
  applyScroll(Math.min(view.scroll, view.maxScroll));
}

/* The next stop the completion card offers, and the label its button can carry:
 * a button is not a place to wrap a sentence, and a lesson title is up to forty
 * characters, so the longest name that fits the column is the one drawn — the
 * card's own line names the stop in full either way. */
const onwardFrom = (record) => openedBy(record, view.unit).find((entry) => !entry.boss) ?? nextStop(record);

function labelFor(title, width) {
  for (const candidate of [`Next: ${title}`, title, 'Next lesson']) {
    const probe = text(candidate, { size: TYPE.label, weight: '600' });
    const fits = probe.width + 2 * PAD <= width;
    probe.destroy();
    if (fits) return candidate;
  }
  return 'Next lesson';
}

/* The controls of a step, which is the one block that changes between two moves:
 * a puzzle that is solved or shown offers the way on, and before that it offers
 * the hint. They are built into `view.pinned` — the layer outside the scrolling
 * page — so the way on never moves with the reading. */
function controlsFor(step) {
  const width = view.column - 2 * PAD;
  if (step.kind === 'done') {
    const onward = onwardFrom(progress.read());
    return rowOf(view.pinned, onward
      ? [
        { label: labelFor(onward.title, width), onPress: () => { location.hash = `#/lesson/${numberOf(onward)}`; } },
        { label: 'The path', kind: 'quiet', onPress: () => { location.hash = '#/path'; } },
      ]
      : [{ label: 'The path', onPress: () => { location.hash = '#/path'; } }], width);
  }
  const specs = [{ label: 'Back', kind: 'quiet', onPress: () => go(view.step - 1) }];
  const solved = step.kind === 'drill' && (view.drill?.solved || view.drill?.shown);
  if (step.kind === 'drill') {
    specs.push(solved
      ? { label: 'Next', onPress: () => go(view.step + 1) }
      : { label: 'Hint', kind: 'quiet', onPress: hint });
  } else {
    specs.push({ label: 'Next', onPress: () => go(view.step + 1) });
  }
  return rowOf(view.pinned, specs, width);
}

/* Everything that changes between two moves: the caption under the board, the
 * controls, the header, and the place of every block. */
function drawStep() {
  const step = view.steps[view.step];
  if (step?.kind === 'drill' && view.drill?.at === view.step) view.turnCap.text = turnName(view.drill);
  /* The coach is re-measured rather than remembered: he opens with one sentence
   * and answers with three, and a block that keeps the height it was built at is
   * a reply the page never grows to hold — the room below the fold stays exactly
   * what the opening sentence left. */
  if (view.coachBlock && view.coach) view.coachBlock.height = view.coach.measure().height;
  /* The row is rebuilt rather than patched: a disabled button carries its reason
   * in its own label, so a control that changes state is a control that changes
   * size, and the old one has to go or the page draws both. */
  view.controlsBlock.node?.destroy({ children: true });
  const controls = controlsFor(step);
  view.controls = controls;
  view.controlsBlock.node = controls.node;
  view.controlsBlock.height = controls.height;
  drawHeader();
  place();
}

/* What the coach just said is put where it can be read: the reply is the last
 * block above the controls and it is longer than the sentence he opens with, so
 * when he speaks the page comes to rest with it above the row. A reply a child
 * has to find is a reply half of them never read — and `docs/DESIGN.md` §6 says
 * the board is the only thing that may give way, which is exactly what has
 * scrolled off the top here. */
function showReply() {
  if (view.maxScroll > 0) applyScroll(view.maxScroll);
}

/* The words a lesson and a detour do not share. Both are stops on the same
 * screen, so the difference is only what they have to say: a lesson is its
 * number on the path, its title and its goal; a detour has no number and no
 * goal, and carries the idea its puzzles practise — which is the step's own text
 * below this header rather than a second copy of it here. */
function openingLines(unit) {
  if (progress.isPack(unit)) {
    return [
      { string: 'Detour', size: TYPE.tiny, weight: '700', colour: COLOUR.inkMute },
      { string: unit.title, size: TYPE.body, weight: '700' },
    ];
  }
  return [
    { string: `Lesson ${numberOf(unit)}`, size: TYPE.tiny, weight: '700', colour: COLOUR.inkMute },
    { string: unit.title, size: TYPE.body, weight: '700' },
    { string: unit.goal, size: TYPE.small, weight: '500', colour: COLOUR.inkSoft },
  ];
}

/* What the panel says when there is nothing left to play. A detour is not a
 * lesson on the path — it is offered beside one and opens nothing — so the
 * course-wide sentence a lesson earns would be about the wrong thing here, and
 * the detour gets its own words. */
function finishWords(unit, stars, everyLesson) {
  if (everyLesson) {
    return {
      heading: 'Every lesson done!',
      prose: 'Every lesson and every puzzle. The path ends at the two boss games — win those and the whole course is yours.',
    };
  }
  const what = progress.isPack(unit) ? 'detour' : 'lesson';
  if (stars.stars === stars.of) {
    return {
      heading: 'All the stars!',
      prose: `Every puzzle first time. Brilliant — the ${what} is done and it is a rank closer.`,
    };
  }
  return {
    heading: progress.isPack(unit) ? 'Detour finished!' : 'Lesson finished!',
    prose: `Nice work, that is the ${what} done. Play any puzzle again to try for the stars you missed.`,
  };
}

/* A step of the lesson. The blocks list is what `place()` walks; the board is
 * re-laid here, once per step, because its room is what the other blocks leave. */
function buildStep() {
  const unit = view.unit;
  const step = view.steps[view.step];
  const column = view.column;
  const width = column - 2 * PAD;

  /* The page is rebuilt for every step, and the board is the one thing that
   * outlives one — it is taken out first so it is not destroyed with the rest. */
  view.band.node.parent?.removeChild(view.band.node);
  view.page.removeChildren().forEach((node) => node.destroy({ children: true }));
  /* The controls' own layer with it. A row of controls is added to `view.pinned`
   * by `rowOf`, and this function hands `view.controlsBlock` to a *new* object
   * rather than emptying the old one — so the row drawn for the step before this
   * is parented nowhere the screen still owns, and `drawStep`'s destroy cannot
   * reach it. It went on being drawn, and being tappable, over the step that came
   * after: measured on `#/lesson/1`'s completion panel, whose previous step's
   * `Next` sat over its “The path” button. Clearing the layer here is what that
   * comment in `drawStep` — “the old one has to go or the page draws both” — was
   * already promising. */
  view.pinned.removeChildren().forEach((node) => node.destroy({ children: true }));
  view.blocks = [];
  view.drill = null;
  view.turnCap = null;
  view.coachBlock = null;

  if (step.kind === 'read' || step.kind === 'look') {
    const lines = [];
    if (step.kind === 'read') {
      if (step.i === 0) lines.push(...openingLines(unit));
      lines.push({ string: step.text, size: TYPE.body, weight: '500', colour: COLOUR.inkSoft });
    } else {
      lines.push({ string: 'Look at this', size: TYPE.body, weight: '700' });
      if (unit.diagramCaption) {
        lines.push({ string: unit.diagramCaption, size: TYPE.tiny, weight: '500', colour: COLOUR.inkMute });
      }
    }
    const page = cardBox(view.page, { width, lines });
    view.blocks.push({ node: page.node, height: page.height });

    if (step.kind === 'look') {
      const room = Math.min(width, view.viewport - page.height - TAP_FLOOR - 3 * ROW);
      const side = placeBoard(view.band, { width: column, room, flipped: false, interactive: false });
      view.page.addChild(view.band.node);
      view.blocks.push({ node: view.band.node, height: side, gap: ROW, x: 0 });
    }

    view.controlsBlock = { node: null, height: 0, gap: ROW };
    view.blocks.push(view.controlsBlock);
    return;
  }

  if (step.kind === 'drill') {
    const drill = step.drill;
    const prompt = cardBox(view.page, { width, lines: [{ string: drill.prompt, size: TYPE.body, weight: '700' }] });
    view.blocks.push({ node: prompt.node, height: prompt.height });

    const coach = createSpeech(view.page, { units: width });
    const turnCap = text('', { size: TYPE.small, weight: '500', colour: COLOUR.inkSoft, align: 'center', wrap: width });
    turnCap.anchor.set(0.5, 0);
    turnCap.position.set(Math.round(column / 2), 0);
    view.page.addChild(turnCap);

    const pos = parseFen(drill.fen);
    const flipped = pos.turn === 'b';
    view.drill = {
      at: view.step,
      index: step.i,
      drill,
      pos,
      flipped,
      selected: null,
      targets: [],
      hintMove: null,
      tries: 0,
      busy: false,
      hinted: false,
      solved: false,
      shown: false,
      locked: false,
      last: null,
    };
    turnCap.text = turnName(view.drill);

    view.controlsBlock = { node: null, height: 0, gap: ROW };
    const controls = controlsFor(step);
    view.controlsBlock.node = controls.node;
    view.controlsBlock.height = controls.height;

    /* The board's room: what the viewport has left once everything else has been
     * measured. The coach is reserved at the height of the sentence it opens
     * with, so a longer verdict grows the page rather than shrinking the board
     * under a child's finger. */
    const reserved = prompt.height + turnCap.height + coach.measure().height + controls.height + 4 * ROW;
    const side = placeBoard(view.band, {
      width: column,
      room: Math.max(FLOOR, view.viewport - reserved),
      flipped,
      interactive: true,
    });
    view.page.addChild(view.band.node);

    view.coach = coach;
    view.turnCap = turnCap;
    coach.verdict('Your move.', 'plain');
    coach.reply('Tap a piece, then tap where it should go.');

    view.blocks.push({ node: view.band.node, height: side, gap: ROW, x: 0 });
    view.blocks.push({ node: turnCap, height: turnCap.height, gap: ROW, x: Math.round(column / 2) });
    /* The coach's block is kept, not just pushed: `drawStep()` re-measures it
     * every time his reply is rewritten, and `place()` reads this height. */
    view.coachBlock = { node: coach.node, height: coach.measure().height, gap: ROW };
    view.blocks.push(view.coachBlock);
    view.blocks.push(view.controlsBlock);
    paintDrill();
    return;
  }

  /* done */
  const record = progress.read();
  const stars = progress.puzzles(record, unit);
  /* The course-wide sentence is a lesson's: a detour opens nothing and is
   * required by nothing, so finishing one is not the course being finished. */
  const everyLesson = !progress.isPack(unit)
    && LESSONS.filter((entry) => !entry.boss).every((entry) => progress.finished(record, entry));
  const opened = openedBy(record, unit);
  const onward = onwardFrom(record);
  const words = finishWords(unit, stars, everyLesson);
  const lines = [
    { string: words.heading, size: TYPE.body, weight: '700' },
    { string: `${stars.stars} of ${stars.of} ${stars.of === 1 ? 'star' : 'stars'} first time`, size: TYPE.small, weight: '700', colour: stars.stars === stars.of ? COLOUR.good : COLOUR.inkSoft },
  ];
  const row = starRow(view.page, stars.stars, stars.of);
  lines.push({ node: row.node, height: row.height });
  lines.push({ string: words.prose, size: TYPE.body, weight: '500', colour: COLOUR.inkSoft });
  if (opened.length) {
    lines.push({
      string: opened.length === 1
        ? `The path goes on: ${opened[0].title} is open now.`
        : `The path splits two ways: ${opened.map((entry) => entry.title).join(' and ')}. Take either.`,
      size: TYPE.tiny,
      weight: '500',
      colour: COLOUR.inkMute,
    });
  } else if (onward) {
    lines.push({
      string: `Next on the path: ${onward.title}.`,
      size: TYPE.tiny,
      weight: '500',
      colour: COLOUR.inkMute,
    });
  }
  const panel = cardBox(view.page, { width, lines });
  view.blocks.push({ node: panel.node, height: panel.height });

  view.controlsBlock = { node: null, height: 0, gap: ROW };
  view.blocks.push(view.controlsBlock);
}

/* ---- a step, gone to ---- */

function go(index) {
  if (!view) return;
  /* Back off the first step is the path: a lesson is a stop on it, and a control
   * that walked nowhere would be the wall the design document forbids. */
  if (index < 0) {
    location.hash = '#/path';
    return;
  }
  /* Building a step repaints the board, so the tap waits for the piece to land
   * first — and the wait is why `Next` on a just-solved puzzle is a step the
   * child sees rather than a screen that stops answering. */
  const asked = Math.max(0, Math.min(view.steps.length - 1, index));
  walking.then(() => { if (view) enter(asked); });
}

function enter(index) {
  view.step = index;
  view.scroll = 0;
  buildStep();
  drawStep();
  const step = view.steps[view.step];
  announce(step.kind === 'drill'
    ? `Puzzle ${puzzlesIn(view.steps).indexOf(step) + 1}. ${step.drill.prompt}`
    : `${view.unit.title}. Step ${view.step + 1} of ${view.steps.length}.`);
}

/* ---- a screen that cannot draw what it was asked for ---- */

function refuse(context, title, body) {
  const column = Math.min(context.width, COLUMN);
  const left = Math.round((context.width - column) / 2);
  const root = new Container();
  root.addChild(new Graphics().rect(0, 0, context.width, context.height).fill(COLOUR.ground));
  const group = new Container();
  group.position.set(left, 0);
  const panel = cardBox(group, {
    width: column - 2 * PAD,
    lines: [
      { string: title, size: TYPE.body, weight: '700' },
      { string: body, size: TYPE.body, weight: '500', colour: COLOUR.inkSoft },
    ],
  });
  panel.node.position.set(PAD, Math.round(Math.max(TOP, context.height / 2 - panel.height / 2 - 40)));
  const controls = rowOf(group, [{ label: 'The path', onPress: () => { location.hash = '#/path'; } }], column - 2 * PAD);
  controls.node.position.set(PAD, panel.node.position.y + panel.height + ROW);
  root.addChild(group);
  context.layer.addChild(root);
  window.learnChessLesson = { refused: () => title, path: () => '#/path' };
  announce(`${title} ${body}`);
  return root;
}

/* ---- the screen ---- */

/**
 * The screen a stop is played on. `address` is the whole of the difference
 * between the two routes that reach it: it takes the route's params and answers
 * the stop they name, or a refusal in words (`src/lesson/address.js`). Everything
 * below is the same for a lesson and a detour, and that is the point — a second
 * drill loop is what `docs/PORT.md` says a port must never become.
 */
export function scene(address) {
  return {
    mount(context) {
      start(context, address);
    },

    /* A new size is a new page: the blocks are measured against the width, so the
     * step is rebuilt and the child is left on the step they were on. */
    resize(context) {
      const step = view ? view.step : 0;
      window.learnChessLesson = null;
      stopScene(context);
      start(context, address, { step });
    },

    /* The shell destroys the layer's children after this runs; the handle goes
     * with the screen, so a late check cannot read a destroyed one. */
    unmount(context) {
      stopScene(context);
      announce('');
    },
  };
}

function start(context, address, { step = 0 } = {}) {
  const found = address(context.params);
  if (found.refuse) return refuse(context, found.refuse.title, found.refuse.body);
  const unit = found.unit;
  const column = Math.min(context.width, COLUMN);

  const record = progress.read();
  if (!progress.open(record, unit)) {
    /* The one lesson still holding it shut: the lesson that teaches a detour's
     * idea, or the stops the graph requires of a lesson. */
    const held = progress.byId.get(progress.heldBy(record, unit));
    return refuse(context, 'Not open yet', held
      ? `Finish “${held.title}” first — then “${unit.title}” opens.`
      : `“${unit.title}” is not open on the path yet.`);
  }

  /* A fresh screen has nothing walking on it. */
  walking = Promise.resolve(false);
  view = {
    context,
    root: new Container(),
    column,
    left: Math.round((context.width - column) / 2),
    step: Math.max(0, Math.min(stepsFor(unit).length - 1, step)),
    scroll: 0,
    dragged: false,
    drag: null,
    blocks: [],
    unit,
    steps: stepsFor(unit),
    header: null,
    page: null,
    pinned: null,
    band: null,
    coach: null,
    coachBlock: null,
    controls: null,
    controlsBlock: null,
    turnCap: null,
    drill: null,
    contentHeight: 0,
    maxScroll: 0,
    viewport: 1,
  };

  context.layer.eventMode = 'static';
  context.layer.hitArea = new Rectangle(0, 0, context.width, context.height);
  context.layer.addChild(view.root);
  view.root.addChild(new Graphics().rect(0, 0, context.width, context.height).fill(COLOUR.ground));

  view.band = makeBoard(context);
  view.page = new Container();
  view.page.position.set(view.left, TOP);
  view.root.addChild(view.page);
  /* The layer the controls are drawn in: outside `view.page`, so scrolling the
   * reading never moves the row — the reply and the way on cannot be in the same
   * scrolling box without one covering the other. */
  view.pinned = new Container();
  view.pinned.position.set(view.left, 0);
  view.root.addChild(view.pinned);

  buildHeader(context);
  view.viewport = Math.max(1, context.height - view.header.height - STATUS - CLEAR);
  buildStep();
  view.root.addChild(view.header.group);
  drawStep();

  /* One gesture, one owner: the pointer moves the page, and the board reads
   * `dragged` to tell a lift from a tap. */
  const down = (event) => {
    view.drag = { at: event.global.y, from: view.scroll };
    view.dragged = false;
  };
  const move = (event) => {
    if (!view.drag) return;
    const travelled = event.global.y - view.drag.at;
    if (Math.abs(travelled) > DRAG) view.dragged = true;
    if (view.dragged) applyScroll(view.drag.from - travelled);
  };
  const up = () => { view.drag = null; };
  context.layer.on('pointerdown', down);
  context.layer.on('pointermove', move);
  context.layer.on('pointerup', up);
  context.layer.on('pointerupoutside', up);

  /* The wheel is a native listener rather than a Pixi one: the canvas carries
   * `touch-action: none`, so the page must not scroll behind the game and the
   * event has to be taken before the browser acts on it. */
  wheel = (event) => {
    if (view.maxScroll <= 0) return;
    event.preventDefault();
    applyScroll(view.scroll + (event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY));
  };
  context.app.canvas.addEventListener('wheel', wheel, { passive: false });

  window.learnChessLesson = handle();
  const first = view.steps[view.step];
  announce(first.kind === 'drill' ? `Puzzle 1. ${first.drill.prompt}` : `${unit.title}. Step 1 of ${view.steps.length}.`);
}

function stopScene(context) {
  window.learnChessLesson = null;
  view?.band?.pieces.destroy();
  if (wheel) {
    context.app.canvas.removeEventListener('wheel', wheel);
    wheel = null;
  }
  if (view) {
    context.layer.removeChild(view.root);
    view.root.destroy({ children: true });
  }
  view = null;
}

function handle() {
  const point = (entry) => {
    const size = entry.measure();
    const at = entry.node.getGlobalPosition();
    return { ...size, x: Math.round(at.x + size.width / 2), y: Math.round(at.y + size.height / 2), label: entry.label() };
  };
  return {
    /* The stop being played. `n` is its number on the path, and a detour has
     * none — it is offered beside a lesson rather than on it, so a check names it
     * by its id. The key stays `lesson`: it is the screen's own handle, and a
     * check should not have to know which of the two addresses opened it. */
    lesson: () => {
      const pack = progress.isPack(view.unit);
      return {
        kind: pack ? 'pack' : 'lesson',
        n: pack ? null : numberOf(view.unit),
        id: view.unit.id,
        title: view.unit.title,
        goal: view.unit.goal ?? null,
        idea: view.unit.idea ?? null,
        puzzles: (view.unit.drills ?? []).length,
      };
    },
    steps: () => view.steps.map((step) => step.kind),
    step: () => {
      const step = view.steps[view.step];
      return {
        index: view.step,
        of: view.steps.length,
        kind: step.kind,
        puzzle: step.kind === 'drill' ? step.i + 1 : null,
        prompt: step.kind === 'drill' ? step.drill.prompt : step.kind === 'read' ? step.text : null,
      };
    },
    /* Every square where it is really drawn, in the page's own pixels, so a check
     * taps a square rather than its own guess at the pixels. */
    squares: () => {
      const drill = view.drill;
      if (!drill) return [];
      const at = view.band.node.getGlobalPosition();
      const list = [];
      for (let square = 0; square < 64; square += 1) {
        const corner = cornerOf(square, view.band.layout, drill.flipped);
        const piece = pieceAt(drill.pos, square);
        list.push({
          name: squareName(square),
          square,
          piece: piece ? `${piece.color}${piece.type}` : null,
          x: Math.round(at.x + corner.x + view.band.layout.square / 2),
          y: Math.round(at.y + corner.y + view.band.layout.square / 2),
        });
      }
      return list;
    },
    board: () => (view.drill ? {
      fen: toFen(view.drill.pos),
      flipped: view.drill.flipped,
      square: view.band.layout.square,
      selected: view.drill.selected == null ? null : squareName(view.drill.selected),
      targets: view.drill.targets.map((target) => squareName(target.square)),
      hint: view.drill.hintMove
        ? `${squareName(view.drill.hintMove.from)}${squareName(view.drill.hintMove.to)}`
        : null,
      locked: view.drill.locked,
      busy: view.drill.busy,
      tries: view.drill.tries,
    } : null),
    controls: () => view.controls.buttons.map((button) => ({ label: button.label(), disabled: button.disabled, face: button.face() })),
    points: () => view.controls.buttons.map(point),
    coach: () => {
      if (view.steps[view.step]?.kind !== 'drill' || !view.coach) return null;
      const voices = view.coach.voices();
      return { verdict: voices.verdict.text, reply: voices.reply.text, separate: voices.verdict !== voices.reply };
    },
    /* Where the coach's two voices are really drawn, in the page's own pixels.
     * The reply is the sentence this screen exists to hand over, so a check can
     * say whether the pinned row is sitting on top of it. */
    coachBox: () => {
      if (view.steps[view.step]?.kind !== 'drill' || !view.coach) return null;
      const voices = view.coach.voices();
      const box = (node) => {
        const at = node.getGlobalPosition();
        return {
          left: Math.round(at.x),
          top: Math.round(at.y),
          right: Math.round(at.x + node.width),
          bottom: Math.round(at.y + node.height),
        };
      };
      return { verdict: box(voices.verdict), reply: box(voices.reply) };
    },
    turn: () => (view.turnCap ? view.turnCap.text : ''),
    stars: () => {
      const counted = progress.puzzles(progress.read(), view.unit);
      return { got: counted.stars, of: counted.of, solved: counted.solved };
    },
    record: () => progress.read(),
    spoken: () => ({ text: status.textContent, hidden: status.hidden }),
    contentHeight: () => view.contentHeight,
    viewport: () => view.viewport,
    maxScroll: () => view.maxScroll,
    scroll: () => view.scroll,
    scrollTo: (y) => applyScroll(y),
    sprites: () => SPRITES.length,
  };
}

/* The route the router reaches by name: `#/lesson/<n>` and nothing else. The pack
 * route is `src/scenes/pack.js`, and it is this screen with the other address. */
export default scene(lessonAddress);
