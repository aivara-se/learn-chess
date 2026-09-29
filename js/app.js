/* Learn chess — the interface.
 *
 * Three screens, switched from a bottom tab bar, the way a small phone app
 * works: Lessons (a course in steps, each ending in positions you play),
 * Play (a game against a sleepy-but-honest opponent, with Pip coaching), and
 * Puzzles (today's puzzle, then the same positions shuffled, with a streak).
 *
 * The rules, the search and the evaluation come from js/engine.js; the course
 * comes from js/lessons.js. Nothing here talks to a server.
 */
import { createBook } from './badges.js';
import {
  START_FEN, parseFen, legalMoves, makeMove, isCheckmate, isStalemate,
  isDraw, inCheck, san, findBestMove, searchEval, findThreat,
} from './engine.js';
import { LESSONS, PACKS } from './lessons.js';
import { sound } from './sound.js';
import { dayStamp, dailyDrill } from './daily.js';

const GLYPH = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const FILES = 'abcdefgh';
const STORE = 'aivara-learn-chess-v2';
/* Every puzzle there is, in one pool: the lessons' drills and the packs'. A star is
   won for either, so the chip in the app bar, the card at the top of the path, the
   rank ladder and the Puzzles tab all count the same total — and none of them
   writes it down. */
const TOTAL_DRILLS = [...LESSONS, ...PACKS].reduce((n, u) => n + (u.drills || []).length, 0);
const BOSS_STOPS = LESSONS.filter((l) => l.boss);
const LESSON_STOPS = LESSONS.filter((l) => !l.boss);
const packById = new Map(PACKS.map((p) => [p.id, p]));

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
  return { san: san(pos, move), text: bits.join(', ') || 'keeps things tidy', verb, empty: bits.length === 0 };
}

/* 'Perfect!' already ends in a full stop of its own. */
const stop = (w) => (/[!?.]$/.test(w) ? w : w + '.');

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
  /* A boss stop is won, not solved: one key per level — `boss:<level>` — so the
     path knows which stops are finished without a second list of stops. */
  boss(level) {
    const d = store.read();
    d.boss = d.boss || {};
    d.boss[level] = true;
    store.write(d);
  },
  /* Sound is a choice, not a score: stored beside the progress only because that
     is what this device already keeps for the child. */
  sound(on) {
    const d = store.read();
    if (on) d.sound = true; else delete d.sound;
    store.write(d);
  },
  /* The daily stores one thing: the day whose puzzle is finished. Nothing about
     the play is kept — what the puzzle is comes from the date (js/daily.js). */
  daily(stamp) {
    const d = store.read();
    d.daily = stamp;
    store.write(d);
  },
  reset() { store.write({}); },
};
const solvedCount = () => Object.keys((store.read().done) || {}).length;
const starCount = () => Object.keys((store.read().first) || {}).length;
const isSolved = (key) => !!((store.read().done || {})[key]);
const isFirstTry = (key) => !!((store.read().first || {})[key]);
const soundOn = () => !!store.read().sound;
/* Today's puzzle is done when the day it was finished is today, in the reader's
   own calendar — so it turns over at their midnight, not at UTC's. */
const dailyDoneToday = () => (store.read().daily || '') === dayStamp(new Date());
const bossWins = () => (store.read().boss) || {};
/* A stop whose boss has been beaten at its level or a harder one is finished:
   a child who has already won against a stronger Pip does not have to prove it
   again at the easier one. */
const bossBeaten = (lesson) => Object.keys(bossWins()).some((level) => Number(level) >= lesson.boss.level);

/* Every progress write goes through here, so the two numbers can never drift
   apart or go stale: `done` is a puzzle the answer was found or shown for,
   `first` is a star — solved with no wrong answer and no hint. A star is also
   one of the two things in this app that makes a sound, and both ways of earning
   one come through here, so the chime cannot miss a call site.

   Two badges are counted from here as well, because this is the one place a
   puzzle result lands, whether it was played in a lesson or in the shuffle: the
   run of first-try answers, and the star total the last badge asks for. It
   answers the badges this answer earned, so the sheet that is already opening
   can say so. */
function record(key, firstTry) {
  store.solved(key);
  if (firstTry) { store.clean(key); sound.star(); }
  firstTryRun = firstTry ? firstTryRun + 1 : 0;
  const earned = [firstTry ? book.note('streak-5', firstTryRun) : null, book.note('all-stars', starCount())];
  paintStarCount();
  return earned.filter(Boolean);
}

/* A wrong answer ends the run of first-try answers, at the moment the answer is
   given rather than at the moment the puzzle is put down. `record` already zeroes
   the run for a puzzle that was solved after a miss, but a child who answers wrong
   and then walks away with "Next puzzle" never reaches `record` at all — and a
   badge that says "five in a row" has to mean five in a row. The visible streak
   already ends on the wrong answer; this is the same rule for the badge behind it,
   and all three boards that can be wrong call it in their not-accepted branch. */
function wrongAnswer() { firstTryRun = 0; }

/* ---------- badges ---------- */

/* The book of firsts. It reads and writes the same record as the stars, so
   "start over" clears the badges with everything else, and a badge is handed out
   once because its number only ever grows. `firstTryRun` is a run, not a tally,
   and lives in memory: a wrong answer ends it, and so does closing the tab. */
const book = createBook({
  read: () => store.read(),
  write: (d) => store.write(d),
  totals: { stars: TOTAL_DRILLS },
});
let firstTryRun = 0;

/* How far off the nearest badge is, in one line a child reads: a badge that
   takes one moment is named by what earns it, a badge that counts says what is
   left to count. */
function reachLine({ badge, of, need }) {
  return of === 1
    ? `Next: ${badge.name} — ${badge.what}.`
    : `Next: ${badge.name} — ${need} more ${badge.unit}.`;
}

/* A list of things, in words a child reads: "one, two and three". */
function andList(parts) {
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
}

/* The news, said where the child already is. There is no badge screen: the sheet
   or the card the moment itself opens carries the line. */
function badgeNews(earned) {
  if (!earned.length) return '';
  return ` New ${earned.length === 1 ? 'badge' : 'badges'}: ${andList(earned.map((badge) => `“${badge.name}”`))}.`;
}

/* The shelf: what a child has to show for it. Earned badges first, as green
   chips with a trophy; the rest as plain chips with a padlock — the reading the
   path already uses for a stop that is not open — with the nearest one named
   underneath. Every chip also says out loud which it is, because a tick and a
   padlock are shapes and a colour is not a word. */
function badgeShelf() {
  const { earned, next, locked, total } = book.shelf();
  const card = el('div', 'card');
  const head = el('div', 'between');
  head.appendChild(el('h2', null, 'My badges'));
  head.appendChild(el('span', 'chip', `${earned.length} of ${total} badges`));
  card.appendChild(head);
  const spaced = (node) => { node.style.marginTop = '10px'; return node; };

  if (earned.length) {
    const row = el('div', 'row');
    for (const { badge } of earned) {
      const chip = el('span', 'chip good');
      chip.title = badge.what;
      chip.appendChild(iconSvg('trophy', 16));
      chip.appendChild(el('span', null, badge.name));
      chip.appendChild(el('span', 'sr', ' — earned'));
      row.appendChild(chip);
    }
    card.appendChild(spaced(row));
  } else {
    card.appendChild(spaced(el('p', 'tiny', 'Nothing yet. Everything you earn shows up here.')));
  }

  card.appendChild(spaced(el('p', 'tiny', next ? reachLine(next) : 'Every badge earned.')));

  /* Every badge has a chip — the earned ones green with a trophy, the rest grey
     with a padlock, exactly how a stop on the path that is not open reads — so
     the count in the heading is the number of chips on the shelf, and the line
     above names the nearest one. */
  const rest = next ? [next, ...locked] : locked;
  if (rest.length) {
    const row = el('div', 'row');
    row.style.marginTop = '8px';
    for (const { badge } of rest) {
      const chip = el('span', 'chip');
      chip.title = badge.what;
      chip.appendChild(iconSvg('lock', 16));
      chip.appendChild(el('span', null, badge.name));
      chip.appendChild(el('span', 'sr', ' — not yet'));
      row.appendChild(chip);
    }
    card.appendChild(row);
  }
  return card;
}

/* What "start over" would delete, in words, counting only what is there: a
   child who has won a game and solved nothing has a badge to lose, and a boss
   win is a thing reset takes with the rest. */
const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
function cleared(done, stars, badges, bosses) {
  const bits = [];
  if (done) bits.push(plural(done, 'solved puzzle'));
  if (stars) bits.push(plural(stars, 'star'));
  if (badges) bits.push(plural(badges, 'badge'));
  if (bosses) bits.push(plural(bosses, 'boss win'));
  return andList(bits);
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
  /* A pack's mark: "more of this". It is not a number, because a detour is not a
     step of the course and counting it as one would say otherwise. */
  more: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
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

/* `pack` is the detour being played, or null when the view holds a lesson: a pack
   has no lesson number and is never `LESSONS[learn.lesson]`. */
const learn = { lesson: 0, pack: null, step: 0, state: null, tries: 0, celebrated: false };

/* A stop's stars, counted from the keys its own puzzles are recorded under. A pack
   is a stop with more of the same, so the same function counts it: ids are unique
   across lessons and packs — scripts/verify-site.ts fails one that is not — so a
   pack can never share a star with a lesson. */
function starsFor(unit) {
  const drills = unit.drills || [];
  const firsts = drills.filter((_, i) => isFirstTry(`drill:${unit.id}:${i}`)).length;
  const solved = drills.filter((_, i) => isSolved(`drill:${unit.id}:${i}`)).length;
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
/* A lesson is finished when every puzzle in it is solved; a boss stop has no
   puzzles and is finished when Pip has been beaten at the level it names. */
const lessonFinished = (lesson) => (lesson.boss
  ? bossBeaten(lesson)
  : (lesson.drills || []).every((_, i) => isSolved(`drill:${lesson.id}:${i}`)));
const lessonOpen = (lesson) => (lesson.requires || []).every((id) => lessonFinished(lessonById.get(id)));
const firstMissing = (lesson) => (lesson.requires || []).find((id) => !lessonFinished(lessonById.get(id)));

/* A pack is offered once the lesson that teaches its idea is finished, and is
   finished when its three puzzles are solved. Nothing else reads a pack: no
   lesson requires one, so a pack can neither open a step of the path nor hold one
   shut. That is what "optional" means here, and it is the whole of it. */
const packOpen = (pack) => lessonFinished(lessonById.get(pack.opensWith));
const packFinished = (pack) => (pack.drills || []).every((_, i) => isSolved(`drill:${pack.id}:${i}`));

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
/* Where a pack goes when the row it belongs to has no column left: slipped down
   between two rows. `scripts/verify-site.ts` fails a course whose rows are that
   full, so this is a shape rather than a stop that never gets drawn. */
const DETOUR_SLIP = 84;
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
    /* A pack stands in the same row as the lesson it opens with, in the column
       that row has left free, and nearest to that lesson — a detour beside the
       path, never a stop on it. */
    const taken = new Set(cols);
    for (const pack of PACKS.filter((p) => group.some((l) => l.id === p.opensWith))) {
      const home = placed.get(pack.opensWith);
      const free = [0, 1, 2].filter((c) => !taken.has(c))
        .sort((a, b) => Math.abs(MAP_COL[a] - home.x) - Math.abs(MAP_COL[b] - home.x) || a - b);
      if (free.length) taken.add(free[0]);
      placed.set(pack.id, {
        pack,
        depth: d,
        x: free.length ? MAP_COL[free[0]] : home.x,
        y: home.y + (free.length ? 0 : DETOUR_SLIP),
      });
    }
  }
  const deepest = Math.max(...[...placed.values()].map((p) => p.y));
  return { placed, height: deepest + 168 };
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
   child who has won five stars is a knight, not "level 2". The rungs were set
   against a course of 35 puzzles; the packs add nine more, so they are the same
   rungs scaled to the pool — a rung every six or seven stars, King still short of
   the last one, and `docs/DESIGN.md` carries the numbers and the reasoning. */
const RANKS = [['Pawn', 0], ['Knight', 6], ['Bishop', 13], ['Rook', 18], ['Queen', 23], ['King', 29]];
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
  intro.appendChild(el('p', null, `${LESSON_STOPS.length} lessons, ${TOTAL_DRILLS} puzzles, ${PACKS.length} detours and ${BOSS_STOPS.length} boss games. Finish a lesson and the path opens up — you choose which way to go.`));
  const done = solvedCount();
  /* The course is its stops, not only its puzzles: an unbeaten boss stop means
     there is still something on the path to do. */
  const allDone = LESSONS.every(lessonFinished);
  const goTo = nextLesson();
  const label = allDone ? 'Play it all again'
    : done === 0 ? 'Start lesson 1'
      : goTo.boss ? 'Keep going: the boss game'
        : `Keep going: lesson ${LESSONS.indexOf(goTo) + 1}`;
  const start = el('button', 'btn primary wide', label);
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

  /* What a child has to show for it, right under what the stars are worth: the
     shelf answers "what have I got?" before the path answers "where am I?" */
  list.appendChild(badgeShelf());

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
    if (!lesson) continue;
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
  /* A pack is joined to its lesson and to nothing else: a thin dashed thread for
     a detour, which never grows into a leg of the route — no leg runs through it
     and none depends on it. */
  for (const spot of placed.values()) {
    if (!spot.pack) continue;
    const home = placed.get(spot.pack.opensWith);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', `${home.x * 100}%`);
    l.setAttribute('y1', String(home.y));
    l.setAttribute('x2', `${spot.x * 100}%`);
    l.setAttribute('y2', String(spot.y));
    l.setAttribute('class', `detour${lessonFinished(lessonById.get(spot.pack.opensWith)) ? ' open' : ''}`);
    route.appendChild(l);
  }
  map.appendChild(route);

  /* A lesson and a pack are drawn by the same code, because on the screen they are
     the same thing: a stop with a name, a state and stars. Being optional is the
     one difference that shows — a dashed circle, a smaller word, and the word
     itself, so a child can see that this stop is extra and that passing it by
     costs nothing. */
  for (const unit of [...LESSONS, ...PACKS]) {
    const pack = packById.get(unit.id);
    const s = starsFor(unit);
    const spot = placed.get(unit.id);
    const boss = !!unit.boss;
    const state = pack
      ? (packFinished(pack) ? 'done' : packOpen(pack) ? 'open' : 'locked')
      : lessonFinished(unit) ? 'done' : lessonOpen(unit) ? 'open' : 'locked';
    const btn = el('button', `node ${state}${pack ? ' pack' : ''}${!pack && here && here.id === unit.id ? ' here' : ''}`);
    btn.type = 'button';
    btn.style.left = `${spot.x * 100}%`;
    btn.style.top = `${spot.y}px`;
    const dot = el('span', 'dot');
    if (state === 'done') dot.appendChild(iconSvg('tick', 25));
    else if (state === 'locked') dot.appendChild(iconSvg('lock', 25));
    /* A boss stop wears a king instead of a number: it is not the next lesson,
       it is the game at the end of the branch. A pack wears a plus — "more of
       this", the one thing it asks. */
    else if (boss) dot.appendChild(document.createTextNode('\u265A'));
    else if (pack) dot.appendChild(iconSvg('more', 25));
    else dot.appendChild(document.createTextNode(String(LESSONS.indexOf(unit) + 1)));
    btn.appendChild(dot);
    btn.appendChild(el('span', 'cap', unit.title));
    /* The lesson a stop waits on, in the same words for a pack as for a lesson: a
       number, because that is the stop's place on the path and every other locked
       stop says it that way. The sheet a tap opens names it in full. */
    const missing = pack ? lessonById.get(pack.opensWith) : lessonById.get(firstMissing(unit));
    if (state === 'locked') {
      btn.appendChild(el('span', 'sub', `after lesson ${LESSONS.indexOf(missing) + 1}`));
    } else if (boss) {
      btn.appendChild(el('span', 'sub', state === 'done' ? 'beaten' : 'beat Pip'));
    } else if (pack) {
      btn.appendChild(starRow(s.got, s.of));
      btn.appendChild(el('span', 'sub', state === 'done'
        ? (s.got === s.of ? 'optional · all first time' : `optional · ${s.got} of ${s.of} stars`)
        : `optional · ${s.of} puzzles`));
    } else {
      btn.appendChild(starRow(s.got, s.of));
      btn.appendChild(el('span', 'sub', state === 'done'
        ? (s.got === s.of ? 'all first time' : `${s.got} of ${s.of} stars`)
        : (s.solved === 0 ? `${s.of} puzzles` : `${s.solved} of ${s.of} puzzles`)));
    }
    btn.setAttribute('aria-label', pack
      ? (state === 'locked'
        ? `${unit.title}: a detour of ${s.of} puzzles, optional. Finish ${missing.title} first.`
        : `${unit.title}: a detour of ${s.of} puzzles, optional — nothing on the path needs it. ${s.solved} of ${s.of} solved, ${s.got} of ${s.of} stars.`)
      : state === 'locked'
        ? `${unit.title}: locked. Finish ${missing.title} first.`
        : boss
          ? `${unit.title}: a game against Pip, ${state === 'done' ? 'won' : 'not won yet. Win it to finish the branch'}.`
          : `${unit.title}: ${s.solved} of ${s.of} puzzles solved, ${s.got} of ${s.of} stars${state === 'done' ? ', finished' : ''}.`);
    /* A stop that is not open still answers: it names the lesson that opens it, and
       takes a learner there when that lesson is playable. */
    const notOpen = () => {
      const canGo = lessonOpen(missing);
      /* `pack` is undefined for a lesson, so the pack's own sentence is asked for
         only when there is one: `packFinished` reads `pack.drills`, and a locked
         lesson that reached for it threw before the sheet was drawn, so a tap on
         eleven of the stops answered nothing at all. */
      const solvedAhead = !!pack && packFinished(pack);
      showSheet({
        title: 'Not open yet',
        text: solvedAhead
          ? `All ${s.of} puzzles are solved — this detour opens on the path once you finish “${missing.title}”.`
          : `Finish “${missing.title}” first — then “${unit.title}” opens.`,
        icon: 'lock',
        action: canGo ? `Go to ${missing.title}` : 'Got it',
        cancel: 'Not now',
        onAction: canGo ? () => openLesson(LESSONS.indexOf(missing)) : undefined,
      });
    };
    btn.addEventListener('click', () => {
      /* A pack is not offered until its lesson is finished, and its puzzles are in
         the one pool — the Puzzles tab shuffles them and one can be today's puzzle —
         so a child can solve all three before the stop opens. The stop keeps the tick
         it earned, and a tap on it has to answer: a stop that looks playable and does
         nothing is the wall `docs/DESIGN.md` forbids. */
      if (pack && !packOpen(pack)) { notOpen(); return; }
      if (state !== 'locked') {
        if (pack) openPack(pack);
        else openLesson(LESSONS.indexOf(unit));
        return;
      }
      notOpen();
    });
    map.appendChild(btn);
  }

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
     the middle of another screen: it lives here, says what it deletes, and asks.
     Badges are something earned too — a won game earns one before a single puzzle
     is solved — so the question is asked whenever there is anything to clear. */
  const badges = book.shelf().earned.length;
  if (done > 0 || badges > 0) {
    const startOver = el('button', 'btn quiet wide', badges
      ? 'Start over and clear my stars and badges'
      : 'Start over and clear my stars');
    startOver.type = 'button';
    startOver.addEventListener('click', () => showSheet({
      title: 'Start over?',
      text: `This clears ${cleared(done, starCount(), badges, Object.keys(bossWins()).length)} on this device, and cannot be undone.`,
      icon: 'hmm',
      action: 'Yes, clear it',
      cancel: 'Keep my stars',
      onAction: () => {
        store.reset();
        train.streak = 0;
        train.current = null;
        firstTryRun = 0;
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
  /* A pack carries puzzles and nothing else: no page to read, no diagram to look
     at, so it opens on its first puzzle. A stop without a diagram gets no "Look
     at this" step either — there would be nothing in it. */
  if (lesson.diagram) steps.push({ kind: 'look' });
  (lesson.drills || []).forEach((drill, i) => steps.push({ kind: 'drill', drill, i }));
  steps.push({ kind: 'done' });
  return steps;
}

function openLesson(i) {
  const lesson = LESSONS[i];
  /* The map will not offer a locked lesson, but a stale sheet or a stray call can:
     it goes back to the path rather than around the course. */
  if (!lesson || !lessonOpen(lesson)) { backToList(); return; }
  /* A boss stop is not a lesson to read: it opens the game it is won by. */
  if (lesson.boss) { bossSheet(lesson); return; }
  learn.lesson = i;
  learn.pack = null;
  learn.step = 0;
  learn.celebrated = false;
  $('lesson-list').hidden = true;
  $('lesson-view').hidden = false;
  renderStep();
}

/* A pack opens into the same board, the same sheets, the same Hint and the same
   star rule as a lesson's puzzles — it is the same three-puzzle walk, off the
   path. Nothing here touches `learn.lesson`, so walking back out of a pack puts a
   learner exactly where they were on the path. The caller has already asked
   `packOpen`: a stop that is not offered answers with a sheet instead. */
function openPack(pack) {
  learn.pack = pack;
  learn.step = 0;
  learn.tries = 0;
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
  /* The view holds a lesson or a pack — never both. Everything below reads the
     stop, not the course, which is what lets one walk serve both. */
  const lesson = learn.pack || LESSONS[learn.lesson];
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
      if (!ok) wrongAnswer();
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
        const fresh = record(key, learn.tries === 1);
        /* A puzzle can deliver mate, and that is the same thing a game's
           checkmate sheet is: the badge is counted wherever the mate is. */
        if (isCheckmate(state.pos)) {
          const badge = book.note('checkmate', 1);
          if (badge) fresh.push(badge);
        }
        confetti();
        showSheet({
          title: 'Correct!',
          text: drill.why + badgeNews(fresh),
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
  const pack = learn.pack;
  const courseDone = LESSONS.every(lessonFinished);
  const card = el('div', 'card');
  const head = el('div', 'between');
  head.appendChild(el('h2', null, pack
    ? (s.got === s.of ? 'Every puzzle, first time!' : 'Detour done!')
    : courseDone ? 'The whole course!' : s.got === s.of ? 'All the stars!' : 'Lesson finished!'));
  head.appendChild(starRow(s.got, s.of));
  card.appendChild(head);
  card.appendChild(el('p', null, pack
    ? (s.got === s.of
      ? 'Three out of three, no help. Nothing on the path has moved — this was practice, and it stays open whenever you want it again.'
      : 'That is the detour done. Nothing on the path has moved: a pack is practice, and you can play these three again for the stars.')
    : courseDone
      ? 'Every lesson, every puzzle, and Pip thinks you are ready for a real game. Play him whenever you like — he is on the Play tab.'
      : s.got === s.of
        ? 'Every puzzle first time. Brilliant — that is a lesson done and a rank closer.'
        : 'Nice work, that is the lesson done. Play any puzzle again to try for the stars you missed.'));
  /* The path answers the only question a child has at this point: what now? A pack
     answers a different one — what next on the path — so it says the path is where
     it was, and points back at it rather than at a step it did not open. */
  const opened = pack ? [] : openedBy(lesson.id);
  if (opened.length) {
    const p = el('p', 'tiny');
    p.style.marginTop = '10px';
    p.textContent = opened.length === 1
      ? `The path goes on: ${opened[0].title} is open now.`
      : `The path splits two ways: ${opened.map((l) => l.title).join(' and ')}. Take either.`;
    card.appendChild(p);
  }
  /* The nearest badge, on the card that already asks what next. The shelf says
     the same thing, and this is the moment a child is looking: the reward for
     finishing a lesson is the next part of the path, and the next badge. */
  const nextBadge = book.shelf().next;
  if (nextBadge) {
    const p = el('p', 'tiny');
    p.style.marginTop = '10px';
    p.textContent = reachLine(nextBadge);
    card.appendChild(p);
  }
  const row = el('div', 'row');
  row.style.marginTop = '12px';
  const onward = pack ? null : (opened[0] || (courseDone ? null : nextLesson()));
  const next = el('button', 'btn primary', onward ? `Next: ${onward.title}` : 'Back to the path');
  next.type = 'button';
  next.addEventListener('click', () => (onward ? openLesson(LESSONS.indexOf(onward)) : backToList()));
  row.appendChild(next);
  /* A pack has one way out — the path it never left — so it gets one button. A
     lesson keeps both, because finishing one can open two things at once. */
  if (!pack) {
    const all = el('button', 'btn', 'The path');
    all.type = 'button';
    all.addEventListener('click', backToList);
    row.appendChild(all);
  }
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
  boss: null,   // the boss stop this game belongs to, or null for a free game
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
  setReply('');
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

/* Two voices, two places. The bubble is Pip judging *your* move and it keeps it
   until you move again; this line is *what just happened* — his own move, a
   threat, a check. One element could not hold both: his reply used to be written
   into the bubble 332ms after every tap, so the grade was gone before it could
   be read. Built here rather than in index.html so the play screen's markup and
   its height budget are untouched. */
let replyEl = null;
function replyLine() {
  if (!replyEl) {
    replyEl = el('p', 'tiny', '');
    replyEl.id = 'play-reply';
    replyEl.style.textAlign = 'center';
    /* Above the move list, not below it. The play screen's height budget lets
       the move list take the last of the scroll on a short phone; putting his
       move under it would push the one sentence that matters into the same hole. */
    $('play-moves').before(replyEl);
  }
  return replyEl;
}
function setReply(text) {
  replyLine().textContent = text;
  if (text) announce(text);
}

/* Pip's move in words a beginner reads, instead of SAN. `before` is the position
   he moved FROM — this describes the move, so it reads the piece and its victim
   as they stood, not as they stand now. (`threatWords` below wants the position
   after it: two questions, two positions, named so they cannot be swapped.) */
function pipMoveWords(before, move) {
  const piece = pieceAt(before, move.from);
  const victim = pieceAt(before, move.to);
  if (piece.type === 'k' && Math.abs(move.to - move.from) === 2) return 'Pip castled.';
  if (victim) return `Pip took your ${NAMES[victim.type]} on ${squareName(move.to)}.`;
  if (move.promotion) return `Pip made a new ${NAMES[move.promotion]}.`;
  return `Pip moved a ${NAMES[piece.type]} to ${squareName(move.to)}.`;
}

/* The biggest thing Pip's move is now threatening, said out loud — and nothing
   at all when there is nothing to say, because an alarm that fires on every
   move is not an alarm. The chess is `findThreat`; the words are here. */
function threatWords(after, move, childColour) {
  const t = findThreat(after, move.to, childColour === 'w' ? 'b' : 'w', childColour);
  if (!t) return '';
  const attacker = pieceAt(after, t.from);
  const victim = pieceAt(after, t.to);
  if (!attacker || !victim) return '';
  return `Pip's ${NAMES[attacker.type]} ${t.defended ? 'is attacking' : 'can take'} your ${NAMES[victim.type]}.`;
}

function userMove(move) {
  if (play.over || play.thinking) return;
  const pos = play.pos;
  /* Castling inside a game is one of the moments a badge comes from, and the one
     with no sheet of its own: a sheet over a live board between two moves would
     be worse than saying nothing, so this badge is only on the shelf. */
  const moved = pieceAt(pos, move.from);
  if (moved && moved.type === 'k' && Math.abs(move.to - move.from) === 2) book.note('castle', 1);
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
  sound.move();               // the clack lands with the piece, not with the grading
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
  /* A boss game has no Undo: its stop is finished by a win the child played,
     never by one rewound to (the stop's own card says so before it starts). */
  if (play.boss && !on) $('play-undo').disabled = true;
}

/* Leaving a boss game: the level and the side belong to the stop, so changing
   either one hands the child a free game instead. */
function leaveBossGame() {
  play.boss = null;
  $('play-undo').disabled = false;
}

/* What Pip thought of the move just played, in a child's words — and he has
   something to say about every one of them. He did not before: `said` started
   as the bare score and only two branches replaced it, one needing the move to
   *be* the engine's best and the other a loss of 70cp, so a good move and a
   blunder both read "Pip says the game is level." */
function gradeMove(pos, move) {
  const cfg = DEPTH[play.level];
  const before = searchEval(pos, { depth: cfg.evalDepth });
  const best = findBestMove(pos, { depth: Math.max(2, cfg.evalDepth) });
  const afterEval = searchEval(play.pos, { depth: cfg.evalDepth });
  const mine = play.colour === 'w' ? afterEval : -afterEval;
  const loss = Math.max(0, play.colour === 'w' ? before - afterEval : afterEval - before);
  const v = verdict(loss);
  /* The move the engine would have played cannot be criticised for the score it
     leaves behind: that drop is the opponent's reply, not the child's choice. */
  const bestIsThis = best && best.move && sameMove(move, best.move);
  const mate = isCheckmate(play.pos);
  const gaveCheck = inCheck(play.pos, play.pos.turn);
  const d = describeMove(pos, move);
  /* The check is announced in front of the sentence, so it is not also listed
     as a reason the move was good. */
  const rest = d.text.split(', ').filter((b) => b !== 'says check').join(', ');
  let said;
  if (mate) {
    said = 'Perfect! Checkmate — the game is yours.';
  } else if (bestIsThis) {
    said = `Perfect! That is the move Pip would play${rest && !d.empty ? ` — it ${rest}` : ''}.`;
  } else if (loss <= 40) {
    /* "Nice move. Pip says you are a little ahead." — no invented reason: a
       filler clause is worse than a short honest sentence. */
    said = rest && !d.empty ? `${v.word} — it ${rest}.` : stop(v.word);
  } else if (best && best.move) {
    const b = describeMove(pos, best.move);
    said = `${stop(v.word)} Better was the ${NAMES[pieceAt(pos, best.move.from).type]} move${b.empty ? '' : ` — it ${b.text}`}.`;
  } else {
    said = stop(v.word);
  }
  said += ` Pip says ${scoreWords(mine)}.`;
  /* A king in check is the one thing on the board a beginner must not miss, and
     the red frame alone does not say it out loud. */
  if (gaveCheck && !mate) said = 'Check! ' + said;
  coachSay(mate || bestIsThis || loss <= 40 ? 'good' : v.tone, said);
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
      sound.move();          // Pip's piece lands too — the ear hears both sides move
      updateMoves();
      /* What happened goes on the reply line. The bubble is left alone: the
         grade the child has not finished reading lives there. */
      const bits = [pipMoveWords(pos, res.move)];
      if (isCheckmate(play.pos)) bits.push('That is checkmate.');
      else if (inCheck(play.pos, play.pos.turn)) bits.push('Your king is in check.');
      const threat = threatWords(play.pos, res.move, play.colour);
      if (threat) bits.push(threat);
      setReply(bits.join(' '));
      if (finishIfOver()) return;
      $('play-turn').textContent = 'Your move';
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
    /* A boss stop is finished by a checkmate the child delivered — `youWin` is
       exactly that, so a Pip win leaves the stop open. A win can only be a
       rewound one in a free game, because a boss game has no Undo at all. */
    const boss = play.boss;
    if (youWin && boss) { store.boss(boss.boss.level); renderLessonList(); }
    if (youWin) play.boss = null;
    $('play-turn').textContent = youWin ? 'You win!' : 'Pip wins';
    /* The moment the game is decided is the moment its badges are counted: a game
       finished at all, and — if it went the child's way — the first win, the win
       at the level they chose, and the first checkmate delivered. */
    const fresh = [book.note('first-game', 1)];
    if (youWin) {
      fresh.push(book.note('first-win', 1), book.note(`win-level-${play.level}`, 1), book.note('checkmate', 1));
    }
    confetti();
    showSheet({
      title: youWin ? 'Checkmate — you win!' : 'Checkmate — Pip won',
      text: (youWin
        ? (boss ? `That finishes “${boss.title}” — that stop on the path is done.` : 'Well played. Start another game while you are warm.')
        : (boss ? 'Good try. Start again and beat him this time — a boss stop is finished only by a win.' : 'Good try. Undo a move or start again — every game teaches something.'))
        + badgeNews(fresh.filter(Boolean)),
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
    /* A drawn game is still a game finished — that is the badge, and it is the
       one a child earns first, before they can win anything. */
    const fresh = [book.note('first-game', 1)].filter(Boolean);
    showSheet({
      title: 'A draw',
      text: (play.boss
        ? 'A draw does not finish a boss stop — no win, no tick. Start again and mate him.'
        : isStalemate(pos)
          ? 'Nobody can move, so the game is a draw. That happens — start again.'
          : 'Neither side can win from here: the same position three times, fifty moves without a capture, or too little material left. Start again.')
        + badgeNews(fresh),
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
  if (play.boss) return;   // a boss game is never rewound — see setThinking
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
  setReply('');
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
  /* A boss game belongs to a stop, and the stop names the level: the one thing
     the child must not do by accident is walk out of it without knowing. */
  if (play.boss) {
    const note = el('p', 'tiny');
    note.style.marginTop = '8px';
    note.textContent = `This is a boss game for “${play.boss.title}”, played at ${LEVEL_NAME[play.boss.boss.level]}. Changing the level or the side starts a free game instead.`;
    sheet.appendChild(note);
  }
  for (const level of [1, 2, 3]) {
    const b = el('button', 'btn wide' + (level === play.level ? ' primary' : ''), level === 1 ? 'Level 1 — sleepy' : level === 2 ? 'Level 2 — club beginner' : 'Level 3 — plays properly');
    b.type = 'button';
    b.style.marginTop = '8px';
    b.addEventListener('click', () => {
      /* A level change out of a boss game abandons the stop, and the sheet has
         just promised the child a free game: a free game means a fresh board, so
         the game is restarted here. Leaving the old board up was the bug — the
         child stayed on it, out of the boss game with nothing on screen saying
         so, and a win from there finished no stop. */
      const abandonsBoss = !!play.boss && level !== play.boss.boss.level;
      if (abandonsBoss) leaveBossGame();
      play.level = level;
      $('play-level-label').textContent = LEVEL_NAME[level];
      closeSheet();
      if (abandonsBoss) newGame();
      coachSay('', `${abandonsBoss ? 'New game — ' : ''}Pip will play ${level === 1 ? 'sleepily' : level === 2 ? 'like a club beginner' : 'properly'} now.`);
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
      leaveBossGame();
      newGame();
      closeSheet();
    });
    choice.appendChild(b);
  }
  sides.appendChild(choice);
  sheet.appendChild(sides);
  sheet.appendChild(el('p', 'tiny', 'Changing the side starts a new game.'));
  /* Sound belongs here, with the two other things a child chooses once before a
     game. It is off until they turn it on, and that click is also the gesture a
     browser's autoplay policy asks for before a page may make a noise at all —
     so the context is unlocked by this button and never at load. */
  const audio = el('div', 'row');
  audio.style.marginTop = '16px';
  audio.appendChild(el('p', 'tiny', 'Sound'));
  const audioChoice = el('div', 'row');
  audioChoice.style.marginTop = '6px';
  const soundBtn = el('button', 'btn' + (sound.enabled() ? ' primary' : ''), sound.enabled() ? 'Sound: on' : 'Sound: off');
  soundBtn.type = 'button';
  soundBtn.setAttribute('aria-pressed', String(sound.enabled()));
  soundBtn.addEventListener('click', () => {
    const next = !sound.enabled();
    sound.setEnabled(next);
    store.sound(next);
    soundBtn.textContent = next ? 'Sound: on' : 'Sound: off';
    soundBtn.classList.toggle('primary', next);
    soundBtn.setAttribute('aria-pressed', String(next));
  });
  audioChoice.appendChild(soundBtn);
  audio.appendChild(audioChoice);
  sheet.appendChild(audio);
  sheet.appendChild(el('p', 'tiny', 'A clack when a piece moves, a chime for a star.'));
  sheet.hidden = false;
  $('scrim').hidden = false;
  const first = sheet.querySelector('button');
  if (first) first.focus();
}

/* ---------- boss stops ---------- */

/* A boss stop is a whole game, so the stop's card says what finishing it takes
   before the child has made a move, and then hands them to the play screen at
   the level the stop names. */
function bossSheet(lesson) {
  showSheet({
    title: lesson.goal,
    text: `${(lesson.body || []).join(' ')} Undo is off in a boss game, so the win has to be the one you play.`,
    icon: 'trophy',
    action: 'Play the boss game',
    cancel: 'Not now',
    onAction: () => startBossGame(lesson),
  });
}

function startBossGame(lesson) {
  play.boss = lesson;
  play.level = lesson.boss.level;
  $('play-level-label').textContent = LEVEL_NAME[play.level];
  play.colour = 'w';
  play.flip = false;
  newGame();
  showScreen('play');
  coachSay('', `Boss game: beat Pip to finish “${lesson.title}”. Undo is off here.`);
}

/* ---------- Puzzles ---------- */

/* The tab is one board and two places the board can be: today's puzzle, and the
   shuffle this tab was before the daily existed. `mode` says which one is out. */
const train = { current: null, streak: 0, tries: 0, state: null, mode: 'shuffled' };
let todayBtn = null;
let dailyChip = null;

/* Every puzzle the app can serve, in one list: the course's drills and the
   packs'. Today's puzzle, the shuffle and the count under the board all read this
   one list, so a puzzle in a pack is a puzzle like any other — it can be today's,
   and it counts towards the same total in the app bar. `stop` is whichever stop —
   a lesson or a pack — that the puzzle belongs to. */
function allDrills() {
  const out = [];
  for (const stop of [...LESSONS, ...PACKS]) {
    (stop.drills || []).forEach((d, j) => out.push({ stop, drill: d, key: `drill:${stop.id}:${j}` }));
  }
  return out;
}

function refreshTrain() {
  const done = (store.read().done) || {};
  $('train-streak').textContent = String(train.streak);
  $('train-solved').textContent = String(allDrills().filter((x) => done[x.key]).length);
  $('train-total').textContent = String(TOTAL_DRILLS);
  paintStarCount();
  paintTrainMode();
}

/* Which of the two places is on the board, said in words as well as in colour:
   the chip in the card's head names it, and the button that got you there is the
   pressed one. One chip at a time, because a third chip in that row squeezes all
   three narrow enough to wrap their own text — measured, and it cost 19px of
   board at 360x640 (docs/DESIGN.md carries the numbers). */
function paintTrainMode() {
  const daily = train.mode === 'today';
  dailyChip.hidden = !daily;
  $('train-solved').closest('.chip').hidden = daily;
  todayBtn.className = `btn${daily ? ' primary' : ''}`;
  $('train-next').className = `btn${daily ? '' : ' primary'}`;
  todayBtn.setAttribute('aria-pressed', String(daily));
  $('train-next').setAttribute('aria-pressed', String(!daily));
}

/* The switch between the two places: a button each, in the row of buttons that
   was already under the board. Two more buttons cost the board nothing there —
   the row is one line of three down to 320px (measured) — where a new control
   row, or one more line of copy, would have cost it 18px at 360x640, the screen
   this app is most used on. */
function wireTrain() {
  const next = $('train-next');
  next.textContent = 'Shuffled';
  dailyChip = el('span', 'chip', "Today's puzzle");
  const rightChip = $('train-solved').closest('.chip');
  rightChip.parentNode.insertBefore(dailyChip, rightChip);
  todayBtn = el('button', 'btn', 'Today');
  todayBtn.type = 'button';
  todayBtn.id = 'train-today';
  todayBtn.addEventListener('click', startDaily);
  next.parentNode.insertBefore(todayBtn, next);
  paintTrainMode();
}

/* The shuffle: the course's positions in a random order. A puzzle already solved
   comes back once the course has been through, and playing one twice cannot win
   a second star — `first` is a set of keys, not a counter. */
function nextPuzzle() {
  train.mode = 'shuffled';
  const done = (store.read().done) || {};
  const left = allDrills().filter((x) => !done[x.key]);
  const pool = left.length ? left : allDrills();
  const pick = pool[Math.floor(Math.random() * pool.length)];
  train.current = pick;
  train.tries = 0;
  const pos = parseFen(pick.drill.fen);
  $('train-prompt').textContent = pick.drill.prompt;
  $('train-where').textContent = `${pick.stop.title} · ${pos.turn === 'w' ? 'White' : 'Black'} to move`;
  $('train-hint').disabled = false;

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
    if (!ok) wrongAnswer();
    train.tries += 1;
    state.flash = { square: move.to, ok };
    state.last = move;
    state.pos = makeMove(pos, move);
    paint(state);
    if (ok) {
      state.locked = true;
      train.streak += 1;
      $('train-where').textContent = `${pick.stop.title} · solved`;
      const fresh = record(pick.key, train.tries === 1);
      if (isCheckmate(state.pos)) {
        const badge = book.note('checkmate', 1);
        if (badge) fresh.push(badge);
      }
      store.streak(train.streak);
      confetti();
      refreshTrain();
      showSheet({
        title: 'Correct!',
        text: pick.drill.why + badgeNews(fresh),
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

function finishDaily() {
  store.daily(dayStamp(new Date()));
  $('train-where').textContent = 'Done for today — a new one tomorrow';
  $('train-hint').disabled = true;
}

/* Today's puzzle: one of the course's own positions, picked from the date by
   js/daily.js, played on the same board with the same sheets and the same star
   rule as the shuffle. The only thing that is the daily's own is that it stops
   for the day once it is finished — which is also what keeps it from being
   farmed for stars: a second play in the same day is not a play. */
function startDaily() {
  /* A tap on Today from inside the daily is not a restart. Restarting it would
     put the tries counter back to nought and hand out a first-try star nobody
     earned. */
  if (train.mode === 'today' && train.current) return;
  const pick = dailyDrill(new Date(), allDrills());
  if (!pick) return nextPuzzle();
  train.mode = 'today';
  train.current = pick;
  train.tries = 0;
  const finished = dailyDoneToday();
  const pos = parseFen(pick.drill.fen);
  $('train-prompt').textContent = pick.drill.prompt;
  $('train-where').textContent = finished
    ? 'Done for today — a new one tomorrow'
    : `${pick.stop.title} · ${pos.turn === 'w' ? 'White' : 'Black'} to move`;
  /* Nothing to solve once the day's puzzle is done, so the board is a record of
     it: the position, the move that finishes it, and no piece to pick up. */
  $('train-hint').disabled = finished;

  const state = {
    container: $('train-board'),
    pos,
    selected: null,
    targets: new Set(),
    flip: pos.turn === 'b',
    accepted: (pick.drill.accepted || []).map((u) => u.toLowerCase()),
    locked: finished,
    over: false,
    last: null,
    hintMove: finished ? uciToMove(pos, String(pick.drill.best || pick.drill.accepted[0]).toLowerCase()) : null,
  };
  train.state = state;
  state.onSquare = tapHandler(state);
  state.onMove = (move) => {
    const ok = state.accepted.includes(toUci(move));
    if (!ok) wrongAnswer();
    train.tries += 1;
    state.flash = { square: move.to, ok };
    state.last = move;
    state.pos = makeMove(pos, move);
    /* The day's puzzle is over the moment its answer is found or shown, so it is
       painted finished rather than playable: a board still offering pieces to
       pick up is a board that looks open, and this one is done for the day. */
    if (ok || train.tries > 1) state.locked = true;
    paint(state);
    if (ok) {
      train.streak += 1;
      const fresh = record(pick.key, train.tries === 1);
      /* The day's puzzle is a puzzle like any other: the answer can deliver mate,
         and a mate is the same thing here as on the shuffle, the lesson board and
         the game's own checkmate sheet. Counted in the same place, and said on the
         sheet that is already opening. */
      if (isCheckmate(state.pos)) {
        const badge = book.note('checkmate', 1);
        if (badge) fresh.push(badge);
      }
      store.streak(train.streak);
      finishDaily();
      refreshTrain();
      confetti();
      showSheet({
        title: 'Correct!',
        text: `${pick.drill.why} Come back tomorrow for a new one.${badgeNews(fresh)}`,
        icon: 'happy',
        action: 'Shuffled puzzles',
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
        /* The answer shown ends the day's puzzle too: a child who cannot find it
           still needs a way to put it down for the day, and being shown the move
           is where the course has always ended a puzzle. It is not a star —
           `record` is given `false`, as it is everywhere else. */
        record(pick.key, false);
        finishDaily();
        refreshTrain();
        showSheet({
          title: 'Here is the move',
          text: d ? `The move is to ${d.verb}. ${pick.drill.why}` : pick.drill.why,
          icon: 'hmm',
          action: 'Shuffled puzzles',
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
  train: 'Today, then the rest.',
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
  /* The tab opens on the day's puzzle until that is done, and on the shuffle
     after it. A tab you are already on keeps the place you left it in. */
  if (name === 'train' && !train.current) (dailyDoneToday() ? nextPuzzle : startDaily)();
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

  /* Offline for real: the app's own files, cached by a service worker, so the
     footer's promise survives a reload with no network. */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline is a bonus, never a blocker */ });
    });
  }

  /* The child's own choice, put back. It must not make a sound or create an
     AudioContext — only the toggle's gesture may do that. */
  sound.restore(soundOn());

  wireTrain();
  renderLessonList();
  refreshTrain();
  showScreen('learn');
  // A ready signal for automated checks: the module, the engine and the course
  // all loaded, and the first screen is drawn.
  document.documentElement.dataset.appReady = 'true';
}

main();
