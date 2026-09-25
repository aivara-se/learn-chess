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
  START_FEN, parseFen, toFen, legalMoves, makeMove, isCheckmate, isStalemate,
  isInsufficientMaterial, inCheck, san, findBestMove, searchEval,
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
const isSolved = (key) => !!((store.read().done || {})[key]);
const isFirstTry = (key) => !!((store.read().first || {})[key]);

/* ---------- board ---------- */

let live = null;          // the board currently accepting taps
const boards = new Map();

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
  });
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

function showSheet({ title, text, tone = '', icon = 'star', action = 'Got it', onAction = null }) {
  const sheet = $('sheet');
  sheet.textContent = '';
  const head = el('div', 'sheethead');
  head.appendChild(iconSvg(icon, 44));
  head.appendChild(el('h2', null, title));
  sheet.appendChild(head);
  if (text) sheet.appendChild(el('p', null, text));
  const row = el('div', 'row');
  row.style.marginTop = '14px';
  const go = el('button', 'btn primary wide', action);
  go.type = 'button';
  go.addEventListener('click', () => { closeSheet(); if (onAction) onAction(); });
  row.appendChild(go);
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

const ICONS = {
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

const learn = { lesson: 0, step: 0, state: null, tries: 0 };

function starsFor(lesson) {
  const drills = lesson.drills || [];
  const firsts = drills.filter((_, i) => isFirstTry(`drill:${lesson.id}:${i}`)).length;
  const solved = drills.filter((_, i) => isSolved(`drill:${lesson.id}:${i}`)).length;
  return { got: firsts, of: drills.length, solved };
}

/* The one place the header counter is written. It said "0/24" in three separate
   spots, which is how it ended up disagreeing with the label. */
function paintStarCount() {
  const chip = $('star-count');
  chip.textContent = `${solvedCount()} of ${TOTAL_DRILLS} stars`;
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

function renderLessonList() {
  const list = $('lesson-list');
  list.textContent = '';
  paintStarCount();

  const intro = el('div', 'card intro');
  intro.appendChild(el('h2', null, 'Hi, I am Pip'));
  intro.appendChild(el('p', null, `${LESSONS.length} lessons, ${TOTAL_DRILLS} puzzles. Pip helps you play them all.`));
  const done = solvedCount();
  const allDone = done === TOTAL_DRILLS;
  const start = el('button', 'btn primary wide',
    allDone ? 'Play it all again' : (done === 0 ? 'Start lesson 1' : `Keep going: lesson ${currentLesson() + 1}`));
  start.type = 'button';
  start.addEventListener('click', () => openLesson(allDone ? 0 : currentLesson()));
  intro.appendChild(start);
  list.appendChild(intro);

  LESSONS.forEach((lesson, i) => {
    const s = starsFor(lesson);
    const allDone = s.of > 0 && s.solved === s.of;
    const card = el('button', 'lesson' + (allDone ? ' done' : ''));
    card.type = 'button';
    card.appendChild(el('span', 'num', allDone ? '\u2713' : String(i + 1)));
    const txt = el('span', 'txt');
    txt.appendChild(el('span', 't', lesson.title));
    txt.appendChild(el('span', 's', allDone
      ? (s.got === s.of ? 'All puzzles, all first time' : `${s.got} of ${s.of} stars — try again for more`)
      : (s.solved === 0 ? `${s.of} puzzles` : `${s.solved} of ${s.of} puzzles solved`)));
    card.appendChild(txt);
    card.appendChild(starRow(s.got, s.of));
    card.addEventListener('click', () => openLesson(i));
    list.appendChild(card);
  });

  const truth = el('p', 'tiny');
  truth.style.marginTop = '14px';
  truth.textContent = 'An Aivara app. No account, no adverts, no internet needed after it loads. Your stars are saved only on this device.';
  list.appendChild(truth);
}

function lessonSteps(lesson) {
  const steps = (lesson.body || []).map((text, i) => ({ kind: 'read', text, i }));
  steps.push({ kind: 'look' });
  (lesson.drills || []).forEach((drill, i) => steps.push({ kind: 'drill', drill, i }));
  steps.push({ kind: 'done' });
  return steps;
}

function openLesson(i) {
  learn.lesson = i;
  learn.step = 0;
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
    const wrap = el('div', 'boardwrap');
    wrap.style.marginTop = '10px';
    const b = el('div', 'board');
    b.id = 'lesson-board';
    wrap.appendChild(b);
    const turnCap = el('p', 'tiny drill-turn', pos.turn === 'w' ? 'White to move — your turn' : 'Black to move — your turn');
    wrap.appendChild(turnCap);
    card.appendChild(wrap);
    const row = el('div', 'row');
    row.style.marginTop = '12px';
    const hint = el('button', 'btn', 'Hint');
    hint.type = 'button';
    hint.addEventListener('click', () => {
      const best = uciToMove(pos, String(drill.best || drill.accepted[0]).toLowerCase());
      if (!best) return;
      state.hintMove = best;
      paint(state);
      showSheet({ title: 'Hint', text: drill.hint, icon: 'star', action: 'Got it' });
    });
    row.appendChild(hint);
    card.appendChild(row);
    view.appendChild(card);

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
      state.pos = makeMove(pos, move);
      paint(state);
      turnCap.textContent = ok ? 'Puzzle solved' : (state.pos.turn === 'w' ? 'White to move — your turn' : 'Black to move — your turn');
      if (ok) {
        state.locked = true;
        store.solved(key);
        if (learn.tries === 1) store.clean(key);
        paintStarCount();
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
        store.solved(key);
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
  const card = el('div', 'card');
  const head = el('div', 'between');
  head.appendChild(el('h2', null, 'Lesson finished!'));
  head.appendChild(starRow(s.got, s.of));
  card.appendChild(head);
  card.appendChild(el('p', null, s.got === s.of
    ? 'Every puzzle first time. Brilliant.'
    : 'You solved every puzzle. Try again to get all the stars first time.'));
  const row = el('div', 'row');
  row.style.marginTop = '12px';
  const next = el('button', 'btn primary', learn.lesson + 1 < LESSONS.length ? 'Next lesson' : 'Back to lessons');
  next.type = 'button';
  next.addEventListener('click', () => {
    if (learn.lesson + 1 < LESSONS.length) openLesson(learn.lesson + 1);
    else backToList();
  });
  const all = el('button', 'btn', 'All lessons');
  all.type = 'button';
  all.addEventListener('click', backToList);
  row.appendChild(next);
  row.appendChild(all);
  card.appendChild(row);
  view.appendChild(card);
}

function dots(steps, at, lesson) {
  const box = el('div', 'dots');
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
  pos: null, history: [], moves: [], level: 2, colour: 'w', flip: false,
  thinking: false, over: false, state: null, started: false,
};

function newGame() {
  play.pos = parseFen(START_FEN);
  play.history = [];
  play.moves = [];
  play.over = false;
  play.thinking = false;
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
  coachSay(play.colour === 'w' ? 'good' : '', play.colour === 'w'
    ? 'You are White. Tap a pawn, then tap the square in front of it.'
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
  const cfg = DEPTH[play.level];
  const before = searchEval(pos, { depth: cfg.evalDepth });
  const best = findBestMove(pos, { depth: Math.max(2, cfg.evalDepth) });
  const after = makeMove(pos, move);
  play.history.push({ pos, move });
  play.moves.push({ san: san(pos, move), colour: pos.turn });
  play.pos = after;
  play.state.pos = after;
  play.state.last = move;
  paint(play.state);
  updateMoves();

  const afterEval = searchEval(after, { depth: cfg.evalDepth });
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
  coachSay(v.tone, said);

  if (finishIfOver()) return;
  engineTurn();
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
      play.pos = makeMove(pos, res.move);
      play.state.pos = play.pos;
      play.state.last = res.move;
      play.state.locked = false;
      paint(play.state);
      updateMoves();
      if (finishIfOver()) return;
      $('play-turn').textContent = 'Your move';
      coachSay('', `Pip played ${describeMove(pos, res.move).san}. Your move.`);
      return;
    }
    play.state.locked = false;
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
  if (isStalemate(pos) || isInsufficientMaterial(pos)) {
    play.over = true;
    play.state.over = true;
    play.state.locked = true;
    $('play-turn').textContent = 'Draw';
    showSheet({ title: 'A draw', text: 'Neither side can win from here. That happens — start again.', icon: 'star', action: 'New game', onAction: newGame });
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
      store.solved(pick.key);
      if (train.tries === 1) store.clean(pick.key);
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
        store.solved(pick.key);
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

function showScreen(name) {
  for (const s of ['learn', 'play', 'train']) {
    $(`screen-${s}`).hidden = s !== name;
    document.querySelector(`.tab[data-target="${s}"]`).setAttribute('aria-selected', String(s === name));
  }
  closeSheet();
  document.querySelector('main').scrollTop = 0;
  if (name === 'play' && !play.pos) newGame();
  if (name === 'train' && !train.current) nextPuzzle();
  if (name === 'learn') renderLessonList();
}

/* ---------- wiring ---------- */

function main() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => showScreen(tab.dataset.target));
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
  $('play-colour').addEventListener('click', () => {
    play.colour = play.colour === 'w' ? 'b' : 'w';
    play.flip = play.colour === 'b';
    $('play-colour').textContent = play.colour === 'w' ? 'Play black' : 'Play white';
    newGame();
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
  $('train-reset').addEventListener('click', () => {
    store.reset();
    train.streak = 0;
    refreshTrain();
    nextPuzzle();
  });
  $('scrim').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  renderLessonList();
  refreshTrain();
  // A ready signal for automated checks: the module, the engine and the course
  // all loaded, and the first screen is drawn.
  document.documentElement.dataset.appReady = 'true';
}

main();
