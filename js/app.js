/* Learn chess — the interface.
 *
 * Three sections: Learn (a course of lessons, each ending in positions you
 * play), Play (a game against a beginner-strength opponent, with a coach that
 * grades your moves), and Train (the same positions again, shuffled, with a
 * streak).
 *
 * The rules, the search and the evaluation come from js/engine.js; the lesson
 * content comes from js/lessons.js. Nothing here talks to a server.
 */
import {
  START_FEN, parseFen, toFen, legalMoves, makeMove, isCheckmate, isStalemate,
  isInsufficientMaterial, inCheck, san, findBestMove, evaluate, searchEval,
} from './engine.js';
import { LESSONS } from './lessons.js';

const PIECES = {
  w: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' },
  b: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' },
};
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';
const STORE = 'aivara-learn-chess-v1';

/* ---------- small helpers ---------- */

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function squareName(sq) {
  return FILES[sq % 8] + (Math.floor(sq / 8) + 1);
}

function colorOf(pos, sq) {
  const p = pos.board[sq];
  if (!p) return null;
  return p === p.toUpperCase() ? 'w' : 'b';
}

function pieceAt(pos, sq) {
  const p = pos.board[sq];
  if (!p) return null;
  return { color: p === p.toUpperCase() ? 'w' : 'b', type: p.toLowerCase() };
}

function legalFrom(pos, sq) {
  return legalMoves(pos).filter((m) => m.from === sq);
}

function findMove(pos, from, to, prefer) {
  const moves = legalMoves(pos).filter((m) => m.from === from && m.to === to);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  const wanted = prefer || 'q';
  return moves.find((m) => (m.promotion || 'q') === wanted) || moves[0];
}

function sameMove(a, b) {
  return a && b && a.from === b.from && a.to === b.to && (a.promotion || null) === (b.promotion || null);
}

/* Plain-language description of what a move does, used by the coach. */
function describeMove(pos, move) {
  const piece = pieceAt(pos, move.from);
  const victim = pieceAt(pos, move.to);
  const bits = [];
  if (piece.type === 'k' && Math.abs(move.to - move.from) === 2) bits.push('castles the king out of the centre');
  else {
    if (victim) bits.push(`takes the ${NAMES[victim.type]} on ${squareName(move.to)}`);
    if (move.promotion) bits.push(`promotes to a ${NAMES[move.promotion]}`);
    const fromRank = Math.floor(move.from / 8);
    const toRank = Math.floor(move.to / 8);
    if ((piece.type === 'n' || piece.type === 'b') && (fromRank === 0 || fromRank === 7) && toRank !== 0 && toRank !== 7) {
      bits.push('develops a piece');
    }
    if (piece.type === 'p' && [27, 28, 35, 36].includes(move.to)) bits.push('claims the centre');
  }
  const after = makeMove(pos, move);
  if (isCheckmate(after)) bits.unshift('checkmate');
  else if (inCheck(after, after.turn)) bits.push('gives check');
  return { san: san(pos, move), text: bits.join('; ') || 'keeps the position together' };
}

function classify(loss) {
  if (loss >= 300) return { label: 'Blunder', cls: 'bad' };
  if (loss >= 150) return { label: 'Mistake', cls: 'bad' };
  if (loss >= 70) return { label: 'Inaccuracy', cls: 'bad' };
  if (loss <= 10) return { label: 'Best move', cls: 'good' };
  if (loss <= 40) return { label: 'Good', cls: 'good' };
  return { label: 'Playable', cls: '' };
}

function pawns(cp) {
  const n = cp / 100;
  return (n >= 0 ? '+' : '') + n.toFixed(1);
}

/* ---------- progress ---------- */

const store = {
  read() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  },
  write(data) {
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch { /* private mode: progress just does not persist */ }
  },
  markDone(key) {
    const d = store.read();
    d.done = d.done || {};
    d.done[key] = true;
    store.write(d);
  },
  setBest(streak) {
    const d = store.read();
    if (!d.best || streak > d.best) { d.best = streak; store.write(d); }
  },
  clear() { store.write({}); },
};

/* ---------- board rendering ---------- */

const boards = new Map(); // container id -> render state

function renderBoard(container, pos, opts = {}) {
  const flip = !!opts.flip;
  container.textContent = '';
  const targets = opts.targets || new Set();
  const checkSq = opts.checkSquare;
  for (let i = 0; i < 64; i++) {
    const sq = flip ? 63 - i : i;
    const rank = Math.floor(sq / 8);
    const file = sq % 8;
    const sqEl = el('button', 'sq' + ((rank + file) % 2 === 0 ? ' dark' : ''));
    sqEl.dataset.square = String(sq);
    sqEl.type = 'button';
    const piece = pieceAt(pos, sq);
    if (piece) {
      sqEl.classList.add('piece');
      const span = el('span', 'pc ' + piece.color, PIECES[piece.color][piece.type]);
      sqEl.appendChild(span);
    }
    if (opts.selected === sq) sqEl.classList.add('sel');
    if (opts.last && (opts.last.from === sq || opts.last.to === sq)) sqEl.classList.add('last');
    if (opts.hintMove && (opts.hintMove.from === sq || opts.hintMove.to === sq)) sqEl.classList.add('hintbest');
    if (opts.flash && opts.flash.square === sq) sqEl.classList.add(opts.flash.ok ? 'right' : 'wrong');
    if (checkSq === sq) sqEl.classList.add('check');
    if (targets.has(sq)) {
      sqEl.appendChild(piece ? el('span', 'ring') : el('span', 'dot'));
    }
    if (flip ? file === 7 : file === 0) sqEl.appendChild(el('span', 'coord r', String(rank + 1)));
    if (flip ? rank === 7 : rank === 0) sqEl.appendChild(el('span', 'coord f', FILES[file]));
    if (opts.onSquare) sqEl.addEventListener('click', () => opts.onSquare(sq));
    container.appendChild(sqEl);
  }
  boards.set(container.id, { pos, opts });
}

/* Interactive move input: tap your piece, then the square it goes to. */
function moveInput(container, state) {
  return (sq) => {
    const pos = state.pos;
    if (state.locked || state.over) return;
    const colour = colorOf(pos, sq);
    const turn = pos.turn;
    if (state.selected != null && state.targets.has(sq)) {
      const move = findMove(pos, state.selected, sq, pickPromotion(state, state.selected, sq));
      state.selected = null;
      state.targets = new Set();
      if (move) state.onMove(move);
      else paint(state);
      return;
    }
    if (colour === turn) {
      if (state.selected === sq) { state.selected = null; state.targets = new Set(); }
      else {
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

function pickPromotion(state, from, to) {
  if (!state.accepted) return 'q';
  const opts = legalMoves(state.pos).filter((m) => m.from === from && m.to === to).map((m) => m.promotion || 'q');
  for (const p of opts) if (state.accepted.some((u) => u.slice(0, 4) === toUci(from, to) && (u[4] || 'q') === p)) return p;
  return 'q';
}

function toUci(move) {
  return squareName(move.from) + squareName(move.to) + (move.promotion || '');
}

function uciToMove(pos, uci) {
  const from = FILES.indexOf(uci[0]) + (Number(uci[1]) - 1) * 8;
  const to = FILES.indexOf(uci[2]) + (Number(uci[3]) - 1) * 8;
  const promo = uci[4];
  return legalMoves(pos).find((m) => m.from === from && m.to === to && (m.promotion || '') === (promo || '')) || null;
}

function paint(state) {
  const pos = state.pos;
  const kingSq = inCheck(pos, pos.turn) ? findKing(pos, pos.turn) : null;
  renderBoard(state.container, pos, {
    flip: state.flip,
    selected: state.selected,
    targets: state.targets,
    last: state.last,
    hintMove: state.hintMove,
    flash: state.flash,
    checkSquare: kingSq,
    onSquare: state.onSquare,
  });
}

function findKing(pos, colour) {
  const k = colour === 'w' ? 'K' : 'k';
  return pos.board.indexOf(k);
}

/* ---------- Learn ---------- */

const learn = { lessonIndex: 0, drillIndex: 0, state: null };

function renderLessonList() {
  const done = (store.read().done) || {};
  const total = LESSONS.reduce((n, l) => n + (l.drills || []).length, 0);
  const solved = Object.keys(done).filter((k) => k.startsWith('drill:')).length;
  const list = $('lesson-list');
  list.textContent = '';
  const head = el('div', 'progress');
  head.textContent = `${LESSONS.length} lessons · ${total} positions to play · ${Math.min(solved, total)} solved`;
  list.appendChild(head);
  const cards = el('div', 'cards');
  LESSONS.forEach((lesson, i) => {
    const card = el('button', 'card');
    card.type = 'button';
    card.appendChild(el('span', 'k', `Lesson ${i + 1}`));
    card.appendChild(el('span', 't', lesson.title));
    card.appendChild(el('span', 'g', lesson.goal));
    const n = (lesson.drills || []).length;
    const doneHere = (lesson.drills || []).filter((_, j) => done[`drill:${lesson.id}:${j}`]).length;
    card.appendChild(el('span', 'done', `${doneHere}/${n} positions solved`));
    card.addEventListener('click', () => openLesson(i));
    cards.appendChild(card);
  });
  list.appendChild(cards);
}

function openLesson(i) {
  learn.lessonIndex = i;
  learn.drillIndex = 0;
  $('lesson-list').hidden = true;
  $('lesson-view').hidden = false;
  renderLesson();
}

function renderLesson() {
  const lesson = LESSONS[learn.lessonIndex];
  const view = $('lesson-view');
  view.textContent = '';
  const panel = el('div', 'panel');
  const back = el('button', 'btn', '← All lessons');
  back.type = 'button';
  back.addEventListener('click', () => {
    $('lesson-view').hidden = true;
    $('lesson-list').hidden = false;
    renderLessonList();
  });
  panel.appendChild(back);
  const h = el('h2', 't', `Lesson ${learn.lessonIndex + 1} — ${lesson.title}`);
  h.style.margin = '10px 0 8px';
  panel.appendChild(h);
  (lesson.body || []).forEach((para) => panel.appendChild(el('p', null, para)));
  if (lesson.diagram) {
    const wrap = el('div', 'board-wrap');
    wrap.style.marginTop = '14px';
    const b = el('div', 'board');
    b.id = 'lesson-diagram';
    wrap.appendChild(b);
    if (lesson.diagramCaption) wrap.appendChild(el('p', 'caption', lesson.diagramCaption));
    panel.appendChild(wrap);
  }
  view.appendChild(panel);

  const drills = lesson.drills || [];
  if (drills.length) {
    const dp = el('div', 'panel');
    dp.appendChild(el('h3', null, 'Your move'));
    dp.appendChild(el('p', 'lead', 'Play the move you think is best. The coach answers straight away.'));
    const stage = el('div');
    dp.appendChild(stage);
    view.appendChild(dp);
    renderDrill(stage, lesson, 0);
  }
  if (lesson.diagram) {
    renderBoard($('lesson-diagram'), parseFen(lesson.diagram), {});
  }
}

function renderDrill(stage, lesson, index) {
  stage.textContent = '';
  const drill = lesson.drills[index];
  const pos = parseFen(drill.fen);
  const key = `drill:${lesson.id}:${index}`;
  const done = (store.read().done) || {};
  const head = el('p', 'lead', `Position ${index + 1} of ${lesson.drills.length} · ${drill.prompt}`);
  stage.appendChild(head);
  const wrap = el('div', 'board-wrap');
  const boardEl = el('div', 'board');
  boardEl.id = 'lesson-board';
  wrap.appendChild(boardEl);
  wrap.appendChild(el('p', 'caption', pos.turn === 'w' ? 'White to move' : 'Black to move'));
  stage.appendChild(wrap);
  const log = el('div', 'log');
  log.setAttribute('aria-live', 'polite');
  stage.appendChild(log);
  const row = el('div', 'row');
  row.style.marginTop = '10px';
  const hintBtn = el('button', 'btn', 'Hint');
  const skipBtn = el('button', 'btn', 'Next position');
  hintBtn.type = 'button';
  skipBtn.type = 'button';
  row.appendChild(hintBtn);
  row.appendChild(skipBtn);
  stage.appendChild(row);

  const state = {
    container: boardEl,
    pos,
    selected: null,
    targets: new Set(),
    flip: pos.turn === 'b',
    accepted: (drill.accepted || []).map((u) => u.toLowerCase()),
    locked: false,
    over: false,
    last: null,
  };
  state.onSquare = moveInput(boardEl, state);
  state.onMove = (move) => {
    const uci = toUci(move);
    const ok = state.accepted.includes(uci);
    const best = uciToMove(pos, (drill.best || state.accepted[0] || '').toLowerCase());
    state.flash = { square: move.to, ok };
    state.last = move;
    paint(state);
    if (ok) {
      state.locked = true;
      state.pos = makeMove(pos, move);   // play it out, so the learner sees the result
      paint(state);
      store.markDone(key);
      say(log, 'good', 'Correct', `${describeMove(pos, move).san}. ${drill.why}`);
      showNext();
    } else {
      const bestSan = best ? describeMove(pos, best) : null;
      say(log, 'bad', 'Not the move', `The idea here is ${drill.hint} ${bestSan ? `— ${bestSan.san} (` + bestSan.text + ').' : ''} Try again, or press Hint.`);
      setTimeout(() => { state.flash = null; state.selected = null; state.targets = new Set(); paint(state); }, 900);
    }
  };
  paint(state);

  let nextBtnShown = false;
  function showNext() {
    if (nextBtnShown) return;
    nextBtnShown = true;
    const n = index + 1 < lesson.drills.length ? 'Next position' : 'Finish lesson';
    skipBtn.textContent = n;
    skipBtn.classList.add('primary');
  }
  hintBtn.addEventListener('click', () => {
    const best = uciToMove(pos, (drill.best || state.accepted[0] || '').toLowerCase());
    if (best) {
      state.hintMove = best;
      paint(state);
      say(log, '', 'Hint', `${drill.hint} Look at the ${NAMES[pieceAt(pos, best.from).type]} on ${squareName(best.from)}.`);
    }
  });
  skipBtn.addEventListener('click', () => {
    if (index + 1 < lesson.drills.length) {
      renderDrill(stage, lesson, index + 1);
    } else {
      say(log, 'good', 'Lesson finished', 'Press “All lessons” to pick the next one, or try these positions again in Train.');
      skipBtn.textContent = 'Back to lessons';
      skipBtn.onclick = () => {
        $('lesson-view').hidden = true;
        $('lesson-list').hidden = false;
        renderLessonList();
      };
    }
  });
}

function say(log, cls, label, text) {
  const m = el('div', 'msg' + (cls ? ' ' + cls : ''));
  m.appendChild(el('span', 'lab', label));
  m.appendChild(document.createTextNode(text));
  log.prepend(m);
}

/* ---------- Play ---------- */

const play = {
  pos: null,
  history: [],
  moves: [],
  level: 2,
  colour: 'w',
  coach: true,
  flip: false,
  thinking: false,
  over: false,
  state: null,
};

const DEPTH = { 1: { search: 1, evalDepth: 2 }, 2: { search: 2, evalDepth: 2 }, 3: { search: 3, evalDepth: 3 } };

function playStatus(text) {
  $('play-status').textContent = text;
}

function newGame() {
  play.pos = parseFen(START_FEN);
  play.history = [];
  play.moves = [];
  play.over = false;
  play.thinking = false;
  play.flip = $('play-color').value === 'b';
  play.coach = $('play-coach').checked;
  play.level = Number($('play-level').value);
  play.colour = $('play-color').value;
  $('play-log').textContent = '';
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
  play.state.onSquare = moveInput($('play-board'), play.state);
  play.state.onMove = (move) => userMove(move);
  paint(play.state);
  updateMoves();
  const msg = play.colour === 'w' ? 'You are White. Your move.' : 'You are Black. The computer opens.';
  playStatus(msg);
  if (play.colour === 'b') engineTurn();
}

function userMove(move) {
  if (play.over || play.thinking) return;
  const pos = play.pos;
  const cfg = DEPTH[play.level];
  let grade = null;
  if (play.coach) {
    const before = searchEval(pos, { depth: cfg.evalDepth });
    const best = findBestMove(pos, { depth: Math.max(2, cfg.evalDepth) });
    grade = { before, best };
  }
  const after = makeMove(pos, move);
  play.history.push({ pos, move });
  play.moves.push({ san: san(pos, move), colour: pos.turn });
  play.pos = after;
  play.state.pos = after;
  play.state.last = move;
  paint(play.state);
  updateMoves();
  if (play.coach && grade) coachOn(after, move, grade);
  if (finishIfOver()) return;
  engineTurn();
}

function coachOn(posAfter, move, grade) {
  const cfg = DEPTH[play.level];
  const before = play.history[play.history.length - 1].pos;
  const afterEval = searchEval(posAfter, { depth: cfg.evalDepth });
  const mine = (cp) => (play.colour === 'w' ? cp : -cp);
  const loss = Math.max(0, play.colour === 'w' ? grade.before - afterEval : afterEval - grade.before);
  const v = classify(loss);
  const log = $('play-log');
  let text = `The computer puts you at ${pawns(mine(afterEval))} pawns.`;
  if (grade.best && grade.best.move && sameMove(move, grade.best.move)) {
    text += ' That is the move the computer would have played.';
  } else if (grade.best && grade.best.move && loss >= 70) {
    const b = describeMove(before, grade.best.move);
    text += ` The stronger move was ${b.san} — ${b.text}.`;
    const reply = findBestMove(posAfter, { depth: Math.max(2, cfg.evalDepth) });
    if (reply && reply.move) {
      const victim = pieceAt(posAfter, reply.move.to);
      if (victim && victim.color === play.colour) {
        const r = describeMove(posAfter, reply.move);
        text += ` Now ${r.san} ${r.text}.`;
      }
    }
  } else if (grade.best && grade.best.move && loss > 40) {
    const b = describeMove(before, grade.best.move);
    text += ` ${b.san} — ${b.text} — was a little better.`;
  }
  say(log, v.cls, v.label, text);
}

function engineTurn() {
  if (play.over) return;
  play.thinking = true;
  play.state.locked = true;
  playStatus('The computer is thinking…');
  setTimeout(() => {
    const cfg = DEPTH[play.level];
    const res = findBestMove(play.pos, { depth: cfg.search, seed: Date.now() });
    if (!res || !res.move) { play.thinking = false; play.state.locked = false; finishIfOver(); return; }
    const pos = play.pos;
    play.history.push({ pos, move: res.move });
    play.moves.push({ san: san(pos, res.move), colour: pos.turn });
    play.pos = makeMove(pos, res.move);
    play.state.pos = play.pos;
    play.state.last = res.move;
    play.thinking = false;
    play.state.locked = false;
    paint(play.state);
    updateMoves();
    if (finishIfOver()) return;
    const d = describeMove(pos, res.move);
    playStatus(`The computer played ${d.san}. Your move.`);
  }, 260);
}

function finishIfOver() {
  const pos = play.pos;
  if (isCheckmate(pos)) {
    const loser = pos.turn;
    play.over = true;
    play.state.over = true;
    play.state.locked = true;
    const youWin = loser !== play.colour;
    say($('play-log'), youWin ? 'good' : 'bad', youWin ? 'You win' : 'The computer wins',
      'Checkmate. Press New game for another.');
    playStatus(youWin ? 'Checkmate — you win.' : 'Checkmate — the computer wins.');
    return true;
  }
  if (isStalemate(pos) || isInsufficientMaterial(pos)) {
    play.over = true;
    play.state.over = true;
    play.state.locked = true;
    say($('play-log'), '', 'Draw', 'Neither side can force a win from here.');
    playStatus('Draw.');
    return true;
  }
  return false;
}

function updateMoves() {
  const pairs = [];
  for (let i = 0; i < play.moves.length; i += 2) {
    const n = i / 2 + 1;
    pairs.push(`${n}. ${play.moves[i].san}${play.moves[i + 1] ? ' ' + play.moves[i + 1].san : ''}`);
  }
  $('play-moves').textContent = pairs.join('  ');
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
  play.state.pos = play.pos;
  play.state.over = false;
  play.state.locked = false;
  play.state.flash = null;
  play.state.hintMove = null;
  play.state.selected = null;
  play.state.targets = new Set();
  play.state.last = play.history.length ? play.history[play.history.length - 1].move : null;
  paint(play.state);
  updateMoves();
  playStatus('Taken back. Your move.');
}

function hint() {
  if (play.over || play.thinking) return;
  const cfg = DEPTH[play.level];
  const res = findBestMove(play.pos, { depth: Math.max(2, cfg.evalDepth) });
  if (!res || !res.move) return;
  const d = describeMove(play.pos, res.move);
  play.state.hintMove = res.move;
  paint(play.state);
  say($('play-log'), '', 'Hint', `${d.san} — ${d.text}.`);
  setTimeout(() => { play.state.hintMove = null; paint(play.state); }, 4000);
}

/* ---------- Train ---------- */

const train = { queue: [], current: null, streak: 0, state: null };

function allDrills() {
  const out = [];
  LESSONS.forEach((l) => (l.drills || []).forEach((d, j) => out.push({ lesson: l, drill: d, key: `drill:${l.id}:${j}` })));
  return out;
}

function refreshTrainStats() {
  const d = store.read();
  const done = d.done || {};
  const drills = allDrills();
  const solved = drills.filter((x) => done[x.key]).length;
  $('train-streak').textContent = String(train.streak);
  $('train-best').textContent = String(d.best || 0);
  $('train-solved').textContent = String(solved);
  $('train-total').textContent = String(drills.length);
}

function nextTrain() {
  const done = (store.read().done) || {};
  const drills = allDrills().filter((x) => !done[x.key]);
  const pool = drills.length ? drills : allDrills();
  const pick = pool[Math.floor(Math.random() * pool.length)];
  train.current = pick;
  const pos = parseFen(pick.drill.fen);
  const boardEl = $('train-board');
  $('train-where').textContent = `${pick.lesson.title} · ${pos.turn === 'w' ? 'White' : 'Black'} to move`;
  $('train-prompt').textContent = pick.drill.prompt;
  $('train-log').textContent = '';
  train.state = {
    container: boardEl,
    pos,
    selected: null,
    targets: new Set(),
    flip: pos.turn === 'b',
    accepted: (pick.drill.accepted || []).map((u) => u.toLowerCase()),
    locked: false,
    over: false,
    last: null,
  };
  train.state.onSquare = moveInput(train._board, train.state);
  train.state.onMove = (move) => {
    const uci = toUci(move);
    const ok = train.state.accepted.includes(uci);
    train.state.last = move;
    train.state.flash = { square: move.to, ok };
    paint(train.state);
    const log = $('train-log');
    if (ok) {
      train.state.locked = true;
      train.state.pos = makeMove(train.state.pos, move);
      paint(train.state);
      train.streak++;
      store.markDone(train.current.key);
      store.setBest(train.streak);
      say(log, 'good', 'Correct', `${describeMove(train.state.pos, move).san}. ${train.current.drill.why}`);
      refreshTrainStats();
    } else {
      train.streak = 0;
      const best = uciToMove(train.state.pos, (train.current.drill.best || '').toLowerCase());
      const b = best ? describeMove(train.state.pos, best) : null;
      say(log, 'bad', 'Not it', `${train.current.drill.hint}${b ? ` The move is ${b.san} — ${b.text}.` : ''}`);
      refreshTrainStats();
      setTimeout(() => { train.state.flash = null; paint(train.state); }, 900);
    }
  };
  paint(train.state);
  refreshTrainStats();
}

/* ---------- wiring ---------- */

function showTab(name) {
  ['learn', 'play', 'train'].forEach((n) => {
    $(`view-${n}`).hidden = n !== name;
    $(`tab-${n}`).setAttribute('aria-selected', String(n === name));
  });
  if (name === 'play' && !play.pos) newGame();
  if (name === 'train') nextTrain();
}

function main() {
  ['learn', 'play', 'train'].forEach((n) => $(`tab-${n}`).addEventListener('click', () => showTab(n)));
  $('play-new').addEventListener('click', newGame);
  $('play-undo').addEventListener('click', undo);
  $('play-hint').addEventListener('click', hint);
  $('play-flip').addEventListener('click', () => {
    play.flip = !play.flip;
    play.state.flip = play.flip;
    paint(play.state);
  });
  $('play-coach').addEventListener('change', () => { play.coach = $('play-coach').checked; });
  $('play-level').addEventListener('change', () => { play.level = Number($('play-level').value); });
  $('play-color').addEventListener('change', newGame);
  $('train-next').addEventListener('click', nextTrain);
  $('train-hint').addEventListener('click', () => {
    if (!train.state) return;
    const best = uciToMove(train.state.pos, (train.current.drill.best || '').toLowerCase());
    if (best) {
      train.state.hintMove = best;
      paint(train.state);
      say($('train-log'), '', 'Hint', `${train.current.drill.hint} Look at the ${NAMES[pieceAt(train.state.pos, best.from).type]} on ${squareName(best.from)}.`);
    }
  });
  $('train-reset').addEventListener('click', () => {
    store.clear();
    train.streak = 0;
    refreshTrainStats();
    nextTrain();
  });
  renderLessonList();
  refreshTrainStats();
  // A ready signal for automated checks: proves the module, the engine and the
  // lessons all loaded.
  document.documentElement.dataset.appReady = 'true';
}

main();
