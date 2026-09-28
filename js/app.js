/* Learn chess — the interface.
 *
 * Three screens, switched from a bottom tab bar, the way a small phone app
 * works: Lessons (a course in steps, each ending in positions you play),
 * Play (a game against a sleepy-but-honest opponent, with Pip coaching), and
 * Puzzles (the same positions shuffled, with a streak).
 *
 * The rules, the search and the evaluation come from js/engine.js; the course
 * comes from js/lessons.js. Nothing here talks to a server.
 */
import {
  START_FEN, parseFen, legalMoves, makeMove, isCheckmate, isStalemate,
  isDraw, inCheck, san, findBestMove, searchEval,
} from './engine.js';
import { LESSONS } from './lessons.js';

const GLYPH = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const FILES = 'abcdefgh';
const STORE = 'aivara-learn-chess-v2';
const TOTAL_DRILLS = LESSONS.reduce((n, l) => n + (l.drills || []).length, 0);

/* ---------- tiny helpers ---------- */

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const squareName = (sq) => FILES[sq % 8] + (Math.floor(sq / 8) + 1);
const colorOf = (pos, sq) => {
  const p = pos.board[sq];
  return p ? (p === p.toUpperCase() ? 'w' : 'b') : null;
};
const pieceAt = (pos, sq) => {
  const p = pos.board[sq];
  return p ? { color: p === p.toUpperCase() ? 'w' : 'b', type: p.toLowerCase() } : null;
};
const legalFrom = (pos, sq) => legalMoves(pos).filter((m) => m.from === sq);
const toUci = (m) => squareName(m.from) + squareName(m.to) + (m.promotion || '');
const uciToMove = (pos, uci) => {
  const from = FILES.indexOf(uci[0]) + (Number(uci[1]) - 1) * 8;
  const to = FILES.indexOf(uci[2]) + (Number(uci[3]) - 1) * 8;
  return legalMoves(pos).find((m) => m.from === from && m.to === to && (m.promotion || '') === (uci[4] || '')) || null;
};
const sameMove = (a, b) => !!a && !!b && a.from === b.from && a.to === b.to && (a.promotion || null) === (b.promotion || null);
const findKing = (pos, colour) => pos.board.indexOf(colour === 'w' ? 'K' : 'k');

/* What a move does, in words a nine-year-old reads without stopping. */
function describeMove(pos, move) {
  const piece = pieceAt(pos, move.from);
  const victim = pieceAt(pos, move.to);
  const bits = [];
  if (piece.type === 'k' && Math.abs(move.to - move.from) === 2) bits.push('tucks the king away safely');
  else {
    if (victim) bits.push(`wins the ${NAMES[victim.type]} on ${squareName(move.to)}`);
    if (move.promotion) bits.push(`turns the pawn into a ${NAMES[move.promotion]}`);
    const fromRank = Math.floor(move.from / 8);
    const toRank = Math.floor(move.to / 8);
    if ((piece.type === 'n' || piece.type === 'b') && (fromRank === 0 || fromRank === 7) && toRank !== 0 && toRank !== 7) {
      bits.push('brings a piece out');
    }
    if (piece.type === 'p' && [27, 28, 35, 36].includes(move.to)) bits.push('takes the middle');
  }
  const after = makeMove(pos, move);
  if (isCheckmate(after)) bits.unshift('checkmate');
  else if (inCheck(after, after.turn)) bits.push('says check');
  /* `verb` is the same move as an instruction, for the reveal sheet: "The move
     is to take the knight on d5." */
  let verb = 'play that move';
  if (piece.type === 'k' && Math.abs(move.to - move.from) === 2) verb = 'castle';
  else if (victim) verb = `take the ${NAMES[victim.type]} on ${squareName(move.to)}`;
  else if (move.promotion) verb = `make a new ${NAMES[move.promotion]}`;
  else if ((piece.type === 'n' || piece.type === 'b') && (Math.floor(move.from / 8) === 0 || Math.floor(move.from / 8) === 7)) verb = `bring the ${NAMES[piece.type]} out`;
  else if (piece.type === 'p' && [27, 28, 35, 36].includes(move.to)) verb = 'take the middle';
  return { san: san(pos, move), text: bits.join(', ') || 'keeps things tidy', verb };
}

/* How a played move rates, in a child's words. */
function verdict(loss) {
  if (loss <= 10) return { word: 'Perfect!', tone: 'good' };
  if (loss <= 40) return { word: 'Nice move', tone: 'good' };
  if (loss <= 70) return { word: 'Okay', tone: '' };
  if (loss <= 150) return { word: 'Careful', tone: 'bad' };
  if (loss <= 300) return { word: 'That loses something', tone: 'bad' };
  return { word: 'Oops', tone: 'bad' };
}
const scoreWords = (cp) => {
  const p = cp / 100;
  if (p > 1.5) return 'you are well ahead';
  if (p > 0.5) return 'you are a little ahead';
  if (p < -1.5) return 'you are well behind';
  if (p < -0.5) return 'you are a little behind';
  return 'the game is level';
};

/* ---------- progress ---------- */

const store = {
  read() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  },
  write(d) {
    try { localStorage.setItem(STORE, JSON.stringify(d)); } catch { /* private mode: progress just does not stick */ }
  },
  solved(key) {
    const d = store.read();
    d.done = d.done || {};
    d.done[key] = true;
    store.write(d);
  },
  clean(key) {
    const d = store.read();
    d.first = d.first || {};
    d.first[key] = true;
    store.write(d);
  },
  streak(n) {
    const d = store.read();
    if (!d.best || n > d.best) { d.best = n; store.write(d); }
  },
  reset() { store.write({}); },
};
const solvedCount = () => Object.keys((store.read().done) || {}).length;
const starCount = () => Object.keys((store.read().first) || {}).length;
const isSolved = (key) => !!((store.read().done || {})[key]);
const isFirstTry = (key) => !!((store.read().first || {})[key]);

/* Every progress write goes through here, so the two numbers can never drift
   apart or go stale: `done` is a puzzle the answer was found or shown for,
   `first` is a star — solved with no wrong answer and no hint. */
function record(key, firstTry) {
  store.solved(key);
  if (firstTry) store.clean(key);
  paintStarCount();
}

/* ---------- board ---------- */

let live = null;          // the board currently accepting taps
const boards = new Map();

/* Where a square sits on the screen, in cells from the top-left corner: the
   mapping the board is drawn with, so a walk animation survives a flip. */
function cellOf(sq, flip) {
  const row = Math.floor(sq / 8);
  const col = sq % 8;
  return flip ? [row, 7 - col] : [7 - row, col];
}

function renderBoard(container, pos, opts = {}) {
  const flip = !!opts.flip;
  container.textContent = '';
  const targets = opts.targets || new Set();
  /* The engine numbers squares 0 = a1 .. 63 = h8 (rank 1 first). A board drawn in
     DOM order would therefore put White at the top — upside down for the learner
     this app is for. So the cell in row `row` and column `col` maps to:
       rank 8 at the top (unflipped) or rank 1 at the top (flipped, playing Black),
     and when flipped the files mirror too, so it is a true 180-degree rotation. */
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const sq = flip ? row * 8 + (7 - col) : (7 - row) * 8 + col;
    const rank = Math.floor(sq / 8);
    const file = sq % 8;
    const sqEl = el('button', 'sq' + ((rank + file) % 2 === 0 ? ' dark' : ''));
    sqEl.type = 'button';
    sqEl.dataset.square = String(sq);
    const piece = pieceAt(pos, sq);
    if (piece) {
      sqEl.appendChild(el('span', 'pc ' + piece.color, GLYPH[piece.type]));
      /* The piece that just arrived slides in from the square it left. A square is
         not the piece's own width, so the distance is measured here, in px. */
      if (opts.walk && opts.walk.to === sq && sqEl.firstChild) {
        const unit = container.clientWidth / 8;
        if (unit > 8) {
          const [rTo, cTo] = cellOf(sq, flip);
          const [rFrom, cFrom] = cellOf(opts.walk.from, flip);
          const pc = sqEl.firstChild;
          pc.style.setProperty('--dx', `${(cFrom - cTo) * unit}px`);
          pc.style.setProperty('--dy', `${(rFrom - rTo) * unit}px`);
          pc.classList.add('walk');
        }
      }
      if (opts.movable !== false && piece.color === pos.turn && opts.interactive !== false) sqEl.classList.add('mine');
    }
    if (opts.selected === sq) sqEl.classList.add('sel');
    if (opts.last && (opts.last.from === sq || opts.last.to === sq)) sqEl.classList.add('last');
    if (opts.hintMove && (opts.hintMove.from === sq || opts.hintMove.to === sq)) sqEl.classList.add('hintbest');
    if (opts.checkSquare === sq) sqEl.classList.add('check');
    if (opts.flash && opts.flash.square === sq) sqEl.classList.add(opts.flash.ok ? 'right' : 'wrong');
    if (targets.has(sq)) sqEl.appendChild(piece ? el('span', 'ring') : el('span', 'dot'));
    /* Labels sit on the edge nearest the player: ranks down the left (right when
       flipped), files along the bottom (top when flipped). */
    if (flip ? col === 7 : col === 0) sqEl.appendChild(el('span', 'coord r', String(rank + 1)));
    if (flip ? row === 0 : row === 7) sqEl.appendChild(el('span', 'coord f', FILES[file]));
    /* Every square says what it is, in words: a screen reader cannot see a
       board. The coordinates printed inside the button are not enough — only 16
       of 64 squares carry one — and both sides use the same glyph, told apart by
       colour, which a screen reader does not get either. */
    const name = squareName(sq);
    let label = piece ? `${name}, ${piece.color === 'w' ? 'white' : 'black'} ${NAMES[piece.type]}` : `${name}, empty`;
    if (piece && piece.color === pos.turn && opts.interactive !== false && opts.movable !== false) label += ', your piece';
    if (opts.selected === sq) label += ', selected';
    if (targets.has(sq)) label += piece ? ', can be taken' : ', you can move here';
    if (opts.checkSquare === sq) label += ', in check';
    if (opts.flash && opts.flash.square === sq) label += opts.flash.ok ? ', correct' : ', not the move';
    sqEl.setAttribute('aria-label', label);
    if (opts.onSquare) sqEl.addEventListener('click', () => opts.onSquare(sq));
    container.appendChild(sqEl);
  }
  boards.set(container.id, { pos, opts });
}

function paint(state) {
  const pos = state.pos;
  const checkSquare = inCheck(pos, pos.turn) ? findKing(pos, pos.turn) : null;
  renderBoard(state.container, pos, {
    flip: state.flip,
    selected: state.selected,
    targets: state.targets,
    last: state.last,
    hintMove: state.hintMove,
    flash: state.flash,
    checkSquare,
    interactive: state.locked !== true,
    onSquare: state.onSquare,
    walk: state.walk,
  });
  state.walk = null;      // a walk belongs to the move that caused it, and to no repaint after
  state.container.setAttribute('aria-label', checkSquare != null ? 'Chess board, the king is in check' : 'Chess board');
}

/* Tap a piece, then tap where it goes. */
function tapHandler(state) {
  return (sq) => {
    if (state.locked || state.over) return;
    const pos = state.pos;
    if (state.selected != null && state.targets.has(sq)) {
      const choices = legalMoves(pos).filter((m) => m.from === state.selected && m.to === sq);
      const prefer = state.accepted
        ? (choices.find((m) => state.accepted.includes(toUci(m))) || choices[0])
        : choices[0];
      state.selected = null;
      state.targets = new Set();
      if (prefer) state.onMove(prefer);
      else paint(state);
      return;
    }
    if (colorOf(pos, sq) === pos.turn) {
      if (state.selected === sq) {
        state.selected = null;
        state.targets = new Set();
      } else {
        state.selected = sq;
        state.targets = new Set(legalFrom(pos, sq).map((m) => m.to));
      }
      paint(state);
      return;
    }
    state.selected = null;
    state.targets = new Set();
    paint(state);
  };
}

/* ---------- the bottom sheet, confetti, announcements ---------- */

function announce(text) { $('live').textContent = text; }

function closeSheet() {
  $('sheet').hidden = true;
  $('sheet').textContent = '';
  $('scrim').hidden = true;
}

function showSheet({ title, text, tone = '', icon = 'star', action = 'Got it', onAction = null, cancel = null }) {
  const sheet = $('sheet');
  sheet.textContent = '';
  const head = el('div', 'sheethead');
  head.appendChild(iconSvg(icon, 44));
  head.appendChild(el('h2', null, title));
  sheet.appendChild(head);
  if (text) sheet.appendChild(el('p', null, text));
  const row = el('div', 'row');
  row.style.marginTop = '14px';
  row.style.justifyContent = 'center';
  const go = el('button', `btn primary${cancel ? '' : ' wide'}`, action);
  go.type = 'button';
  go.addEventListener('click', () => { closeSheet(); if (onAction) onAction(); });
  row.appendChild(go);
  /* A sheet with two answers: the one that does something, and the way out. The
     safe one is never the button a thumb lands on by accident. */
  if (cancel) {
    const no = el('button', 'btn', cancel);
    no.type = 'button';
    no.addEventListener('click', closeSheet);
    row.appendChild(no);
  }
  sheet.appendChild(row);
  sheet.hidden = false;
  $('scrim').hidden = false;
  const board = document.querySelector('.screen:not([hidden]) .board');
  const main = document.querySelector('main');
  if (board && main) main.scrollTop = Math.max(0, board.offsetTop - 58);   // keep the board at the top, the sheet covers the space below it
  announce(`${title}. ${text || ''}`);
  go.focus();
  return sheet;
}

/* `iconSvg()` wraps one of these in an <svg>; the sheet fills its own element
   with the same markup. Each glyph draws its own circle or uses currentColor, so
   the same one works on a map stop and inside a sheet. */
const ICONS = {
  tick: '<path d="M5 12.8l4.6 4.6L19 7.4" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<circle cx="12" cy="12" r="10" fill="#eef1f8"/><path d="M9 11.6V9.4a3 3 0 0 1 6 0v2.2" fill="none" stroke="#5f698a" stroke-width="1.8" stroke-linecap="round"/><rect x="7.6" y="11.6" width="8.8" height="7" rx="1.8" fill="#5f698a"/>',
  star: '<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z" fill="#ffb01f" stroke="#8a5a00" stroke-width="1.4" stroke-linejoin="round"/>',
  happy: '<circle cx="12" cy="12" r="10" fill="#e3f7ec"/><circle cx="9" cy="10" r="1.6" fill="#0f7b46"/><circle cx="15" cy="10" r="1.6" fill="#0f7b46"/><path d="M8 14q4 3.6 8 0" fill="none" stroke="#0f7b46" stroke-width="2" stroke-linecap="round"/>',
  hmm: '<circle cx="12" cy="12" r="10" fill="#ffe9ea"/><circle cx="9" cy="10" r="1.6" fill="#b8232b"/><circle cx="15" cy="10" r="1.6" fill="#b8232b"/><path d="M8 16q4-3.6 8 0" fill="none" stroke="#b8232b" stroke-width="2" stroke-linecap="round"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM5 5h2v3H5zM17 5h2v3h-2zM10 14h4l1 6H9z" fill="#ffb01f" stroke="#8a5a00" stroke-width="1.4" stroke-linejoin="round"/>',
};
const iconSvg = (name, size = 24) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || ICONS.star;
  return s;
};

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('confetti');
  const colours = ['#ffb01f', '#2f5fe0', '#0f7b46', '#6b4ff0', '#e5484d'];
  for (let i = 0; i < 18; i++) {
    const bit = el('i');
    bit.style.left = `${Math.round(Math.random() * 100)}%`;
    bit.style.background = colours[i % colours.length];
    bit.style.animationDelay = `${Math.round(Math.random() * 220)}ms`;
    box.appendChild(bit);
    setTimeout(() => bit.remove(), 1600);
  }
}

/* ---------- Lessons ---------- */

const learn = { lesson: 0, step: 0, state: null, tries: 0, celebrated: false };

function starsFor(lesson) {
  const drills = lesson.drills || [];
  const firsts = drills.filter((_, i) => isFirstTry(`drill:${lesson.id}:${i}`)).length;
  const solved = drills.filter((_, i) => isSolved(`drill:${lesson.id}:${i}`)).length;
  return { got: firsts, of: drills.length, solved };
}

/* The one place the header counter is written. It said "0/24" in three separate
   spots, which is how it ended up disagreeing with the label; it then counted
   puzzles the answer had been shown for, which is how it ended up disagreeing
   with the rule in docs/DESIGN.md. A star is counted from `first` only. */
function paintStarCount() {
  const chip = $('star-count');
  chip.textContent = `${starCount()} of ${TOTAL_DRILLS} stars`;
}

function starRow(got, of) {
  const box = el('span', 'stars');
  for (let i = 0; i < of; i++) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.innerHTML = i < got
      ? ICONS.star
      : '<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z" fill="none" stroke="#b8862b" stroke-width="2" stroke-linejoin="round"/>';
    box.appendChild(s);
  }
  return box;
}

/* Where a learner is up to: the first lesson with a puzzle still unsolved, or the
   first lesson again once the whole course is done. */
function currentLesson() {
  for (let i = 0; i < LESSONS.length; i++) {
    const s = starsFor(LESSONS[i]);
    if (s.solved < s.of) return i;
  }
  return 0;
}

/* ---------- the path ---------- */

/* The stops a learner can take, and what has to be finished before each. The
   graph lives in js/lessons.js as `requires`; nothing here knows the order. */

const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
const lessonFinished = (lesson) => (lesson.drills || []).every((_, i) => isSolved(`drill:${lesson.id}:${i}`));
const lessonOpen = (lesson) => (lesson.requires || []).every((id) => lessonFinished(lessonById.get(id)));
const firstMissing = (lesson) => (lesson.requires || []).find((id) => !lessonFinished(lessonById.get(id)));

/* How far down the path a lesson is: the longest chain of lessons behind it, so
   nothing is ever drawn above the lesson it needs. `seen` stops a cycle from
   hanging the renderer — scripts/verify-site.ts is what fails one. */
function depthOf(lesson, seen = new Set()) {
  const reqs = lesson.requires || [];
  if (!reqs.length) return 0;
  if (seen.has(lesson.id)) return 0;
  seen.add(lesson.id);
  return 1 + Math.max(...reqs.map((id) => depthOf(lessonById.get(id), seen)));
}

/* Stops are laid out from the graph, never from a hand-written table: one stop
   sits in the middle, a fork puts its two branches left and right, so the route
   winds and the picture cannot drift away from the course. */
const MAP_ROW = 152;
const MAP_TOP = 46;
const MAP_COL = [0.19, 0.5, 0.81];
function mapLayout() {
  const rows = new Map();
  for (const lesson of LESSONS) {
    const d = depthOf(lesson);
    if (!rows.has(d)) rows.set(d, []);
    rows.get(d).push(lesson);
  }
  const placed = new Map();
  for (const [d, group] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const cols = group.length === 1 ? [1] : group.length === 2 ? [0, 2] : [0, 1, 2];
    group.forEach((lesson, i) => {
      placed.set(lesson.id, { lesson, depth: d, x: MAP_COL[cols[Math.min(i, cols.length - 1)]], y: MAP_TOP + d * MAP_ROW });
    });
  }
  const deepest = Math.max(...rows.keys());
  return { placed, height: MAP_TOP + deepest * MAP_ROW + 168 };
}

/* Where to send a learner: the first stop that is open and not finished. */
function nextLesson() {
  return LESSONS.find((l) => lessonOpen(l) && !lessonFinished(l))
    || LESSONS.find((l) => lessonOpen(l)) || LESSONS[0];
}

/* What finishing this lesson opens: a stop whose every requirement is now done. */
const openedBy = (id) => LESSONS.filter((l) => (l.requires || []).includes(id)
  && (l.requires || []).every((r) => lessonFinished(lessonById.get(r))));

/* Stars become a rank, and the rank is a piece whose reach they have earned: a
   child who has won five stars is a knight, not "level 2". */
const RANKS = [['Pawn', 0], ['Knight', 5], ['Bishop', 10], ['Rook', 14], ['Queen', 18], ['King', 23]];
function rankFor(stars) {
  let at = 0;
  while (at + 1 < RANKS.length && stars >= RANKS[at + 1][1]) at += 1;
  const next = RANKS[at + 1] || null;
  return {
    name: RANKS[at][0],
    next: next ? next[0] : null,
    need: next ? next[1] - stars : 0,
    from: RANKS[at][1],
    to: next ? next[1] : TOTAL_DRILLS,
    stars,
  };
}

function renderLessonList() {
  const list = $('lesson-list');
  list.textContent = '';
  paintStarCount();

  const intro = el('div', 'card intro');
  intro.appendChild(el('h2', null, 'Hi, I am Pip'));
  intro.appendChild(el('p', null, `${LESSONS.length} lessons, ${TOTAL_DRILLS} puzzles. Finish a lesson and the path opens up — you choose which way to go.`));
  const done = solvedCount();
  const allDone = done === TOTAL_DRILLS;
  const goTo = nextLesson();
  const start = el('button', 'btn primary wide',
    allDone ? 'Play it all again' : (done === 0 ? 'Start lesson 1' : `Keep going: lesson ${LESSONS.indexOf(goTo) + 1}`));
  start.type = 'button';
  start.addEventListener('click', () => openLesson(allDone ? 0 : LESSONS.indexOf(goTo)));
  intro.appendChild(start);

  /* The rank ladder. Stars are the number a child watches; the rank is what it
     is worth, and it is named after a piece they know. */
  const rank = rankFor(starCount());
  const rk = el('div', 'rank');
  const who = el('div', 'who');
  who.appendChild(el('b', null, `Rank: ${rank.name}`));
  who.appendChild(el('span', null, rank.next
    ? `${rank.need} more ${rank.need === 1 ? 'star' : 'stars'} to ${rank.next}`
    : 'the whole course, every star'));
  rk.appendChild(who);
  const bar = el('div', 'bar');
  const fill = el('i');
  fill.style.width = `${Math.min(100, Math.round(((rank.stars - rank.from) / Math.max(1, rank.to - rank.from)) * 100))}%`;
  bar.appendChild(fill);
  rk.appendChild(bar);
  intro.appendChild(rk);
  /* Both numbers, in one place, in words: a puzzle solved, and a star for the
     ones solved first time. The header chip carries the stars; this is where a
     learner (or a parent) can see what the difference is. */
  /* Both numbers, in words, once there is a number worth reading: on a fresh
     install "0 of 26 puzzles solved · 0 stars won" is four lines of nothing to
     read, and the card is the first thing a child sees. */
  if (done > 0) {
    const progress = el('p', 'tiny');
    progress.style.marginTop = '10px';
    const stars = starCount();
    progress.textContent = `${done} of ${TOTAL_DRILLS} puzzles solved · ${stars} ${stars === 1 ? 'star' : 'stars'} won. `
      + 'A star is a puzzle you solved first time.';
    intro.appendChild(progress);
  }
  list.appendChild(intro);

  const { placed, height } = mapLayout();
  const here = allDone ? null : nextLesson();
  const map = el('div', 'map');
  map.setAttribute('role', 'group');
  map.setAttribute('aria-label', 'The path of lessons');
  map.style.height = `${height}px`;

  /* The route, drawn under the stops: a dotted trail for a leg not walked yet, a
     solid one for a leg whose lesson is finished. */
  const NS = 'http://www.w3.org/2000/svg';
  const route = document.createElementNS(NS, 'svg');
  route.setAttribute('class', 'route');
  route.setAttribute('aria-hidden', 'true');
  for (const { lesson } of placed.values()) {
    for (const id of lesson.requires || []) {
      const from = placed.get(id);
      const to = placed.get(lesson.id);
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', `${from.x * 100}%`);
      l.setAttribute('y1', String(from.y));
      l.setAttribute('x2', `${to.x * 100}%`);
      l.setAttribute('y2', String(to.y));
      if (lessonFinished(lessonById.get(id))) l.setAttribute('class', 'open');
      route.appendChild(l);
    }
  }
  map.appendChild(route);

  LESSONS.forEach((lesson, i) => {
    const s = starsFor(lesson);
    const spot = placed.get(lesson.id);
    const state = lessonFinished(lesson) ? 'done' : lessonOpen(lesson) ? 'open' : 'locked';
    const btn = el('button', `node ${state}${here && here.id === lesson.id ? ' here' : ''}`);
    btn.type = 'button';
    btn.style.left = `${spot.x * 100}%`;
    btn.style.top = `${spot.y}px`;
    const dot = el('span', 'dot');
    if (state === 'done') dot.appendChild(iconSvg('tick', 25));
    else if (state === 'locked') dot.appendChild(iconSvg('lock', 25));
    else dot.appendChild(document.createTextNode(String(i + 1)));
    btn.appendChild(dot);
    btn.appendChild(el('span', 'cap', lesson.title));
    if (state === 'locked') {
      btn.appendChild(el('span', 'sub', `after lesson ${LESSONS.indexOf(lessonById.get(firstMissing(lesson))) + 1}`));
    } else {
      btn.appendChild(starRow(s.got, s.of));
      btn.appendChild(el('span', 'sub', state === 'done'
        ? (s.got === s.of ? 'all first time' : `${s.got} of ${s.of} stars`)
        : (s.solved === 0 ? `${s.of} puzzles` : `${s.solved} of ${s.of} puzzles`)));
    }
    btn.setAttribute('aria-label', state === 'locked'
      ? `${lesson.title}: locked. Finish ${lessonById.get(firstMissing(lesson)).title} first.`
      : `${lesson.title}: ${s.solved} of ${s.of} puzzles solved, ${s.got} of ${s.of} stars${state === 'done' ? ', finished' : ''}.`);
    btn.addEventListener('click', () => {
      if (state !== 'locked') { openLesson(i); return; }
      /* A locked stop still answers: it names the lesson that opens it, and takes
         a learner there when that lesson is playable. */
      const missing = lessonById.get(firstMissing(lesson));
      const canGo = lessonOpen(missing);
      showSheet({
        title: 'Not open yet',
        text: `Finish “${missing.title}” first — then “${lesson.title}” opens.`,
        icon: 'lock',
        action: canGo ? `Go to ${missing.title}` : 'Got it',
        cancel: 'Not now',
        onAction: canGo ? () => openLesson(LESSONS.indexOf(missing)) : undefined,
      });
    });
    map.appendChild(btn);
  });

  /* Pip stands where the learner is. The pawn is a clone of the app bar's own, so
     there is one drawing of him in the repository. */
  const spot = here && placed.get(here.id);
  if (spot) {
    const pip = document.querySelector('.appbar .mascot').cloneNode(true);
    pip.setAttribute('class', 'pip');
    pip.setAttribute('aria-hidden', 'true');
    pip.style.left = `calc(${spot.x * 100}% + 34px)`;
    pip.style.top = `${spot.y - 14}px`;
    map.appendChild(pip);
  }
  list.appendChild(map);

  const truth = el('p', 'tiny');
  truth.style.marginTop = '14px';
  truth.textContent = 'An Aivara app. No account, no adverts, no internet needed after it loads. Your stars are saved only on this device.';
  list.appendChild(truth);

  /* Clearing progress deletes something a child earned, so it is not a button in
     the middle of another screen: it lives here, says what it deletes, and asks. */
  if (done > 0) {
    const startOver = el('button', 'btn quiet wide', 'Start over and clear my stars');
    startOver.type = 'button';
    startOver.addEventListener('click', () => showSheet({
      title: 'Start over?',
      text: `This clears ${done} solved puzzles and ${starCount()} stars on this device, and cannot be undone.`,
      icon: 'hmm',
      action: 'Yes, clear it',
      cancel: 'Keep my stars',
      onAction: () => {
        store.reset();
        train.streak = 0;
        train.current = null;
        renderLessonList();
        refreshTrain();
        announce('Progress cleared.');
      },
    }));
    list.appendChild(startOver);
  }
}

function lessonSteps(lesson) {
  const steps = (lesson.body || []).map((text, i) => ({ kind: 'read', text, i }));
  steps.push({ kind: 'look' });
  (lesson.drills || []).forEach((drill, i) => steps.push({ kind: 'drill', drill, i }));
  steps.push({ kind: 'done' });
  return steps;
}

function openLesson(i) {
  const lesson = LESSONS[i];
  /* The map will not offer a locked lesson, but a stale sheet or a stray call can:
     it goes back to the path rather than around the course. */
  if (!lesson || !lessonOpen(lesson)) { backToList(); return; }
  learn.lesson = i;
  learn.step = 0;
  learn.celebrated = false;
  $('lesson-list').hidden = true;
  $('lesson-view').hidden = false;
  renderStep();
}

function backToList() {
  $('lesson-view').hidden = true;
  $('lesson-list').hidden = false;
  closeSheet();
  renderLessonList();
}

function renderStep() {
  const lesson = LESSONS[learn.lesson];
  const steps = lessonSteps(lesson);
  learn.step = Math.max(0, Math.min(learn.step, steps.length - 1));
  const step = steps[learn.step];
  const view = $('lesson-view');
  view.textContent = '';

  view.appendChild(dots(steps, learn.step, lesson));

  if (step.kind === 'read' || step.kind === 'look') {
    const card = el('div', 'card');
    if (step.kind === 'read' && step.i === 0) {
      card.appendChild(el('p', 'tiny', `Lesson ${learn.lesson + 1}`));
      card.appendChild(el('h2', null, lesson.title));
      card.appendChild(el('p', 'tiny', lesson.goal));
    }
    if (step.kind === 'read') {
      card.appendChild(el('p', null, step.text));
    } else {
      card.appendChild(el('h2', null, 'Look at this'));
      const wrap = el('div', 'boardwrap');
      const b = el('div', 'board');
      b.id = 'lesson-diagram';
      wrap.appendChild(b);
      if (lesson.diagramCaption) wrap.appendChild(el('p', 'tiny', lesson.diagramCaption));
      card.appendChild(wrap);
    }
    card.appendChild(navRow('Next'));
    view.appendChild(card);
    if (step.kind === 'look' && lesson.diagram) renderBoard($('lesson-diagram'), parseFen(lesson.diagram), { interactive: false, movable: false });
    return;
  }

  if (step.kind === 'drill') {
    const drill = step.drill;
    const pos = parseFen(drill.fen);
    learn.tries = 0;
    const card = el('div', 'card');
    card.appendChild(el('p', 'tiny', `Puzzle ${step.i + 1} of ${lesson.drills.length}`));
    card.appendChild(el('h2', null, drill.prompt));
    const row = el('div', 'row');
    row.style.marginTop = '12px';
    /* A puzzle used to be a dead end: the only way past it was to solve it or to
       be shown the answer, so a learner who wanted the explanation again had to
       guess first. Back goes to the text before it. */
    const back = el('button', 'btn', 'Back');
    back.type = 'button';
    back.addEventListener('click', () => {
      closeSheet();
      if (learn.step === 0) backToList();
      else { learn.step -= 1; renderStep(); }
    });
    const hint = el('button', 'btn', 'Hint');
    hint.type = 'button';
    hint.addEventListener('click', () => {
      const best = uciToMove(pos, String(drill.best || drill.accepted[0]).toLowerCase());
      if (!best) return;
      state.hintMove = best;
      paint(state);
      showSheet({ title: 'Hint', text: drill.hint, icon: 'star', action: 'Got it' });
    });
    row.appendChild(back);
    row.appendChild(hint);
    card.appendChild(row);
    view.appendChild(card);

    /* The board sits outside the card, and so is as wide as the screen allows:
       inside a card it lost 32px of width, and with it a quarter of every square
       a child has to hit with a finger. */
    const wrap = el('div', 'boardwrap');
    wrap.style.marginTop = '12px';
    const b = el('div', 'board');
    b.id = 'lesson-board';
    wrap.appendChild(b);
    const turnCap = el('p', 'tiny drill-turn', pos.turn === 'w' ? 'White to move — your turn' : 'Black to move — your turn');
    wrap.appendChild(turnCap);
    view.appendChild(wrap);

    const state = {
      container: b,
      pos,
      selected: null,
      targets: new Set(),
      flip: pos.turn === 'b',
      accepted: (drill.accepted || []).map((u) => u.toLowerCase()),
      locked: false,
      over: false,
      last: null,
    };
    learn.state = state;
    state.onSquare = tapHandler(state);
    state.onMove = (move) => {
      const ok = state.accepted.includes(toUci(move));
      const key = `drill:${lesson.id}:${step.i}`;
      learn.tries += 1;
      state.flash = { square: move.to, ok };
      state.last = move;
      state.walk = { from: move.from, to: move.to };
      state.pos = makeMove(pos, move);
      paint(state);
      turnCap.textContent = ok ? 'Puzzle solved' : (state.pos.turn === 'w' ? 'White to move — your turn' : 'Black to move — your turn');
      if (ok) {
        state.locked = true;
        record(key, learn.tries === 1);
        confetti();
        showSheet({
          title: 'Correct!',
          text: drill.why,
          icon: 'happy',
          action: 'Next',
          onAction: () => { learn.step += 1; renderStep(); },
        });
      } else if (learn.tries === 1) {
        setTimeout(() => { state.flash = null; state.pos = pos; state.selected = null; state.targets = new Set(); paint(state); }, 700);
        showSheet({
          title: 'Not that one',
          text: `${drill.hint}. Have another go.`,
          icon: 'hmm',
          action: 'Try again',
          onAction: () => { state.locked = false; state.pos = pos; paint(state); },
        });
      } else {
        const best = uciToMove(pos, String(drill.best || drill.accepted[0]).toLowerCase());
        const d = best ? describeMove(pos, best) : null;
        state.locked = true;
        /* "Here is the move" has to be the move on the board: this used to leave
           the child's own wrong move standing while the words described another
           one, which teaches the wrong position. */
        if (best) {
          state.pos = makeMove(pos, best);
          state.last = best;
          state.walk = { from: best.from, to: best.to };
          state.flash = { square: best.to, ok: true };
          turnCap.textContent = 'The move is shown';
          paint(state);
        }
        record(key, false);
        showSheet({
          title: 'Here is the move',
          text: d ? `The move is to ${d.verb}. ${drill.why}` : drill.why,
          icon: 'hmm',
          action: 'Next',
          onAction: () => { learn.step += 1; renderStep(); },
        });
      }
    };
    paint(state);
    return;
  }

  /* done */
  const s = starsFor(lesson);
  const courseDone = solvedCount() === TOTAL_DRILLS;
  const card = el('div', 'card');
  const head = el('div', 'between');
  head.appendChild(el('h2', null, courseDone ? 'The whole course!' : s.got === s.of ? 'All the stars!' : 'Lesson finished!'));
  head.appendChild(starRow(s.got, s.of));
  card.appendChild(head);
  card.appendChild(el('p', null, courseDone
    ? 'Every lesson, every puzzle, and Pip thinks you are ready for a real game. Play him whenever you like — he is on the Play tab.'
    : s.got === s.of
      ? 'Every puzzle first time. Brilliant — that is a lesson done and a rank closer.'
      : 'Nice work, that is the lesson done. Play any puzzle again to try for the stars you missed.'));
  /* The path answers the only question a child has at this point: what now? */
  const opened = openedBy(lesson.id);
  if (opened.length) {
    const p = el('p', 'tiny');
    p.style.marginTop = '10px';
    p.textContent = opened.length === 1
      ? `The path goes on: ${opened[0].title} is open now.`
      : `The path splits two ways: ${opened.map((l) => l.title).join(' and ')}. Take either.`;
    card.appendChild(p);
  }
  const row = el('div', 'row');
  row.style.marginTop = '12px';
  const onward = opened[0] || (courseDone ? null : nextLesson());
  const next = el('button', 'btn primary', onward ? `Next: ${onward.title}` : 'Back to the path');
  next.type = 'button';
  next.addEventListener('click', () => (onward ? openLesson(LESSONS.indexOf(onward)) : backToList()));
  const all = el('button', 'btn', 'The path');
  all.type = 'button';
  all.addEventListener('click', backToList);
  row.appendChild(next);
  row.appendChild(all);
  card.appendChild(row);
  view.appendChild(card);
  /* Celebrated once per visit: reaching the end again by walking back through the
     lesson should not throw confetti every time. */
  if (!learn.celebrated) { learn.celebrated = true; confetti(); }
}

function dots(steps, at, lesson) {
  const box = el('div', 'dots');
  /* The dots are the only sign of how far into a lesson a learner is, and they
     are three colours of circle to anyone who cannot see them. */
  const puzzles = steps.filter((s) => s.kind === 'drill');
  const won = puzzles.filter((s) => isFirstTry(`drill:${lesson.id}:${s.i}`)).length;
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', `Step ${at + 1} of ${steps.length}`
    + (puzzles.length ? `, ${won} of ${puzzles.length} puzzles won first time` : ''));
  steps.forEach((s, i) => {
    const d = el('i');
    if (s.kind === 'drill' && isFirstTry(`drill:${lesson.id}:${s.i}`)) d.classList.add('win');
    if (i === at) d.classList.add('on');
    box.appendChild(d);
  });
  return box;
}

function navRow(nextLabel) {
  const row = el('div', 'row');
  row.style.marginTop = '14px';
  const back = el('button', 'btn', 'Back');
  back.type = 'button';
  back.addEventListener('click', () => {
    if (learn.step === 0) backToList();
    else { learn.step -= 1; renderStep(); }
  });
  const next = el('button', 'btn primary', nextLabel || 'Next');
  next.id = 'lesson-next';
  next.type = 'button';
  next.addEventListener('click', () => { learn.step += 1; renderStep(); });
  row.appendChild(back);
  row.appendChild(next);
  return row;
}

/* ---------- Play ---------- */

const DEPTH = { 1: { search: 1, evalDepth: 2 }, 2: { search: 2, evalDepth: 2 }, 3: { search: 3, evalDepth: 3 } };
const LEVEL_NAME = { 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' };

const play = {
  pos: null, history: [], moves: [], seen: [], level: 2, colour: 'w', flip: false,
  thinking: false, over: false, state: null, started: false,
  token: 0,     // bumped by a new game, so a search in flight cannot land on it
};

function newGame() {
  play.pos = parseFen(START_FEN);
  play.history = [];
  play.moves = [];
  /* `seen` holds the positions the game has already left, oldest first: `isDraw`
     counts the current position itself, so putting it in here too would let a
     position repeat twice and be called a threefold draw. Positions, not keys —
     `isDraw` reads a string as a FEN, and a position key is not one. */
  play.seen = [];
  play.over = false;
  play.thinking = false;
  play.token += 1;
  setThinking(false);
  play.state = {
    container: $('play-board'),
    pos: play.pos,
    selected: null,
    targets: new Set(),
    flip: play.flip,
    locked: false,
    over: false,
    last: null,
  };
  play.state.onSquare = tapHandler(play.state);
  play.state.onMove = (move) => userMove(move);
  paint(play.state);
  updateMoves();
  /* A mouse does not tap. On a screen whose pointer hovers, the one instruction a
     child reads before their first move says click instead. Read here, at every
     new game, rather than once at load: a tablet with a mouse plugged in gets the
     truth too. */
  const click = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  coachSay(play.colour === 'w' ? 'good' : '', play.colour === 'w'
    ? `You are White. ${click ? 'Click' : 'Tap'} a pawn, then ${click ? 'click' : 'tap'} the square in front of it.`
    : 'You are Black. Pip opens the game.');
  $('play-turn').textContent = 'Your move';
  if (play.colour === 'b') engineTurn();
}

function coachSay(tone, text) {
  const bubble = $('play-coach');
  bubble.className = `bubble${tone ? ' ' + tone : ''}`;
  bubble.textContent = text;
  announce(text);
}

function userMove(move) {
  if (play.over || play.thinking) return;
  const pos = play.pos;
  const token = ++play.token;   // a new game while Pip is thinking must not grade this move
  play.history.push({ pos, move });
  play.moves.push({ san: san(pos, move), colour: pos.turn });
  play.seen.push(pos);
  play.pos = makeMove(pos, move);
  play.state.pos = play.pos;
  play.state.last = move;
  play.state.walk = { from: move.from, to: move.to };
  play.state.selected = null;
  play.state.targets = new Set();
  paint(play.state);          // the child sees the move before anything is worked out
  updateMoves();

  /* The grade is a search, and it used to run before the repaint: a tap at level 3
     froze the board for 141–245ms on a fast machine and nearer a second on a cheap
     phone, with nothing on screen to say the tap had landed. Paint, then grade. */
  play.state.locked = true;
  $('play-turn').textContent = 'Pip is thinking…';
  setThinking(true);
  setTimeout(() => {
    if (token !== play.token) return;
    play.state.locked = false;
    gradeMove(pos, move);
    if (finishIfOver()) return;
    engineTurn();
  }, 0);
}

/* Pip at work. The board refuses taps while he is, so the one thing on screen that
   can say so is the coach — and the buttons that would change the game go quiet. */
function setThinking(on) {
  document.querySelector('#screen-play .coach').classList.toggle('thinking', on);
  for (const id of ['play-hint', 'play-undo', 'play-flip']) $(id).disabled = on;
}

/* What Pip thought of the move just played, in a child's words. */
function gradeMove(pos, move) {
  const cfg = DEPTH[play.level];
  const before = searchEval(pos, { depth: cfg.evalDepth });
  const best = findBestMove(pos, { depth: Math.max(2, cfg.evalDepth) });
  const afterEval = searchEval(play.pos, { depth: cfg.evalDepth });
  const mine = play.colour === 'w' ? afterEval : -afterEval;
  const loss = Math.max(0, play.colour === 'w' ? before - afterEval : afterEval - before);
  const v = verdict(loss);
  let said = `Pip says ${scoreWords(mine)}.`;
  if (best && best.move && sameMove(move, best.move)) {
    said = `${v.word} That is the move Pip would play. Pip says ${scoreWords(mine)}.`;
  } else if (best && best.move && loss >= 70) {
    const b = describeMove(pos, best.move);
    const piece = pieceAt(pos, best.move.from);
    said = `${v.word} Better was the ${NAMES[piece.type]} move — it ${b.text}. Pip says ${scoreWords(mine)}.`;
  }
  /* A king in check is the one thing on the board a beginner must not miss, and
     the red frame alone does not say it out loud. */
  if (inCheck(play.pos, play.pos.turn)) said = 'Check! ' + said;
  coachSay(v.tone, said);
}

function engineTurn() {
  if (play.over) return;
  play.thinking = true;
  play.state.locked = true;
  $('play-turn').textContent = 'Pip is thinking…';
  setTimeout(() => {
    const cfg = DEPTH[play.level];
    const res = findBestMove(play.pos, { depth: cfg.search, seed: Date.now() });
    play.thinking = false;
    if (res && res.move) {
      const pos = play.pos;
      play.history.push({ pos, move: res.move });
      play.moves.push({ san: san(pos, res.move), colour: pos.turn });
      play.seen.push(pos);
      play.pos = makeMove(pos, res.move);
      play.state.pos = play.pos;
      play.state.last = res.move;
      play.state.walk = { from: res.move.from, to: res.move.to };
      play.state.locked = false;
      setThinking(false);
      paint(play.state);
      updateMoves();
      if (finishIfOver()) return;
      $('play-turn').textContent = 'Your move';
      const mine = inCheck(play.pos, play.pos.turn) ? ' Your king is in check.' : '';
      coachSay('', `Pip played ${describeMove(pos, res.move).san}.${mine} Your move.`);
      return;
    }
    /* no move found at all: the game is over, but say so with the buttons back */
    play.state.locked = false;
    setThinking(false);
    finishIfOver();
  }, 300);
}

function finishIfOver() {
  const pos = play.pos;
  if (isCheckmate(pos)) {
    play.over = true;
    play.state.over = true;
    play.state.locked = true;
    const youWin = pos.turn !== play.colour;
    $('play-turn').textContent = youWin ? 'You win!' : 'Pip wins';
    confetti();
    showSheet({
      title: youWin ? 'Checkmate — you win!' : 'Checkmate — Pip won',
      text: youWin ? 'Well played. Start another game while you are warm.' : 'Good try. Undo a move or start again — every game teaches something.',
      icon: youWin ? 'trophy' : 'hmm',
      action: 'New game',
      onAction: newGame,
    });
    return true;
  }
  /* A game can also end without a mate: stalemate, dead position, fifty moves
     without a capture or a pawn move, or the same position three times. `isDraw`
     knows all of those and used to go uncalled, so a drawn game ran until the tab
     was closed. */
  if (isStalemate(pos) || isDraw(pos, play.seen)) {
    play.over = true;
    play.state.over = true;
    play.state.locked = true;
    $('play-turn').textContent = 'Draw';
    showSheet({
      title: 'A draw',
      text: isStalemate(pos)
        ? 'Nobody can move, so the game is a draw. That happens — start again.'
        : 'Neither side can win from here: the same position three times, fifty moves without a capture, or too little material left. Start again.',
      icon: 'star',
      action: 'New game',
      onAction: newGame,
    });
    return true;
  }
  return false;
}

function updateMoves() {
  const pairs = [];
  for (let i = 0; i < play.moves.length; i += 2) {
    pairs.push(`${i / 2 + 1}. ${play.moves[i].san}${play.moves[i + 1] ? ' ' + play.moves[i + 1].san : ''}`);
  }
  $('play-moves').textContent = pairs.join('   ');
}

function undo() {
  if (play.thinking || !play.history.length) return;
  while (play.history.length) {
    const last = play.history.pop();
    play.moves.pop();
    play.pos = last.pos;
    if (play.pos.turn === play.colour) break;
  }
  play.over = false;
  /* The draw history has to move back with the moves: a repetition or fifty-move
     claim that counted positions the game has just left would end a live game. */
  play.seen = play.history.map((h) => h.pos);
  Object.assign(play.state, { pos: play.pos, over: false, locked: false, flash: null, hintMove: null, selected: null, targets: new Set() });
  play.state.last = play.history.length ? play.history[play.history.length - 1].move : null;
  paint(play.state);
  updateMoves();
  $('play-turn').textContent = 'Your move';
  coachSay('', 'Taken back. Your move.');
}

function hint() {
  if (play.over || play.thinking) return;
  const cfg = DEPTH[play.level];
  const res = findBestMove(play.pos, { depth: Math.max(2, cfg.evalDepth) });
  if (!res || !res.move) return;
  const d = describeMove(play.pos, res.move);
  play.state.hintMove = res.move;
  paint(play.state);
  const piece = pieceAt(play.pos, res.move.from);
  coachSay('', `Try the ${NAMES[piece.type]} — it ${d.text}.`);
  setTimeout(() => { play.state.hintMove = null; paint(play.state); }, 4000);
}

function levelSheet() {
  const sheet = $('sheet');
  sheet.textContent = '';
  const head = el('div', 'sheethead');
  head.appendChild(iconSvg('star', 40));
  head.appendChild(el('h2', null, 'How strong should Pip play?'));
  sheet.appendChild(head);
  sheet.appendChild(el('p', null, 'Pip is a small chess program, not a champion. Level 1 is sleepy and makes mistakes on purpose.'));
  for (const level of [1, 2, 3]) {
    const b = el('button', 'btn wide' + (level === play.level ? ' primary' : ''), level === 1 ? 'Level 1 — sleepy' : level === 2 ? 'Level 2 — club beginner' : 'Level 3 — plays properly');
    b.type = 'button';
    b.style.marginTop = '8px';
    b.addEventListener('click', () => {
      play.level = level;
      $('play-level-label').textContent = LEVEL_NAME[level];
      closeSheet();
      coachSay('', `Pip will play ${level === 1 ? 'sleepily' : level === 2 ? 'like a club beginner' : 'properly'} now.`);
    });
    sheet.appendChild(b);
  }
  /* Which side you play belongs here, with the other thing you choose once at the
     start of a game, and not among the three buttons a child taps during one. It
     was the fourth button in that row, which pushed Hint and Undo off the bottom
     of a 640px phone. */
  const sides = el('div', 'row');
  sides.style.marginTop = '16px';
  sides.appendChild(el('p', 'tiny', 'You play'));
  const choice = el('div', 'row');
  choice.style.marginTop = '6px';
  for (const [side, label] of [['w', 'White'], ['b', 'Black']]) {
    const b = el('button', 'btn' + (play.colour === side ? ' primary' : ''), label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(play.colour === side));
    b.addEventListener('click', () => {
      if (play.colour === side) { closeSheet(); return; }
      play.colour = side;
      play.flip = side === 'b';
      newGame();
      closeSheet();
    });
    choice.appendChild(b);
  }
  sides.appendChild(choice);
  sheet.appendChild(sides);
  sheet.appendChild(el('p', 'tiny', 'Changing the side starts a new game.'));
  sheet.hidden = false;
  $('scrim').hidden = false;
  const first = sheet.querySelector('button');
  if (first) first.focus();
}

/* ---------- Puzzles ---------- */

const train = { current: null, streak: 0, tries: 0, state: null };

function allDrills() {
  const out = [];
  LESSONS.forEach((l) => (l.drills || []).forEach((d, j) => out.push({ lesson: l, drill: d, key: `drill:${l.id}:${j}` })));
  return out;
}

function refreshTrain() {
  const done = (store.read().done) || {};
  $('train-streak').textContent = String(train.streak);
  $('train-solved').textContent = String(allDrills().filter((x) => done[x.key]).length);
  $('train-total').textContent = String(TOTAL_DRILLS);
  paintStarCount();
}

function nextPuzzle() {
  const done = (store.read().done) || {};
  const left = allDrills().filter((x) => !done[x.key]);
  const pool = left.length ? left : allDrills();
  const pick = pool[Math.floor(Math.random() * pool.length)];
  train.current = pick;
  train.tries = 0;
  const pos = parseFen(pick.drill.fen);
  $('train-prompt').textContent = pick.drill.prompt;
  $('train-where').textContent = `${pick.lesson.title} · ${pos.turn === 'w' ? 'White' : 'Black'} to move`;

  const b = $('train-board');
  const state = {
    container: b,
    pos,
    selected: null,
    targets: new Set(),
    flip: pos.turn === 'b',
    accepted: (pick.drill.accepted || []).map((u) => u.toLowerCase()),
    locked: false,
    over: false,
    last: null,
  };
  train.state = state;
  state.onSquare = tapHandler(state);
  state.onMove = (move) => {
    const ok = state.accepted.includes(toUci(move));
    train.tries += 1;
    state.flash = { square: move.to, ok };
    state.last = move;
    state.pos = makeMove(pos, move);
    paint(state);
    if (ok) {
      state.locked = true;
      train.streak += 1;
      $('train-where').textContent = `${pick.lesson.title} · solved`;
      record(pick.key, train.tries === 1);
      store.streak(train.streak);
      confetti();
      refreshTrain();
      showSheet({
        title: 'Correct!',
        text: pick.drill.why,
        icon: 'happy',
        action: 'Next puzzle',
        onAction: nextPuzzle,
      });
    } else {
      train.streak = 0;
      refreshTrain();
      const best = uciToMove(pos, String(pick.drill.best || state.accepted[0]).toLowerCase());
      const d = best ? describeMove(pos, best) : null;
      if (train.tries === 1) {
        setTimeout(() => { state.flash = null; state.pos = pos; state.selected = null; state.targets = new Set(); paint(state); }, 700);
        showSheet({ title: 'Not that one', text: `${pick.drill.hint}. Have another go.`, icon: 'hmm', action: 'Try again', onAction: () => { state.locked = false; state.pos = pos; paint(state); } });
      } else {
        state.locked = true;
        record(pick.key, false);
        refreshTrain();
        showSheet({
          title: 'Here is the move',
          text: d ? `The move is to ${d.verb}. ${pick.drill.why}` : pick.drill.why,
          icon: 'hmm',
          action: 'Next puzzle',
          onAction: nextPuzzle,
        });
      }
    }
  };
  paint(state);
  refreshTrain();
}

/* ---------- screens ---------- */

/* The app bar says what the tab is for. It used to say "Pick a lesson and play"
   on all three screens, including the two that are not lessons. */
/* Short on purpose: at 360px a longer line wraps and takes 18px off the board on
   every one of these screens (measured — "A game, with Pip coaching." cost that
   much before it was shortened). */
const SUBTITLE = {
  learn: 'Pick a lesson and play.',
  play: 'A game with Pip.',
  train: 'The puzzles, shuffled.',
};

function showScreen(name) {
  for (const s of ['learn', 'play', 'train']) {
    $(`screen-${s}`).hidden = s !== name;
    document.querySelector(`.tab[data-target="${s}"]`).setAttribute('aria-selected', String(s === name));
  }
  $('app-sub').textContent = SUBTITLE[name] || '';
  closeSheet();
  document.querySelector('main').scrollTop = 0;
  if (name === 'play' && !play.pos) newGame();
  if (name === 'train' && !train.current) nextPuzzle();
  if (name === 'learn') renderLessonList();
}

/* ---------- wiring ---------- */

function main() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      /* Tapping the tab you are already on goes back to where that tab starts —
         from inside a lesson, the list of lessons. It did nothing at all before,
         which made the tab look broken and left a lesson a one-way trip. */
      if (tab.dataset.target === 'learn' && !$('lesson-view').hidden) backToList();
      showScreen(tab.dataset.target);
    });
  });
  $('play-new').addEventListener('click', newGame);
  $('play-hint').addEventListener('click', hint);
  $('play-undo').addEventListener('click', undo);
  $('play-level').addEventListener('click', levelSheet);
  $('play-flip').addEventListener('click', () => {
    play.flip = !play.flip;
    play.state.flip = play.flip;
    paint(play.state);
  });
  $('train-next').addEventListener('click', nextPuzzle);
  $('train-hint').addEventListener('click', () => {
    if (!train.state) return;
    const best = uciToMove(train.state.pos, String(train.current.drill.best || '').toLowerCase());
    if (!best) return;
    train.state.hintMove = best;
    paint(train.state);
    showSheet({ title: 'Hint', text: train.current.drill.hint, icon: 'star', action: 'Got it' });
  });
  $('scrim').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  /* Offline for real: the app's own seven files, cached by a service worker, so
     the footer's promise survives a reload with no network. */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline is a bonus, never a blocker */ });
    });
  }

  renderLessonList();
  refreshTrain();
  showScreen('learn');
  // A ready signal for automated checks: the module, the engine and the course
  // all loaded, and the first screen is drawn.
  document.documentElement.dataset.appReady = 'true';
}

main();
