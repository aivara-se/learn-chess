/* Correctness tests for js/engine.js — run with `bun test`.
 *
 * The proof that move generation is right is perft: walk the legal move tree
 * to a fixed depth with the public legalMoves/makeMove API and count the
 * leaves. The expected numbers are the standard ones from the chess
 * programming wiki suite.
 */
import { describe, expect, test } from 'bun:test';
import {
  START_FEN,
  MATE,
  parseFen,
  toFen,
  legalMoves,
  makeMove,
  isCheckmate,
  isStalemate,
  isInsufficientMaterial,
  inCheck,
  san,
  findBestMove,
  evaluate,
  searchEval,
  isDraw,
  squareName,
  parseSquare,
} from '../js/engine.js';

/* perft, written here on top of the public API */
function perftFrom(pos: any, depth: number): number {
  const moves = legalMoves(pos);
  if (depth <= 1) return moves.length;
  let nodes = 0;
  for (const m of moves) nodes += perftFrom(makeMove(pos, m), depth - 1);
  return nodes;
}
function perft(fen: string, depth: number): number {
  return perftFrom(parseFen(fen), depth);
}

const has = (moves: any[], from: number, to: number, promo?: string) =>
  moves.some((m) => m.from === from && m.to === to && (promo === undefined || m.promotion === promo));

describe('squares and FEN', () => {
  test('square indexes are a1=0 ... h8=63', () => {
    expect(parseSquare('a1')).toBe(0);
    expect(parseSquare('h1')).toBe(7);
    expect(parseSquare('a8')).toBe(56);
    expect(parseSquare('h8')).toBe(63);
    expect(parseSquare('e4')).toBe(28);
    expect(squareName(28)).toBe('e4');
    expect(squareName(63)).toBe('h8');
  });

  test('START_FEN is the standard opening position', () => {
    expect(START_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  test('parseFen reads every field', () => {
    const pos = parseFen('r3k2r/8/8/8/8/8/8/R3K2R b Kq c6 7 42');
    expect(pos.board[parseSquare('a8')]).toBe('r');
    expect(pos.board[parseSquare('e8')]).toBe('k');
    expect(pos.board[parseSquare('a1')]).toBe('R');
    expect(pos.board[parseSquare('e1')]).toBe('K');
    expect(pos.board[parseSquare('e4')]).toBe(null);
    expect(pos.turn).toBe('b');
    expect(pos.castling).toEqual({ K: true, Q: false, k: false, q: true });
    expect(pos.ep).toBe(parseSquare('c6'));
    expect(pos.halfmove).toBe(7);
    expect(pos.fullmove).toBe(42);
  });

  test('a broken FEN throws instead of quietly becoming an empty board', () => {
    const broken: string[] = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1',          // seven ranks
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPP/RNBQKBNR w KQkq - 0 1',  // short rank
      'rnbqkbnx/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // no such piece
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1', // bad side to move
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkX - 0 1', // bad castling field
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq z9 0 1', // bad ep square
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - x 1', // bad halfmove clock
    ];
    for (const fen of broken) expect(() => parseFen(fen)).toThrow();
    // ... while the four-field form is still accepted and defaults the clocks
    const short = parseFen('8/8/8/4k3/8/8/8/4K3 w - -');
    expect(short.halfmove).toBe(0);
    expect(short.fullmove).toBe(1);
  });

  test('toFen(parseFen(fen)) round-trips', () => {
    for (const fen of [
      START_FEN,
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 1',
      '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
      '8/P7/8/8/8/8/8/K6k w - - 0 1',
      '7k/8/8/KPp4r/8/8/8/8 w - c6 0 1',
    ]) {
      expect(toFen(parseFen(fen))).toBe(fen);
    }
  });
});

describe('perft — start position', () => {
  test('perft(1) = 20', () => expect(perft(START_FEN, 1)).toBe(20));
  test('perft(2) = 400', () => expect(perft(START_FEN, 2)).toBe(400));
  test('perft(3) = 8902', () => expect(perft(START_FEN, 3)).toBe(8902));
  test('perft(4) = 197281', () => expect(perft(START_FEN, 4)).toBe(197281));
});

describe('perft — Kiwipete', () => {
  const KIWI = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
  test('perft(1) = 48', () => expect(perft(KIWI, 1)).toBe(48));
  test('perft(2) = 2039', () => expect(perft(KIWI, 2)).toBe(2039));
  test('perft(3) = 97862', () => expect(perft(KIWI, 3)).toBe(97862));
});

describe('perft — position 3 and the en-passant position', () => {
  test('position 3 perft(1) = 46', () => {
    expect(perft('r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 1', 1)).toBe(46);
  });
  test('position 3 perft(2) = 2079', () => {
    expect(perft('r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 1', 2)).toBe(2079);
  });
  test('en-passant position perft(4) = 43238', () => {
    expect(perft('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4)).toBe(43238);
  });
});

describe('promotion', () => {
  const FEN = '8/P7/8/8/8/8/8/K6k w - - 0 1';

  test('the a7 pawn offers exactly four promotions', () => {
    const moves = legalMoves(parseFen(FEN));
    const promos = moves.filter((m) => m.from === parseSquare('a7'));
    expect(promos.length).toBe(4);
    expect(promos.map((m) => m.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);
    expect(promos.every((m) => m.to === parseSquare('a8'))).toBe(true);
  });

  test('makeMove without a promotion promotes to a queen', () => {
    const pos = parseFen(FEN);
    const after = makeMove(pos, { from: parseSquare('a7'), to: parseSquare('a8') });
    expect(after.board[parseSquare('a8')]).toBe('Q');
  });

  test('makeMove honours the requested promotion, and does not mutate the input', () => {
    const pos = parseFen(FEN);
    const after = makeMove(pos, { from: parseSquare('a7'), to: parseSquare('a8'), promotion: 'n' });
    expect(after.board[parseSquare('a8')]).toBe('N');
    expect(pos.board[parseSquare('a7')]).toBe('P');
    expect(toFen(pos)).toBe(FEN);
  });

  test('a promotion that gives check is written with =Q and +', () => {
    const pos = parseFen('8/6P1/8/8/8/8/8/K5k1 w - - 0 1');
    const move = { from: parseSquare('g7'), to: parseSquare('g8'), promotion: 'q' };
    expect(san(pos, move)).toBe('g8=Q+');
  });
});

describe('en passant', () => {
  test('an ordinary en passant capture is generated and removes the right pawn', () => {
    // black has just played d7-d5
    const pos = parseFen('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1');
    const moves = legalMoves(pos);
    const ep = moves.filter((m) => m.enPassant);
    expect(ep.length).toBe(1);
    expect(ep[0].from).toBe(parseSquare('e5'));
    expect(ep[0].to).toBe(parseSquare('d6'));

    const after = makeMove(pos, ep[0]);
    expect(after.board[parseSquare('d6')]).toBe('P');
    expect(after.board[parseSquare('d5')]).toBe(null);
    expect(after.board[parseSquare('e5')]).toBe(null);
  });

  test('the classic rank pin: the pinned pawn cannot step aside', () => {
    // black king a4, black pawn c4, white rook h4 — c4-c3 would expose the king
    const pos = parseFen('8/8/8/8/k1p4R/8/3P4/3K4 b - - 0 1');
    const moves = legalMoves(pos);
    expect(has(moves, parseSquare('c4'), parseSquare('c3'))).toBe(false);
    expect(moves.every((m) => m.from !== parseSquare('c4'))).toBe(true);
    // the king may still move away
    expect(has(moves, parseSquare('a4'), parseSquare('a5'))).toBe(true);
    expect(moves.length).toBe(5);
  });

  test('en passant that would expose the white king on the rank is illegal', () => {
    // white king a5, white pawn b5, black pawn c5 (just double-pushed), black rook h5:
    // bxc6 e.p. would clear the fifth rank and leave the white king in check.
    const pos = parseFen('7k/8/8/KPp4r/8/8/8/8 w - c6 0 1');
    const moves = legalMoves(pos);
    expect(moves.some((m) => m.enPassant)).toBe(false);
    expect(moves.some((m) => m.to === parseSquare('c6'))).toBe(false);
    expect(has(moves, parseSquare('b5'), parseSquare('b6'))).toBe(true); // pushing keeps the block
    expect(moves.some((m) => m.to === parseSquare('c5'))).toBe(false);
    expect(moves.length).toBe(4); // Ka6, Kb6, Ka4 and the pawn push
  });

  test('an unpinned pawn in the same shape takes en passant happily', () => {
    // same position without the rook: the capture is back on
    const pos = parseFen('7k/8/8/KPp5/8/8/8/8 w - c6 0 1');
    const moves = legalMoves(pos);
    expect(moves.some((m) => m.enPassant)).toBe(true);
    expect(has(moves, parseSquare('b5'), parseSquare('c6'))).toBe(true);
  });

  test('en passant is offered in SAN as an ordinary capture', () => {
    const pos = parseFen('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1');
    const ep = legalMoves(pos).find((m) => m.enPassant)!;
    expect(san(pos, ep)).toBe('exd6');
  });
});

describe('castling', () => {
  const FREE = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

  test('both castlings are available when nothing attacks the path', () => {
    const moves = legalMoves(parseFen(FREE));
    expect(has(moves, parseSquare('e1'), parseSquare('g1'))).toBe(true);
    expect(has(moves, parseSquare('e1'), parseSquare('c1'))).toBe(true);
  });

  test('O-O is illegal when the king would pass through an attacked square', () => {
    // black rook on f8 covers f1, so e1->g1 crosses an attacked square
    const pos = parseFen('r4rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    const moves = legalMoves(pos);
    expect(has(moves, parseSquare('e1'), parseSquare('g1'))).toBe(false);
    expect(has(moves, parseSquare('e1'), parseSquare('c1'))).toBe(true); // queenside is still fine
  });

  test('castling is refused when a piece is in the way or the rook is gone', () => {
    const moves = legalMoves(parseFen('r3k2r/8/8/8/8/8/8/RN2K1NR w KQkq - 0 1'));
    expect(moves.some((m) => m.castle)).toBe(false);
  });

  test('makeMove moves the rook as well and clears the rights', () => {
    const pos = parseFen(FREE);
    const after = makeMove(pos, { from: parseSquare('e1'), to: parseSquare('g1') });
    expect(after.board[parseSquare('g1')]).toBe('K');
    expect(after.board[parseSquare('f1')]).toBe('R');
    expect(after.board[parseSquare('h1')]).toBe(null);
    expect(after.castling.K).toBe(false);
    expect(after.castling.Q).toBe(false);
    expect(after.castling.k).toBe(true);
    expect(toFen(after)).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
  });

  test('castling is written O-O / O-O-O', () => {
    const pos = parseFen(FREE);
    expect(san(pos, { from: parseSquare('e1'), to: parseSquare('g1') })).toBe('O-O');
    expect(san(pos, { from: parseSquare('e1'), to: parseSquare('c1') })).toBe('O-O-O');
  });
});

describe('legality filter', () => {
  test('legalMoves never leaves the mover in check', () => {
    // black rook on e2 checks the king; only Kxe2, Kd1 and Kf1 get out
    const pos = parseFen('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
    expect(inCheck(pos, 'w')).toBe(true);
    const moves = legalMoves(pos);
    for (const m of moves) expect(inCheck(makeMove(pos, m), 'w')).toBe(false);
    expect(moves.map((m) => san(pos, m)).sort()).toEqual(['Kd1', 'Kf1', 'Kxe2']);
  });

  test('a pinned knight cannot move at all', () => {
    const pos = parseFen('k7/8/8/4r3/8/8/4N3/4K3 w - - 0 1');
    const knightMoves = legalMoves(pos).filter((m) => m.from === parseSquare('e2'));
    expect(knightMoves.length).toBe(0);
    // ... and the king is not actually in check, so it has moves of its own
    expect(inCheck(pos, 'w')).toBe(false);
    expect(legalMoves(pos).map((m) => san(pos, m)).sort()).toEqual(['Kd1', 'Kd2', 'Kf1', 'Kf2']);
  });

  test('a king cannot walk into an attacked square', () => {
    const pos = parseFen('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
    const kingMoves = legalMoves(pos).filter((m) => m.from === parseSquare('e1'));
    // d2, e2 and f2 are covered by the black king on e3
    expect(kingMoves.length).toBe(2);
    expect(kingMoves.map((m) => san(pos, m)).sort()).toEqual(['Kd1', 'Kf1']);
  });

  test('a king cannot step onto a square a mere pawn attacks', () => {
    const pos = parseFen('4k3/8/8/8/8/4p3/8/4K3 w - - 0 1');
    // the e3 pawn covers d2 and f2, so only d1, e2 and f1 are safe
    expect(legalMoves(pos).map((m) => san(pos, m)).sort()).toEqual(['Kd1', 'Ke2', 'Kf1']);
  });
});

describe('checkmate and stalemate', () => {
  test('back-rank mate is detected', () => {
    const pos = parseFen('R5k1/5ppp/8/8/8/8/8/7K b - - 1 1');
    expect(inCheck(pos, 'b')).toBe(true);
    expect(legalMoves(pos).length).toBe(0);
    expect(isCheckmate(pos)).toBe(true);
    expect(isStalemate(pos)).toBe(false);
  });

  test('the start position is neither', () => {
    const pos = parseFen(START_FEN);
    expect(isCheckmate(pos)).toBe(false);
    expect(isStalemate(pos)).toBe(false);
  });

  test('a stalemate has no legal move and no check', () => {
    const pos = parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(inCheck(pos, 'b')).toBe(false);
    expect(legalMoves(pos).length).toBe(0);
    expect(isStalemate(pos)).toBe(true);
    expect(isCheckmate(pos)).toBe(false);
  });
});

describe('insufficient material and draws', () => {
  test('bare kings', () => {
    expect(isInsufficientMaterial(parseFen('8/8/8/4k3/8/8/8/4K3 w - - 0 1'))).toBe(true);
  });
  test('king and bishop against king', () => {
    expect(isInsufficientMaterial(parseFen('8/8/8/4k3/8/8/8/2B1K3 w - - 0 1'))).toBe(true);
  });
  test('king and knight against king', () => {
    expect(isInsufficientMaterial(parseFen('8/8/8/4k3/8/8/8/2N1K3 w - - 0 1'))).toBe(true);
  });
  test('same-coloured bishops are a dead draw, opposite ones are not', () => {
    expect(isInsufficientMaterial(parseFen('5b2/8/8/4k3/8/8/8/2B1K3 w - - 0 1'))).toBe(true);
    expect(isInsufficientMaterial(parseFen('2b5/8/8/4k3/8/8/8/2B1K3 w - - 0 1'))).toBe(false);
  });
  test('any pawn, rook or queen means there is still a game', () => {
    expect(isInsufficientMaterial(parseFen(START_FEN))).toBe(false);
    expect(isInsufficientMaterial(parseFen('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1'))).toBe(false);
    expect(isInsufficientMaterial(parseFen('8/8/8/4k3/8/8/8/4KR2 w - - 0 1'))).toBe(false);
  });
  test('the 50-move rule fires at 100 half-moves', () => {
    expect(isDraw(parseFen('8/8/8/4k3/8/8/4R3/4K3 w - - 99 60'))).toBe(false);
    expect(isDraw(parseFen('8/8/8/4k3/8/8/4R3/4K3 w - - 100 60'))).toBe(true);
  });
  test('threefold repetition needs three sightings', () => {
    const fen = '8/8/8/4k3/8/8/4R3/4K3 w - - 4 40';
    const other = '8/8/8/4k3/8/8/4R3/4K3 b - - 5 40';
    expect(isDraw(parseFen(fen), [fen])).toBe(false);
    expect(isDraw(parseFen(fen), [fen, other, fen])).toBe(true);
  });
  test('insufficient material is a draw too', () => {
    expect(isDraw(parseFen('8/8/8/4k3/8/8/8/2B1K3 w - - 3 20'))).toBe(true);
  });
});

describe('san', () => {
  test('the opening pawn moves are plain', () => {
    const pos = parseFen(START_FEN);
    const e4 = legalMoves(pos).find((m) => m.from === parseSquare('e2') && m.to === parseSquare('e4'))!;
    expect(san(pos, e4)).toBe('e4');
    const nf3 = legalMoves(pos).find((m) => m.from === parseSquare('g1') && m.to === parseSquare('f3'))!;
    expect(san(pos, nf3)).toBe('Nf3');
  });

  test('two knights reaching the same square get file disambiguation', () => {
    const pos = parseFen('k7/8/8/8/8/2N5/8/4K1N1 w - - 0 1');
    const fromC3 = legalMoves(pos).find((m) => m.from === parseSquare('c3') && m.to === parseSquare('e2'))!;
    const fromG1 = legalMoves(pos).find((m) => m.from === parseSquare('g1') && m.to === parseSquare('e2'))!;
    expect(san(pos, fromC3)).toBe('Nce2');
    expect(san(pos, fromG1)).toBe('Nge2');
  });

  test('two rooks on one file get rank disambiguation', () => {
    const pos = parseFen('k7/8/8/1R6/8/8/8/1R2K3 w - - 0 1');
    const fromB1 = legalMoves(pos).find((m) => m.from === parseSquare('b1') && m.to === parseSquare('b3'))!;
    const fromB5 = legalMoves(pos).find((m) => m.from === parseSquare('b5') && m.to === parseSquare('b3'))!;
    expect(san(pos, fromB1)).toBe('R1b3');
    expect(san(pos, fromB5)).toBe('R5b3');
  });

  test('captures, checks and mates carry their marks', () => {
    const pos = parseFen('rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3');
    const capture = legalMoves(pos).find((m) => m.from === parseSquare('c4') && m.to === parseSquare('f7'))!;
    expect(san(pos, capture)).toBe('Bxf7+');
  });

  test('every legal move in a busy position produces parseable SAN', () => {
    const pos = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    const seen = new Set<string>();
    for (const m of legalMoves(pos)) {
      const notation = san(pos, m);
      expect(notation.length).toBeGreaterThan(0);
      expect(/^(O-O(-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?)[+#]?$/.test(notation)).toBe(true);
      seen.add(notation);
    }
    expect(seen.size).toBe(legalMoves(pos).length); // no two moves share a SAN
    expect(seen.has('O-O')).toBe(true);
  });
});

describe('evaluate', () => {
  test('the start position is balanced', () => {
    expect(evaluate(parseFen(START_FEN))).toBe(0);
  });
  test('a white queen up is worth roughly a queen', () => {
    const up = evaluate(parseFen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1'));
    expect(up).toBeGreaterThan(700);
    expect(up).toBeLessThan(1100);
  });
  test('evaluation is antisymmetric in colour', () => {
    const w = evaluate(parseFen('4k3/8/8/3q4/8/8/8/4K3 w - - 0 1'));
    const b = evaluate(parseFen('4k3/8/8/8/8/3Q4/8/4K3 b - - 0 1'));
    expect(w).toBe(-b);
  });
});

describe('random play invariants', () => {
  // Plays whole games with random legal moves and checks the invariants that a
  // perft count cannot see: FEN round-trips, exactly one king per side, no
  // legal move ever leaves the mover in check, and every move changes the FEN.
  test('random games keep every invariant', () => {
    let state = 20260924;
    const rand = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
    let finished = 0;
    for (let game = 0; game < 3; game += 1) {
      let pos = parseFen(START_FEN);
      for (let ply = 0; ply < 180; ply += 1) {
        const fen = toFen(pos);
        expect(toFen(parseFen(fen))).toBe(fen);

        const moves = legalMoves(pos);
        if (moves.length === 0) {
          // game over: it must be a mate or a stalemate, and nothing else
          expect(isCheckmate(pos) || isStalemate(pos)).toBe(true);
          finished += 1;
          break;
        }
        for (const m of moves) {
          const next = makeMove(pos, m);
          expect(inCheck(next, pos.turn)).toBe(false); // never self-check
          expect(next.board.filter((p) => p === 'K').length).toBe(1);
          expect(next.board.filter((p) => p === 'k').length).toBe(1);
        }

        const pick = moves[Math.floor(rand() * moves.length)];
        expect(san(pos, pick).length).toBeGreaterThan(0);
        const next = makeMove(pos, pick);
        expect(toFen(next)).not.toBe(fen);
        expect(moves.length).toBe(legalMoves(pos).length); // stable, no hidden state
        pos = next;
        if (isDraw(pos, [])) break;
      }
    }
    expect(finished).toBeGreaterThanOrEqual(0);
  });

  test('a random game never mutates the position it is given', () => {
    let state = 7;
    const rand = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
    const start = parseFen(START_FEN);
    const snapshot = toFen(start);
    let pos = start;
    for (let ply = 0; ply < 60; ply += 1) {
      const moves = legalMoves(pos);
      if (!moves.length) break;
      pos = makeMove(pos, moves[Math.floor(rand() * moves.length)]);
    }
    expect(toFen(start)).toBe(snapshot); // the very first position is untouched
  });
});

describe('search', () => {
  test('findBestMove finds a mate in one', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    const pos = parseFen(fen);
    const { move, score } = findBestMove(pos, { depth: 3, seed: 12345 });
    expect(move).toBeTruthy();
    expect(san(pos, move)).toBe('Ra8#');
    expect(score).toBeGreaterThan(MATE - 100);
  });

  test('a second mate in one is also found', () => {
    const fen = '3k4/3Q4/3K4/8/8/8/8/8 w - - 0 1';
    const pos = parseFen(fen);
    const best = findBestMove(pos, { depth: 3, seed: 11 });
    expect(best.move).toBeTruthy();
    expect(san(pos, best.move).endsWith('#')).toBe(true);
    expect(best.score).toBeGreaterThan(MATE - 100);
  });

  test('it takes a free queen that is hanging', () => {
    const fen = '4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1';
    const pos = parseFen(fen);
    const { move } = findBestMove(pos, { depth: 3, seed: 7 });
    expect(move.from).toBe(parseSquare('d1'));
    expect(move.to).toBe(parseSquare('d5'));
  });

  test('it does not walk into a mate when a defence exists', () => {
    // 1.f3 e5 2.g4?? and black has mate in one: the engine must see Qh4#
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2';
    const pos = parseFen(fen);
    const { move, score } = findBestMove(pos, { depth: 3, seed: 99 });
    expect(san(pos, move)).toBe('Qh4#');
    expect(score).toBeLessThan(-(MATE - 100)); // white is the one getting mated
  });

  test('an already-mated position returns no move', () => {
    const res = findBestMove(parseFen('R5k1/5ppp/8/8/8/8/8/7K b - - 1 1'), { depth: 3 });
    expect(res.move).toBe(null);
    expect(res.score).toBe(MATE); // white's point of view: black is mated
  });

  test('the same seed always picks the same move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const a = findBestMove(parseFen(fen), { depth: 3, seed: 42 });
    const b = findBestMove(parseFen(fen), { depth: 3, seed: 42 });
    expect(san(parseFen(fen), a.move)).toBe(san(parseFen(fen), b.move));
    expect(a.score).toBe(b.score);
  });

  test('without a seed the choice is deterministic too', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const a = findBestMove(parseFen(fen), { depth: 3 });
    const b = findBestMove(parseFen(fen), { depth: 3 });
    expect(a.move.from).toBe(b.move.from);
    expect(a.move.to).toBe(b.move.to);
  });

  test('a seeded opponent varies its openings', () => {
    const fen = START_FEN;
    const picked = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const { move } = findBestMove(parseFen(fen), { depth: 3, seed });
      picked.add(san(parseFen(fen), move));
    }
    expect(picked.size).toBeGreaterThan(1);
  });

  test('every seeded pick really is an equally-best move', () => {
    // Re-derive the value of a chosen move from the opponent's side (one ply
    // shallower): for an optimal move it must equal the reported best score.
    // A tie-breaking mistake would show up here as a lower number.
    const cases: Array<[string, number]> = [
      [START_FEN, 2],
      [START_FEN, 3],
      ['r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4', 2],
      ['4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', 2],
      ['4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', 3],
      ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 2],
    ];
    for (const [fen, depth] of cases) {
      const pos = parseFen(fen);
      const best = findBestMove(pos, { depth }).score;
      for (const seed of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]) {
        const res = findBestMove(pos, { depth, seed });
        expect(res.score).toBe(best);
        expect(res.move).not.toBe(null);
        expect(
          legalMoves(pos).some(
            (m) => m.from === res.move.from && m.to === res.move.to && (m.promotion || null) === (res.move.promotion || null),
          ),
        ).toBe(true);
        expect(searchEval(makeMove(pos, res.move), { depth: depth - 1 })).toBe(best);
      }
    }
  });

  test('searchEval grades a learner move from white\'s point of view', () => {
    const pos = parseFen('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1');
    const before = searchEval(pos, { depth: 3 });
    expect(before).toBeGreaterThan(500); // white can simply take the black queen
    const best = findBestMove(pos, { depth: 3 });
    expect(san(pos, best.move)).toBe('Qxd5');

    // the learner walks the king instead: the queen drops off and the score collapses
    const quiet = legalMoves(pos).find((m) => m.from === parseSquare('e1') && m.to === parseSquare('f1'))!;
    const after = searchEval(makeMove(pos, quiet), { depth: 3 });
    expect(after).toBeLessThan(before - 1000);
    expect(after).toBeLessThan(-500);
  });

  test('searchEval keeps both sides of a position honest', () => {
    const whiteUp = searchEval(parseFen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1'), { depth: 3 });
    const blackUp = searchEval(parseFen('3qk3/8/8/8/8/8/8/4K3 w - - 0 1'), { depth: 3 });
    expect(whiteUp).toBeGreaterThan(500);
    expect(blackUp).toBeLessThan(-500);
  });

  test('depth 3 with quiescence is fast', () => {
    const pos = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    const start = Date.now();
    findBestMove(pos, { depth: 3, seed: 1 });
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
