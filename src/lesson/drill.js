/* The drill's own arithmetic: a move written as UCI, the answer a drill accepts,
 * and which squares a tapped piece can reach.
 *
 * A drill is `{ fen, prompt, hint, why, best, accepted }` and every move in it is
 * written UCI — `'e2e4'`, `'e1g1'` for castling, `'a7a8q'` for a promotion. The
 * screen plays real engine moves, so one of these two spellings has to be turned
 * into the other on every answer, and the comparison has to be exact: a drill
 * whose accepted list is missed by a promotion letter is a drill that rejects a
 * good move, which is the one failure `docs/PORT.md` names.
 *
 * All of it is pure — the engine's own `legalMoves` is the only thing it asks —
 * so `tests/lesson.test.ts` plays every drill in the course without a browser.
 */
import { legalMovesFrom, pieceAt, squareName } from '../engine/engine.js';

const FILES = 'abcdefgh';

/** A move as the drill data spells it: `from` square, `to` square, and the
 *  promotion letter when the move carries one. */
export function toUci(move) {
  return squareName(move.from) + squareName(move.to) + (move.promotion || '');
}

/** The legal move a UCI string names in this position, or `null` when the
 *  position does not take that move — `v1`'s `uciToMove`, kept verbatim. */
export function uciToMove(pos, uci) {
  const text = String(uci ?? '').toLowerCase();
  if (text.length < 4) return null;
  const from = FILES.indexOf(text[0]) + (Number(text[1]) - 1) * 8;
  const to = FILES.indexOf(text[2]) + (Number(text[3]) - 1) * 8;
  if (from < 0 || to < 0) return null;
  return legalMovesFrom(pos, from).find((move) => move.to === to && (move.promotion || '') === (text[4] || '')) ?? null;
}

/** The moves a drill counts as an answer, lower-cased once so a comparison can
 *  never depend on how a position's data happens to be typed. */
export const accepted = (drill) => (drill.accepted ?? []).map((uci) => String(uci).toLowerCase());

/** Whether this move is one the drill accepts. */
export const answered = (drill, move) => accepted(drill).includes(toUci(move));

/**
 * The move the drill is asking for, in this position: its `best`, or the first
 * `accepted` move when the data carries no `best`. `null` when the position does
 * not take it — a caller shows the words rather than a move it cannot play.
 */
export function answerMove(pos, drill) {
  const named = String(drill.best || accepted(drill)[0] || '').toLowerCase();
  return uciToMove(pos, named);
}

/**
 * The squares a tapped piece can reach, one mark per square: `{ square,
 * capture }`, which is the shape `src/board/board.js` draws. The moves are
 * grouped by target so a promotion — which offers four moves to one square —
 * is one mark and not four.
 */
export function targetsFor(pos, from) {
  const moves = legalMovesFrom(pos, from);
  return [
    ...new Map(moves.map((move) => [move.to, { square: move.to, capture: !!pieceAt(pos, move.to) }])).values(),
  ];
}

/**
 * The move a tap means: from the picked square to the square tapped. A promotion
 * offers four moves to the same square, and when one of them is the drill's
 * answer that is the one a child meant — `v1`'s own rule, and the reason a
 * promotion drill is solvable at all.
 */
export function moveFor(pos, from, to, drill) {
  const choices = legalMovesFrom(pos, from).filter((move) => move.to === to);
  if (!choices.length) return null;
  const wanted = accepted(drill);
  return choices.find((move) => wanted.includes(toUci(move))) ?? choices[0];
}
