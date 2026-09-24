/* Learn chess — the rules engine and the computer opponent.
 *
 * A dependency-free chess engine in plain ES module JavaScript. It runs
 * directly in the browser (`<script type="module">`) and under `bun test`;
 * it uses no imports, no Node-only APIs and no build step.
 *
 * Board representation
 * --------------------
 *   squares: 0..63, a1 = 0, b1 = 1, ... h1 = 7, a8 = 56, ... h8 = 63
 *            (index = rank * 8 + file, rank 0 = the first rank)
 *   board:   64-entry array; 'P'..'K' white, 'p'..'k' black, null when empty
 *   position: { board, turn, castling:{K,Q,k,q}, ep, halfmove, fullmove }
 *
 * A "move" is { from, to } plus, when it applies, `promotion` ('q'|'r'|'b'|'n',
 * lowercase), `castle` ('K'|'Q') and `enPassant` (true). Everything else —
 * captures, checks, results — is derived from the position.
 *
 * All scores are centipawns from WHITE's point of view, unless a function says
 * otherwise (the internal negamax is side-to-move relative).
 *
 * The API the app and the tests use:
 *   START_FEN                       the opening position as a FEN string
 *   parseFen(fen) -> position       toFen(pos) -> fen
 *   legalMoves(pos) -> moves        makeMove(pos, move) -> new position
 *   inCheck(pos, color)             isCheckmate / isStalemate / isDraw(pos, history)
 *   isInsufficientMaterial(pos)     evaluate(pos) -> centipawns, white's side
 *   san(pos, move) -> 'Nf3'         findBestMove(pos, {depth, quiescence, seed})
 *   searchEval(pos, {depth})        gameStatus(pos), positionKey(pos), ...
 *
 * Extras that cost nothing to expose and help a UI: squareName / parseSquare,
 * colorOf / typeOf / pieceAt, legalMovesFrom, pseudoLegalMoves, clonePos,
 * isAttacked, applyMoveInPlace / undoMoveInPlace (the in-place pair that the
 * search itself runs on).
 */

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Mate score. A mate in n plies is scored MATE - n, so shorter mates win. */
export const MATE = 100000;

const FILE_CHARS = 'abcdefgh';
const RANK_CHARS = '12345678';

const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const KNIGHT_DELTAS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_DELTAS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const QUEEN_DIRS = ROOK_DIRS.concat(BISHOP_DIRS);

/* ------------------------------------------------------------------ *
 * squares and pieces
 * ------------------------------------------------------------------ */

/** 28 -> 'e4' */
export function squareName(sq) {
  return FILE_CHARS[sq & 7] + RANK_CHARS[sq >> 3];
}

/** 'e4' -> 28, or -1 when the name is not a square. */
export function parseSquare(name) {
  if (typeof name !== 'string' || name.length < 2) return -1;
  const f = FILE_CHARS.indexOf(name[0].toLowerCase());
  const r = RANK_CHARS.indexOf(name[1]);
  if (f < 0 || r < 0) return -1;
  return r * 8 + f;
}

/** 'w' | 'b' | null */
export function colorOf(pc) {
  if (pc == null) return null;
  return pc <= 'Z' ? 'w' : 'b';
}

/** 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | null (upper case, whatever the colour) */
export function typeOf(pc) {
  return pc == null ? null : pc.toUpperCase();
}

function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}

/* ------------------------------------------------------------------ *
 * FEN
 * ------------------------------------------------------------------ */

/**
 * A FEN string to a position. Anything structurally broken (a rank that is
 * not eight squares, an unknown piece letter, a bad side-to-move or castling
 * field) throws a TypeError, so a typo in lesson data is caught by whoever
 * wrote it instead of turning into an empty board.
 */
export function parseFen(fen) {
  const parts = String(fen).trim().split(/\s+/);
  const placement = parts[0] || '';
  const turnField = parts[1];
  const castlingStr = parts[2] && parts[2] !== '-' ? parts[2] : '';
  const epStr = parts[3] && parts[3] !== '-' ? parts[3] : null;
  const halfmoveField = parts[4];
  const fullmoveField = parts[5];

  const board = new Array(64).fill(null);
  let rank = 7;
  let file = 0;
  let ranks = 0;
  let rankFiles = 0;
  for (const ch of placement) {
    if (ch === '/') {
      if (rankFiles !== 8) throw new TypeError(`parseFen: rank ${rank + 1} is not eight squares: ${fen}`);
      ranks += 1;
      rank -= 1;
      file = 0;
      rankFiles = 0;
    } else if (ch >= '1' && ch <= '8') {
      const n = ch.charCodeAt(0) - 48;
      file += n;
      rankFiles += n;
    } else if (/[pnbrqkPNBRQK]/.test(ch)) {
      if (rank < 0 || rank > 7 || file > 7) throw new TypeError(`parseFen: too many squares in a rank: ${fen}`);
      board[rank * 8 + file] = ch;
      file += 1;
      rankFiles += 1;
    } else {
      throw new TypeError(`parseFen: '${ch}' is not a piece or a rank count: ${fen}`);
    }
  }
  if (rankFiles !== 8) throw new TypeError(`parseFen: rank ${rank + 1} is not eight squares: ${fen}`);
  ranks += 1;
  if (ranks !== 8) throw new TypeError(`parseFen: ${ranks} ranks instead of eight: ${fen}`);

  if (turnField != null && turnField !== 'w' && turnField !== 'b') {
    throw new TypeError(`parseFen: side to move must be 'w' or 'b', not '${turnField}': ${fen}`);
  }
  const turn = turnField === 'b' ? 'b' : 'w';

  const castling = { K: false, Q: false, k: false, q: false };
  for (const c of castlingStr) {
    if (!Object.prototype.hasOwnProperty.call(castling, c)) {
      throw new TypeError(`parseFen: '${c}' is not a castling right: ${fen}`);
    }
    castling[c] = true;
  }

  const ep = epStr ? parseSquare(epStr) : null;
  if (epStr && ep < 0) throw new TypeError(`parseFen: '${epStr}' is not an en passant square: ${fen}`);

  const halfmove = halfmoveField != null ? Number(halfmoveField) : 0;
  if (halfmoveField != null && !/^\d+$/.test(halfmoveField)) {
    throw new TypeError(`parseFen: halfmove clock '${halfmoveField}' is not a number: ${fen}`);
  }
  const fullmove = fullmoveField != null ? Number(fullmoveField) : 1;
  if (fullmoveField != null && !/^\d+$/.test(fullmoveField)) {
    throw new TypeError(`parseFen: move number '${fullmoveField}' is not a number: ${fen}`);
  }

  return {
    board,
    turn,
    castling,
    ep: ep != null && ep >= 0 ? ep : null,
    halfmove,
    fullmove: fullmove > 0 ? fullmove : 1,
  };
}

export function toFen(pos) {
  let placement = '';
  for (let rank = 7; rank >= 0; rank -= 1) {
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const pc = pos.board[rank * 8 + file];
      if (pc) {
        if (empty) {
          placement += String(empty);
          empty = 0;
        }
        placement += pc;
      } else {
        empty += 1;
      }
    }
    if (empty) placement += String(empty);
    if (rank > 0) placement += '/';
  }

  const c = pos.castling || {};
  let rights = '';
  if (c.K) rights += 'K';
  if (c.Q) rights += 'Q';
  if (c.k) rights += 'k';
  if (c.q) rights += 'q';
  if (!rights) rights = '-';

  const ep = pos.ep == null ? '-' : squareName(pos.ep);
  const halfmove = pos.halfmove == null ? 0 : pos.halfmove;
  const fullmove = pos.fullmove == null ? 1 : pos.fullmove;
  return `${placement} ${pos.turn} ${rights} ${ep} ${halfmove} ${fullmove}`;
}

export function clonePos(pos) {
  return {
    board: pos.board.slice(),
    turn: pos.turn,
    castling: { ...pos.castling },
    ep: pos.ep == null ? null : pos.ep,
    halfmove: pos.halfmove | 0,
    fullmove: pos.fullmove | 0,
  };
}

/* ------------------------------------------------------------------ *
 * attack detection
 * ------------------------------------------------------------------ */

/** Is `sq` attacked by any piece of colour `by`? */
export function isAttacked(board, sq, by) {
  const f = sq & 7;
  const r = sq >> 3;

  // pawns: an attacking pawn sits one rank "behind" the square along its push
  const pdr = by === 'w' ? -1 : 1;
  for (let df = -1; df <= 1; df += 2) {
    const nf = f + df;
    const nr = r + pdr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const pc = board[nr * 8 + nf];
    if (pc && colorOf(pc) === by && typeOf(pc) === 'P') return true;
  }

  // knights
  for (let i = 0; i < KNIGHT_DELTAS.length; i += 1) {
    const nf = f + KNIGHT_DELTAS[i][0];
    const nr = r + KNIGHT_DELTAS[i][1];
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const pc = board[nr * 8 + nf];
    if (pc && colorOf(pc) === by && typeOf(pc) === 'N') return true;
  }

  // king
  for (let i = 0; i < KING_DELTAS.length; i += 1) {
    const nf = f + KING_DELTAS[i][0];
    const nr = r + KING_DELTAS[i][1];
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const pc = board[nr * 8 + nf];
    if (pc && colorOf(pc) === by && typeOf(pc) === 'K') return true;
  }

  // sliders: rooks/queens on the ranks and files, bishops/queens on the diagonals
  for (let d = 0; d < QUEEN_DIRS.length; d += 1) {
    const df = QUEEN_DIRS[d][0];
    const dr = QUEEN_DIRS[d][1];
    const diagonal = df !== 0 && dr !== 0;
    let nf = f + df;
    let nr = r + dr;
    while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
      const pc = board[nr * 8 + nf];
      if (pc) {
        if (colorOf(pc) === by) {
          const t = typeOf(pc);
          if (t === 'Q' || (diagonal ? t === 'B' : t === 'R')) return true;
        }
        break;
      }
      nf += df;
      nr += dr;
    }
  }

  return false;
}

function findKing(board, color) {
  const target = color === 'w' ? 'K' : 'k';
  for (let i = 0; i < 64; i += 1) if (board[i] === target) return i;
  return -1;
}

export function inCheck(pos, color = 'w') {
  const k = findKing(pos.board, color);
  if (k < 0) return false;
  return isAttacked(pos.board, k, opposite(color));
}

/* ------------------------------------------------------------------ *
 * move generation (pseudo-legal) and make/unmake
 * ------------------------------------------------------------------ */

function pushPawnMove(moves, from, to, lastRank) {
  if ((to >> 3) === lastRank) {
    moves.push({ from, to, promotion: 'q' });
    moves.push({ from, to, promotion: 'r' });
    moves.push({ from, to, promotion: 'b' });
    moves.push({ from, to, promotion: 'n' });
  } else {
    moves.push({ from, to });
  }
}

function addCastling(pos, moves) {
  const b = pos.board;
  const us = pos.turn;
  const them = opposite(us);
  const c = pos.castling;
  const homeRank = us === 'w' ? 0 : 7;
  const kingSq = homeRank * 8 + 4;
  if (b[kingSq] !== (us === 'w' ? 'K' : 'k')) return;

  const kingSide = us === 'w' ? c.K : c.k;
  const queenSide = us === 'w' ? c.Q : c.q;

  if (kingSide) {
    const rookSq = homeRank * 8 + 7;
    if (
      b[rookSq] === (us === 'w' ? 'R' : 'r') &&
      !b[kingSq + 1] && !b[kingSq + 2] &&
      !isAttacked(b, kingSq, them) &&
      !isAttacked(b, kingSq + 1, them) &&
      !isAttacked(b, kingSq + 2, them)
    ) {
      moves.push({ from: kingSq, to: kingSq + 2, castle: 'K' });
    }
  }

  if (queenSide) {
    const rookSq = homeRank * 8 + 0;
    if (
      b[rookSq] === (us === 'w' ? 'R' : 'r') &&
      !b[kingSq - 1] && !b[kingSq - 2] && !b[kingSq - 3] &&
      !isAttacked(b, kingSq, them) &&
      !isAttacked(b, kingSq - 1, them) &&
      !isAttacked(b, kingSq - 2, them)
    ) {
      moves.push({ from: kingSq, to: kingSq - 2, castle: 'Q' });
    }
  }
}

/** Every move that follows the movement rules, ignoring king safety. */
export function pseudoLegalMoves(pos) {
  const b = pos.board;
  const us = pos.turn;
  const them = opposite(us);
  const moves = [];

  for (let sq = 0; sq < 64; sq += 1) {
    const pc = b[sq];
    if (!pc || colorOf(pc) !== us) continue;
    const type = typeOf(pc);
    const f = sq & 7;
    const r = sq >> 3;

    if (type === 'P') {
      const dir = us === 'w' ? 1 : -1;
      const startRank = us === 'w' ? 1 : 6;
      const lastRank = us === 'w' ? 7 : 0;
      const nr = r + dir;
      if (nr < 0 || nr > 7) continue;
      const one = nr * 8 + f;
      if (!b[one]) {
        pushPawnMove(moves, sq, one, lastRank);
        if (r === startRank) {
          const two = (r + dir * 2) * 8 + f;
          if (!b[two]) moves.push({ from: sq, to: two });
        }
      }
      for (let df = -1; df <= 1; df += 2) {
        const nf = f + df;
        if (nf < 0 || nf > 7) continue;
        const to = nr * 8 + nf;
        const victim = b[to];
        if (victim) {
          if (colorOf(victim) === them) pushPawnMove(moves, sq, to, lastRank);
        } else if (pos.ep != null && pos.ep === to) {
          moves.push({ from: sq, to, enPassant: true });
        }
      }
    } else if (type === 'N' || type === 'K') {
      const deltas = type === 'N' ? KNIGHT_DELTAS : KING_DELTAS;
      for (let i = 0; i < deltas.length; i += 1) {
        const nf = f + deltas[i][0];
        const nr = r + deltas[i][1];
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const to = nr * 8 + nf;
        const victim = b[to];
        if (victim && colorOf(victim) === us) continue;
        moves.push({ from: sq, to });
      }
      if (type === 'K') addCastling(pos, moves);
    } else {
      const dirs = type === 'B' ? BISHOP_DIRS : type === 'R' ? ROOK_DIRS : QUEEN_DIRS;
      for (let d = 0; d < dirs.length; d += 1) {
        const df = dirs[d][0];
        const dr = dirs[d][1];
        let nf = f + df;
        let nr = r + dr;
        while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
          const to = nr * 8 + nf;
          const victim = b[to];
          if (victim) {
            if (colorOf(victim) === them) moves.push({ from: sq, to });
            break;
          }
          moves.push({ from: sq, to });
          nf += df;
          nr += dr;
        }
      }
    }
  }

  return moves;
}

/**
 * Apply a move to `pos` IN PLACE and return an undo record.
 * Handles promotion (queen when the move does not say), castling (rook moves
 * too), en passant, castling rights, the ep square, both clocks and the turn.
 */
export function applyMoveInPlace(pos, move) {
  const b = pos.board;
  const from = move.from;
  const to = move.to;
  const piece = b[from];
  const color = colorOf(piece);
  const type = typeOf(piece);

  let castle = move.castle || null;
  if (type === 'K' && (to >> 3) === (from >> 3) && Math.abs((to & 7) - (from & 7)) === 2) {
    castle = to > from ? 'K' : 'Q';
  }

  let promotion = move.promotion ? String(move.promotion).toLowerCase() : null;
  if (type === 'P' && (to >> 3) === (color === 'w' ? 7 : 0) && !promotion) promotion = 'q';

  const isEnPassant = type === 'P' && (to & 7) !== (from & 7) && !b[to];

  const undo = {
    piece,
    color,
    from,
    to,
    captured: null,
    capSq: -1,
    rookPiece: null,
    rookFrom: -1,
    rookTo: -1,
    castling: { ...pos.castling },
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
  };

  if (isEnPassant) {
    const capSq = to + (color === 'w' ? -8 : 8);
    undo.captured = b[capSq];
    undo.capSq = capSq;
    b[capSq] = null;
  } else if (b[to]) {
    undo.captured = b[to];
    undo.capSq = to;
  }

  b[to] = piece;
  b[from] = null;
  if (promotion) b[to] = color === 'w' ? promotion.toUpperCase() : promotion;

  if (castle) {
    const homeRank = color === 'w' ? 0 : 7;
    undo.rookFrom = castle === 'K' ? homeRank * 8 + 7 : homeRank * 8 + 0;
    undo.rookTo = castle === 'K' ? to - 1 : to + 1;
    undo.rookPiece = b[undo.rookFrom];
    b[undo.rookTo] = undo.rookPiece;
    b[undo.rookFrom] = null;
  }

  const c = pos.castling;
  if (type === 'K') {
    if (color === 'w') { c.K = false; c.Q = false; } else { c.k = false; c.q = false; }
  }
  if (from === 0 || to === 0) c.Q = false;
  if (from === 7 || to === 7) c.K = false;
  if (from === 56 || to === 56) c.q = false;
  if (from === 63 || to === 63) c.k = false;

  pos.ep = null;
  if (type === 'P' && Math.abs(to - from) === 16) pos.ep = (from + to) >> 1;

  if (type === 'P' || undo.captured != null) pos.halfmove = 0;
  else pos.halfmove += 1;

  if (color === 'b') pos.fullmove += 1;
  pos.turn = opposite(color);

  return undo;
}

export function undoMoveInPlace(pos, move, undo) {
  const b = pos.board;
  const to = undo.to;
  b[undo.from] = undo.piece;
  b[to] = undo.capSq === to ? undo.captured : null;
  if (undo.capSq >= 0 && undo.capSq !== to) b[undo.capSq] = undo.captured;
  if (undo.rookFrom >= 0) {
    b[undo.rookTo] = null;
    b[undo.rookFrom] = undo.rookPiece;
  }
  pos.castling = undo.castling;
  pos.ep = undo.ep;
  pos.halfmove = undo.halfmove;
  pos.fullmove = undo.fullmove;
  pos.turn = undo.color;
  return move;
}

/** A brand-new position with the move applied. The input is never touched. */
export function makeMove(pos, move) {
  const next = clonePos(pos);
  applyMoveInPlace(next, move);
  return next;
}

/** Every fully legal move for the side to move (own king never left in check). */
export function legalMoves(pos) {
  const work = clonePos(pos);
  const us = pos.turn;
  const out = [];
  const pseudo = pseudoLegalMoves(pos);
  for (let i = 0; i < pseudo.length; i += 1) {
    const m = pseudo[i];
    const undo = applyMoveInPlace(work, m);
    if (!inCheck(work, us)) out.push(m);
    undoMoveInPlace(work, m, undo);
  }
  return out;
}

/** Legal moves out of one square — handy for a UI. */
export function legalMovesFrom(pos, sq) {
  return legalMoves(pos).filter((m) => m.from === sq);
}

/* ------------------------------------------------------------------ *
 * results
 * ------------------------------------------------------------------ */

export function isCheckmate(pos) {
  return legalMoves(pos).length === 0 && inCheck(pos, pos.turn);
}

export function isStalemate(pos) {
  return legalMoves(pos).length === 0 && !inCheck(pos, pos.turn);
}

export function isInsufficientMaterial(pos) {
  const minors = { w: [], b: [] };
  for (let sq = 0; sq < 64; sq += 1) {
    const pc = pos.board[sq];
    if (!pc) continue;
    const t = typeOf(pc);
    if (t === 'K') continue;
    if (t === 'P' || t === 'R' || t === 'Q') return false;
    minors[colorOf(pc)].push({ sq, t });
  }
  const w = minors.w;
  const b = minors.b;
  if (w.length === 0 && b.length === 0) return true;   // K vs K
  if (w.length + b.length === 1) return true;          // K+minor vs K
  if (w.length === 1 && b.length === 1) {
    // two bishops on the same colour of square: dead drawn
    const light = (s) => ((s >> 3) + (s & 7)) % 2 === 0;
    return w[0].t === 'B' && b[0].t === 'B' && light(w[0].sq) === light(b[0].sq);
  }
  return false;
}

/**
 * A repetition key: piece placement, side to move, castling rights and — only
 * when a pawn could actually take it — the en passant square.
 */
export function positionKey(pos) {
  let key = '';
  for (let i = 0; i < 64; i += 1) key += pos.board[i] || '.';
  key += ` ${pos.turn} `;
  const c = pos.castling || {};
  const rights = (c.K ? 'K' : '') + (c.Q ? 'Q' : '') + (c.k ? 'k' : '') + (c.q ? 'q' : '');
  key += rights || '-';
  let ep = '-';
  if (pos.ep != null && pseudoLegalMoves(pos).some((m) => m.enPassant)) ep = squareName(pos.ep);
  key += ` ${ep}`;
  return key;
}

/**
 * Draw by the 50-move rule, threefold repetition or dead position.
 * `historyPositions` may hold FEN strings or position objects (oldest first);
 * the current position is counted as one occurrence on top of them.
 */
export function isDraw(pos, historyPositions = []) {
  if ((pos.halfmove | 0) >= 100) return true;
  if (isInsufficientMaterial(pos)) return true;
  const key = positionKey(pos);
  let seen = 1;
  for (let i = 0; i < historyPositions.length; i += 1) {
    const h = historyPositions[i];
    if (h == null) continue;
    const k = typeof h === 'string' ? positionKey(parseFen(h)) : positionKey(h);
    if (k === key) {
      seen += 1;
      if (seen >= 3) return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * static evaluation: material + piece-square tables (white's point of view)
 * ------------------------------------------------------------------ */

// Tables are written the way a board is printed: first row = rank 8.
const PST_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const PST_KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const PST_BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const PST_ROOK = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const PST_QUEEN = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const PST_KING = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
// Piece-square tables are symmetric left/right, so the king table above is
// also the endgame table: it already rewards the centre and the corners.
const PST = { P: PST_PAWN, N: PST_KNIGHT, B: PST_BISHOP, R: PST_ROOK, Q: PST_QUEEN, K: PST_KING };

/** Static evaluation in centipawns, white positive. */
export function evaluate(pos) {
  let score = 0;
  for (let sq = 0; sq < 64; sq += 1) {
    const pc = pos.board[sq];
    if (!pc) continue;
    const t = typeOf(pc);
    const value = PIECE_VALUE[t];
    if (colorOf(pc) === 'w') {
      // table index for white: flip the rank (sq ^ 56)
      score += value + PST[t][sq ^ 56];
    } else {
      score -= value + PST[t][sq];
    }
  }
  return score;
}

function evaluateForTurn(pos) {
  const e = evaluate(pos);
  return pos.turn === 'w' ? e : -e;
}

/* ------------------------------------------------------------------ *
 * search: negamax + alpha-beta, MVV-LVA ordering, quiescence
 * ------------------------------------------------------------------ */

function moveScore(pos, m) {
  const b = pos.board;
  const mover = typeOf(b[m.from]);
  let score = 0;
  const victim = m.enPassant ? 'P' : b[m.to] ? typeOf(b[m.to]) : null;
  if (victim) score = 10 * PIECE_VALUE[victim] - PIECE_VALUE[mover];
  if (m.promotion) score += PIECE_VALUE[typeOf(m.promotion)] + 500;
  if (m.castle) score += 20;
  return score;
}

function orderMoves(pos, moves) {
  // Captures first (MVV-LVA), quiet moves keep their generation order.
  // No full sort: at most positions there are far fewer captures than moves.
  const caps = [];
  const quiets = [];
  for (let i = 0; i < moves.length; i += 1) {
    const m = moves[i];
    const victim = m.enPassant ? 'P' : pos.board[m.to] ? typeOf(pos.board[m.to]) : null;
    if (victim || m.promotion) {
      caps.push({ m, s: moveScore(pos, m) });
    } else {
      quiets.push(m);
    }
  }
  if (caps.length === 0) return quiets;
  caps.sort((a, b) => b.s - a.s);
  const out = new Array(caps.length + quiets.length);
  for (let i = 0; i < caps.length; i += 1) out[i] = caps[i].m;
  for (let i = 0; i < quiets.length; i += 1) out[caps.length + i] = quiets[i];
  return out;
}

function isCapture(pos, m) {
  return !!m.enPassant || !!pos.board[m.to] || !!m.promotion;
}

/** Legal captures only — quiescence does not care about quiet moves, and
 *  skipping them saves a make/unmake + check test on every one of them. */
function legalCaptures(pos) {
  const work = clonePos(pos);
  const us = pos.turn;
  const out = [];
  const pseudo = pseudoLegalMoves(pos);
  for (let i = 0; i < pseudo.length; i += 1) {
    const m = pseudo[i];
    if (!isCapture(pos, m)) continue;
    const undo = applyMoveInPlace(work, m);
    if (!inCheck(work, us)) out.push(m);
    undoMoveInPlace(work, m, undo);
  }
  return out;
}

/** How many further capture plies quiescence will look at. */
const QUIESCENCE_DEPTH = 4;

function quiesce(pos, alpha, beta, ply, qdepth) {
  const check = inCheck(pos, pos.turn);
  const stand = evaluateForTurn(pos);

  if (!check) {
    if (stand >= beta) return beta;          // the opponent would not allow this
    if (stand > alpha) alpha = stand;
    if (qdepth <= 0) return alpha;
  } else if (qdepth <= -4) {
    return stand;                            // emergency brake in a check chain
  }

  // In check every move is forced, so consider them all (this is what makes
  // mate scores inside quiescence honest); otherwise only captures.
  const candidates = check ? legalMoves(pos) : legalCaptures(pos);
  if (candidates.length === 0) return check ? -(MATE - ply) : alpha;

  const ordered = orderMoves(pos, candidates);
  for (let i = 0; i < ordered.length; i += 1) {
    const m = ordered[i];
    if (!check) {
      // delta pruning: even winning this piece for free would not reach alpha
      const victim = m.enPassant ? 100 : (pos.board[m.to] ? PIECE_VALUE[typeOf(pos.board[m.to])] : 0);
      if (stand + victim + 200 <= alpha) continue;
    }
    const undo = applyMoveInPlace(pos, m);
    const score = -quiesce(pos, -beta, -alpha, ply + 1, qdepth - 1);
    undoMoveInPlace(pos, m, undo);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(pos, depth, alpha, beta, ply, useQuiescence) {
  const moves = legalMoves(pos);
  if (moves.length === 0) {
    return inCheck(pos, pos.turn) ? -(MATE - ply) : 0;
  }
  if (depth <= 0) {
    if (!useQuiescence) return evaluateForTurn(pos);
    return quiesce(pos, alpha, beta, ply, QUIESCENCE_DEPTH);
  }

  const ordered = orderMoves(pos, moves);
  let best = -Infinity;
  for (let i = 0; i < ordered.length; i += 1) {
    const m = ordered[i];
    const undo = applyMoveInPlace(pos, m);
    const score = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, useQuiescence);
    undoMoveInPlace(pos, m, undo);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

/** Tiny deterministic PRNG (mulberry32) so a seeded opponent is repeatable. */
function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Best move for the side to move.
 *   opts.depth       search depth in plies (default 3)
 *   opts.quiescence  extend the search with capture-only lines (default true)
 *   opts.seed        with a seed, one of the equally-best moves is picked at
 *                    random (same seed -> same move); without a seed the first
 *                    best move in the ordered list is returned
 * -> { move, score } with the score in centipawns from WHITE's point of view.
 */
export function findBestMove(pos, opts = {}) {
  const depth = Math.max(0, opts.depth == null ? 3 : opts.depth | 0);
  const useQuiescence = opts.quiescence !== false;
  const seed = opts.seed;

  const work = clonePos(pos);
  const moves = orderMoves(work, legalMoves(work));
  if (moves.length === 0) {
    const mated = inCheck(work, work.turn);
    const s = mated ? -MATE : 0;
    return { move: null, score: work.turn === 'w' ? s : -s };
  }

  const sign = work.turn === 'w' ? 1 : -1;

  // Alpha-beta over the root moves: this finds the best move, and the first
  // move in the ordered list that reaches the best score (so an unseeded call
  // is fully deterministic).
  let alpha = -Infinity;
  let bestScore = -Infinity;
  let bestMove = moves[0];
  for (let i = 0; i < moves.length; i += 1) {
    const m = moves[i];
    const undo = applyMoveInPlace(work, m);
    const score = depth <= 0
      ? evaluateForTurn(work)
      : -negamax(work, depth - 1, -Infinity, -alpha, 1, useQuiescence);
    undoMoveInPlace(work, m, undo);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
      alpha = score;
    }
  }

  // Seeded play: find every move that is just as good, then pick one at
  // random. A null window (best-1 .. best) only asks "is this move >= best?",
  // which is far cheaper than re-searching all of them with a full window.
  if (seed != null) {
    const work2 = clonePos(pos);
    const ties = [bestMove];
    for (let i = 0; i < moves.length; i += 1) {
      const m = moves[i];
      if (m === bestMove) continue;
      const undo = applyMoveInPlace(work2, m);
      let tied;
      if (depth <= 0) {
        tied = evaluateForTurn(work2) === bestScore;
      } else {
        // the window (best-1, best) fails low exactly when the move is >= best
        tied = negamax(work2, depth - 1, -bestScore, -(bestScore - 1), 1, useQuiescence) <= -bestScore;
      }
      undoMoveInPlace(work2, m, undo);
      if (tied) ties.push(m);
    }
    if (ties.length > 1) {
      const rand = mulberry32(seed);
      return { move: ties[Math.floor(rand() * ties.length)], score: bestScore * sign };
    }
  }

  return { move: bestMove, score: bestScore * sign };
}

/**
 * Centipawns from WHITE's point of view after a real search of `pos`.
 * Used to grade a learner's move: compare the value before and after.
 */
export function searchEval(pos, opts = {}) {
  const depth = Math.max(0, opts.depth == null ? 3 : opts.depth | 0);
  return findBestMove(pos, { depth, quiescence: opts.quiescence !== false }).score;
}

/* ------------------------------------------------------------------ *
 * standard algebraic notation
 * ------------------------------------------------------------------ */

function sanDisambiguation(pos, move, piece) {
  const b = pos.board;
  const color = colorOf(piece);
  const type = typeOf(piece);
  const rivals = legalMoves(pos).filter(
    (m) => m.from !== move.from && m.to === move.to &&
      typeOf(b[m.from]) === type && colorOf(b[m.from]) === color,
  );
  if (rivals.length === 0) return '';
  const sameFile = rivals.some((m) => (m.from & 7) === (move.from & 7));
  const sameRank = rivals.some((m) => (m.from >> 3) === (move.from >> 3));
  if (!sameFile) return squareName(move.from)[0];
  if (!sameRank) return squareName(move.from)[1];
  return squareName(move.from);
}

/** Standard algebraic notation for `move` played in `pos` (may be illegal input: no validation). */
export function san(pos, move) {
  const b = pos.board;
  const piece = b[move.from];
  const type = typeOf(piece);
  const color = colorOf(piece);
  const isCastle = move.castle ||
    (type === 'K' && (move.to >> 3) === (move.from >> 3) && Math.abs((move.to & 7) - (move.from & 7)) === 2);
  const promo = move.promotion
    ? String(move.promotion).toLowerCase()
    : (type === 'P' && (move.to >> 3) === (color === 'w' ? 7 : 0) ? 'q' : null);

  let text = '';
  if (isCastle) {
    text = move.to > move.from ? 'O-O' : 'O-O-O';
  } else {
    const capture = !!b[move.to] || (type === 'P' && (move.to & 7) !== (move.from & 7));
    if (type === 'P') {
      if (capture) text += squareName(move.from)[0] + 'x';
    } else {
      text += type;
      text += sanDisambiguation(pos, move, piece);
      if (capture) text += 'x';
    }
    text += squareName(move.to);
    if (promo) text += '=' + promo.toUpperCase();
  }

  const after = makeMove(pos, move);
  if (inCheck(after, after.turn)) text += legalMoves(after).length === 0 ? '#' : '+';
  return text;
}

/* ------------------------------------------------------------------ *
 * a couple of conveniences for the interface
 * ------------------------------------------------------------------ */

export function pieceAt(pos, sq) {
  const pc = pos.board[sq];
  if (!pc) return null;
  return { color: colorOf(pc), type: typeOf(pc) };
}

export function gameStatus(pos) {
  if (isCheckmate(pos)) return 'checkmate';
  if (isStalemate(pos)) return 'stalemate';
  if (isInsufficientMaterial(pos)) return 'insufficient-material';
  if ((pos.halfmove | 0) >= 100) return 'fifty-move';
  if (inCheck(pos, pos.turn)) return 'check';
  return 'play';
}
