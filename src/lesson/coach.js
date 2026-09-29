/* The coach's words — what Pip says about a move, in a child's own language.
 *
 * `docs/PORT.md` is where the rules come from and they are rules, not taste: a
 * verdict for **every** move, the stronger move **named** when the move was not
 * the engine's own, and a move that *is* the engine's choice never criticised
 * for the score it leaves — that drop is the opponent's reply rather than the
 * child's choice. A check is announced first, and mate is announced as the end.
 *
 * Everything here is pure: it takes a position and a move and returns a sentence
 * and a tone, so `tests/lesson.test.ts` can read every band of it with no
 * browser. `src/ui/speech.js` is what draws it — the bubble is the verdict and
 * the line under the divider is what happened, and this module never confuses
 * the two.
 *
 * The engine speaks upper case (`typeOf` returns `'P'`…`'K'`) while a promotion
 * is lower case (`'q'`), which is exactly the pair of spellings `v1` got away
 * with because every type there was lower case. `nameOf` takes either.
 */
import {
  findBestMove,
  inCheck,
  isCheckmate,
  makeMove,
  pieceAt,
  san,
  searchEval,
  squareName,
} from '../engine/engine.js';

export const NAMES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

const nameOf = (type) => NAMES[String(type ?? '').toUpperCase()] ?? 'piece';

/* d4, e4, d5 and e5 — the four middle squares a pawn move to the centre takes. */
const CENTRE = [27, 28, 35, 36];

/** A move takes a promotion as a lower-case letter and a type as an upper-case
 *  one; one comparison normalises both so two spellings of one move are equal. */
export const sameMove = (a, b) => !!a && !!b && a.from === b.from && a.to === b.to
  && (a.promotion || null) === (b.promotion || null);

/**
 * What a move does, in words a nine-year-old reads without stopping — `v1`'s
 * `describeMove`, kept word for word. `text` is the clause that follows "it …";
 * `verb` is the same move written as an instruction, for the reveal; `empty`
 * says the move had nothing worth naming, which is a real answer and not a
 * failure.
 */
export function describeMove(pos, move) {
  const piece = pieceAt(pos, move.from);
  const victim = pieceAt(pos, move.to);
  if (!piece) return { san: '', text: '', verb: 'play that move', empty: true };
  const bits = [];
  if (piece.type === 'K' && Math.abs(move.to - move.from) === 2) bits.push('tucks the king away safely');
  else {
    if (victim) bits.push(`wins the ${nameOf(victim.type)} on ${squareName(move.to)}`);
    if (move.promotion) bits.push(`turns the pawn into a ${nameOf(move.promotion)}`);
    const fromRank = Math.floor(move.from / 8);
    const toRank = Math.floor(move.to / 8);
    if ((piece.type === 'N' || piece.type === 'B') && (fromRank === 0 || fromRank === 7) && toRank !== 0 && toRank !== 7) {
      bits.push('brings a piece out');
    }
    if (piece.type === 'P' && CENTRE.includes(move.to)) bits.push('takes the middle');
  }
  const after = makeMove(pos, move);
  if (isCheckmate(after)) bits.unshift('checkmate');
  else if (inCheck(after, after.turn)) bits.push('says check');

  let verb = 'play that move';
  if (piece.type === 'K' && Math.abs(move.to - move.from) === 2) verb = 'castle';
  else if (victim) verb = `take the ${nameOf(victim.type)} on ${squareName(move.to)}`;
  else if (move.promotion) verb = `make a new ${nameOf(move.promotion)}`;
  else if ((piece.type === 'N' || piece.type === 'B') && (Math.floor(move.from / 8) === 0 || Math.floor(move.from / 8) === 7)) verb = `bring the ${nameOf(piece.type)} out`;
  else if (piece.type === 'P' && CENTRE.includes(move.to)) verb = 'take the middle';

  return { san: san(pos, move), text: bits.join(', ') || 'keeps things tidy', verb, empty: bits.length === 0 };
}

/* 'Perfect!' already ends in a punctuation mark of its own. */
const stop = (word) => (/[!?.]$/.test(word) ? word : `${word}.`);

/**
 * How a played move rates, in a child's words, from the centipawns it gave away
 * — `v1`'s six bands, kept as written because `docs/PORT.md` carries them.
 */
export function verdict(loss) {
  if (loss <= 10) return { word: 'Perfect!', tone: 'good' };
  if (loss <= 40) return { word: 'Nice move', tone: 'good' };
  if (loss <= 70) return { word: 'Okay', tone: 'plain' };
  if (loss <= 150) return { word: 'Careful', tone: 'bad' };
  if (loss <= 300) return { word: 'That loses something', tone: 'bad' };
  return { word: 'Oops', tone: 'bad' };
}

/**
 * What Pip says about the move just played: the verdict line for the bubble, and
 * the tone that tints it. The child is the side to move in `pos`.
 *
 * The search is the whole cost of this function, so a caller paints the move on
 * the board first and calls this after — the lesson `v1` learned at level 3,
 * where a tap froze the board for a fifth of a second with nothing on screen to
 * say it had landed.
 */
export function grade(pos, move, { depth = 3 } = {}) {
  const child = pos.turn;
  /* Scores are centipawns from White's point of view, so the child's own loss is
   * a subtraction one way and the other way round for Black. */
  const before = searchEval(pos, { depth });
  const after = makeMove(pos, move);
  const afterEval = searchEval(after, { depth });
  const loss = Math.max(0, child === 'w' ? before - afterEval : afterEval - before);

  const best = findBestMove(pos, { depth: Math.max(2, depth) });
  const bestIsThis = best?.move ? sameMove(move, best.move) : false;
  const mate = isCheckmate(after);
  const gaveCheck = inCheck(after, after.turn);
  const described = describeMove(pos, move);
  /* A check is announced in front of the sentence, so it is not also listed as
   * one of the reasons the move was good. */
  const rest = described.text.split(', ').filter((bit) => bit !== 'says check').join(', ');
  const rated = verdict(loss);

  let line;
  if (mate) {
    line = 'Perfect! Checkmate — the game is yours.';
  } else if (bestIsThis) {
    /* The engine's own move is never criticised for what follows it. */
    line = `Perfect! That is the move Pip would play${rest && !described.empty ? ` — it ${rest}` : ''}.`;
  } else if (loss <= 40) {
    /* No invented reason: a filler clause is worse than a short honest sentence. */
    line = rest && !described.empty ? `${rated.word} — it ${rest}.` : stop(rated.word);
  } else if (best?.move) {
    const better = describeMove(pos, best.move);
    const piece = pieceAt(pos, best.move.from);
    line = `${stop(rated.word)} Better was the ${nameOf(piece?.type)} move${better.empty ? '' : ` — it ${better.text}`}.`;
  } else {
    line = stop(rated.word);
  }
  /* A king in check is the one thing on the board a beginner must not miss. */
  if (gaveCheck && !mate) line = `Check! ${line}`;

  return { line, tone: mate || bestIsThis || loss <= 40 ? 'good' : rated.tone, loss };
}
