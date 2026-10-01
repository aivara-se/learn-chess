/* Learn chess — the course.
 *
 * Eight lessons for someone who has never played, three to five drills each, in
 * order: the board and the pieces, what material is worth, pawns in the centre,
 * bringing the pieces out, castling, looking before you move, the Italian opening
 * as a model, and the shapes a mate in one takes — and then one boss stop closes
 * the path, a whole game against Pip that is finished by checkmating him.
 *
 * **The path is a chain, not a graph with branches.** It forked four times while
 * the map drew a depth that held two lessons as branches above and below the road;
 * the operator's map has one line of stops, so every lesson now names the lesson
 * before it and nothing else. Two lessons went rather than fork it again — the
 * early queen, which is a special case of bringing the pieces out, and finishing a
 * won game with the queen, which is the mate `mate-in-one` already teaches more of.
 * Their drills went with them, except the one that gives check without mating:
 * `look-first` carries that one now, because the coach's "Check! ..." line is
 * written for it. `scripts/verify-site.ts` fails a course that puts two lessons at
 * one depth, so a fork cannot come back quietly.
 * Three of those lessons also carry a **pack**: three optional puzzles on the same
 * idea, hung beside the lesson that teaches it and required by nothing — the
 * `PACKS` array at the end of this file, and the only other thing in here that is
 * content.
 *
 * A lesson is data: { id, title, goal, body[], diagram, diagramCaption, drills[],
 * requires[] }. A **boss stop** is that shape without the drills, plus
 * `boss: { level }` — the strength of Pip the game is won at. `requires` is the
 * lesson that has to be finished first, and it is the whole of the map — one line,
 * ten stops deep, with a boss at the end:
 *
 *   1 board-and-pieces ── 2 piece-values ── 3 centre-pawns ── 4 develop
 *     ── 5 castle-early ── 6 look-first ── 7 italian ── 8 mate-in-one
 *     ── 9 boss: beat Pip ── 10 boss: the last game
 *
 * so material comes before developing, the habits come before looking for loose
 * pieces, the Italian comes before the ladder of mates in one, and the path is
 * closed by a game rather than another puzzle. The three packs hang beside the
 * lessons that teach them and sit on no line at all. The map is drawn from this
 * and nothing else; `scripts/verify-site.ts` fails a `requires` that names no
 * lesson, a cycle, a lesson no path can reach, or a depth that holds two.
 * A drill is a position, the task in the learner's words, and the moves that
 * count as an answer:
 *   fen       the position, side to move taken from the FEN
 *   prompt    what to do
 *   hint      the idea, without the move
 *   why       the concrete fact about this position, shown after a correct move
 *   best      the engine's top move, in UCI ("e2e4", "e1g1" for castling)
 *   accepted  the moves that count as an answer. Usually every move within 30
 *             centipawns of `best` from the same search; narrowed to a single
 *             move when the drill asks for one idea and the position is level,
 *             so that a waiting move cannot be mistaken for the lesson.
 *   note      only when `accepted` is deliberately not the margin-derived set:
 *             one line saying why, so the exception is in the record instead of
 *             in someone's memory. `scripts/verify-drills.ts` reports it.
 *
 * Every best/accepted pair was measured with Stockfish 17 at
 * /usr/games/stockfish (MultiPV=6, depth 18, one thread, hash 16, one fresh
 * engine per position). The record of that run is docs/DRILLS.md, written by
 * scripts/verify-drills.ts and re-runnable by anyone: `bun run
 * scripts/verify-drills.ts --write`. If a position changes, measure again — an
 * accepted list that rejects a good move teaches the wrong thing.
 */

export const LESSONS = [
  {
    id: 'board-and-pieces',
    requires: [],
    title: 'The board and the pieces',
    goal: 'Learn the squares and how every piece moves.',
    body: [
      'A chessboard has 64 squares, eight rows called ranks and eight columns called files. Set it up with a light square in each player\'s right-hand corner.',
      'Every square has a name: first its file letter, then its rank number. The pawn in front of the king starts on e2, and the four middle squares are d4, e4, d5 and e5.',
      'Every game starts with the same 32 pieces. Each side has eight pawns, two rooks, two knights, two bishops, a queen and a king.',
      'A rook slides in a straight line and a bishop slides along a diagonal. A queen does both, a knight jumps in an L, and a king steps one square.',
      'A pawn moves straight ahead and captures one square diagonally. At the far end of the board it becomes a queen.',
    ],
    diagram: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    diagramCaption: 'The starting position, with the file letters along the bottom and the rank numbers up the side.',
    drills: [
      {
        fen: '4k3/8/4p3/8/3N4/8/8/4K3 w - - 0 1',
        prompt: 'Take the black pawn on e6 with your knight.',
        hint: 'e6 is on the e-file, six squares up from the bottom',
        why: 'Your knight jumps from d4 to e6 and takes the pawn. A square is named by its file letter first, then its rank number.',
        best: 'd4e6',
        accepted: ['d4e6'],
      },
      {
        fen: '4k3/p7/8/3n4/4P3/8/7P/4K2R w - - 0 1',
        prompt: 'A black knight has stepped in front of your pawn. Take it.',
        hint: 'a pawn captures diagonally, never straight ahead',
        why: 'Your pawn on e4 takes the knight on d5 by stepping one square diagonally. That is the only way a pawn captures.',
        best: 'e4d5',
        accepted: ['e4d5'],
      },
      {
        fen: '4k3/p7/8/8/3n4/5N2/4P2P/4K2R w - - 0 1',
        prompt: 'The black knight on d4 is attacking your knight. Take it.',
        hint: 'the knight jumps in an L and over anything in the way',
        why: 'Your knight takes the black knight on d4, and nothing defends it. A knight moves two squares up and one across.',
        best: 'f3d4',
        accepted: ['f3d4'],
      },
      {
        fen: '4k3/p7/8/3p4/2B5/7P/8/4K3 w - - 0 1',
        prompt: 'Your bishop can reach the black pawn on d5. Take it.',
        hint: 'the bishop travels along diagonals only',
        why: 'The bishop takes the pawn on d5 along the diagonal from c4. The pawn on a7 is safe, because your bishop stays on light squares all game.',
        best: 'c4d5',
        accepted: ['c4d5'],
      },
    ],
  },

  {
    id: 'piece-values',
    requires: ['board-and-pieces'],
    title: 'What the pieces are worth',
    goal: 'Know what each piece is worth, and count first.',
    body: [
      'Players count the pieces in pawns. A pawn is 1, a knight is 3, a bishop is 3, a rook is 5 and a queen is 9.',
      'The king is never counted, because you cannot capture it. Swapping a knight for a rook wins you two pawns.',
      'Before every capture, ask what you are taking and what defends it. A piece with a defender is not free.',
    ],
    diagram: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    diagramCaption: 'Both sides still have every piece, so nobody is ahead yet.',
    drills: [
      {
        fen: '4k3/p7/8/1r1p4/8/2N5/7P/2R1K3 w - - 0 1',
        prompt: 'Your knight can take a rook or a pawn. Take the one worth more.',
        hint: 'a rook is worth five pawns and a pawn only one',
        why: 'The rook on b5 is worth five pawns and nothing defends it. The pawn on d5 is worth one, so take the rook.',
        best: 'c3b5',
        accepted: ['c3b5'],
      },
      {
        fen: '4k3/1r6/8/8/3n4/2P5/7P/5RK1 w - - 0 1',
        prompt: 'A black knight sits on d4 with no defender. Take it back.',
        hint: 'a knight for a pawn is a good trade, so take back',
        why: 'Your pawn on c3 takes the knight on d4, and nothing defends it. You give a pawn worth one and win a knight worth three.',
        best: 'c3d4',
        accepted: ['c3d4'],
      },
      {
        fen: 'r3k3/p7/8/4n3/3p4/5N2/7P/4K2R w - - 0 1',
        prompt: 'Both black pieces are in reach. Take the one worth more.',
        hint: 'three pawns beat one, so look for the knight',
        why: 'The knight on e5 is worth three pawns and the pawn on d4 only one. Nothing defends either one, so take the knight.',
        best: 'f3e5',
        accepted: ['f3e5'],
      },
    ],
  },

  {
    id: 'centre-pawns',
    requires: ['piece-values'],
    title: 'Put a pawn in the centre',
    goal: 'Take the middle of the board with a pawn.',
    body: [
      'The four squares in the middle are d4, e4, d5 and e5. A piece there reaches more squares than a piece on the edge.',
      'That is why most games start with a pawn to e4 or d4. The pawn then attacks the two squares diagonally in front of it.',
      'If an enemy piece stands on one of those squares, it has to move. While it runs, you get a free move with another piece.',
      'A pawn is the cheapest piece on the board. Pawns in the middle defend each other, so they are hard to push away.',
    ],
    diagram: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    diagramCaption: 'Both players have a pawn in the middle, White on e4 and Black on e5.',
    drills: [
      {
        fen: '4k3/8/8/2n1n3/8/8/3P4/4K3 w - - 0 1',
        prompt: 'Two black knights are in the centre. Push your pawn at them.',
        hint: 'one pawn push can attack two pieces at the same time',
        why: 'The pawn steps to d4 and attacks the knights on c5 and e5 at once. Black can save only one, so you win the other next move.',
        best: 'd2d4',
        accepted: ['d2d4'],
      },
      {
        fen: '4k3/p7/8/3n4/4P3/8/7P/4K3 w - - 0 1',
        prompt: 'A black knight has landed in front of your pawn. Take it.',
        hint: 'a pawn captures the square diagonally in front of it',
        why: 'Your pawn on e4 takes the knight on d5 and lands in the centre. Nothing defends the knight, so you are a piece ahead.',
        best: 'e4d5',
        accepted: ['e4d5'],
      },
      {
        fen: '4k3/p7/8/2n5/3P4/8/7P/4K3 w - - 0 1',
        prompt: 'A black knight stands next to your centre pawn. Take it.',
        hint: 'your centre pawn can take the piece beside it',
        why: 'Your pawn on d4 takes the knight on c5. No black piece defends c5, so you win a knight worth three pawns for nothing.',
        best: 'd4c5',
        accepted: ['d4c5'],
      },
    ],
  },

  {
    id: 'develop',
    requires: ['centre-pawns'],
    title: 'Bring out one new piece every move',
    goal: 'Bring out a new piece with every move.',
    body: [
      'A piece on its starting square does nothing. Giving it one move brings it out where it can see the board.',
      'Bring the knights out first, to f3 and c3 for White. Then the bishops, to squares where they look at the other king.',
      'Do not move the same piece twice at the start. The other player will bring out a new piece while you waste a move.',
      'A piece that attacks something as it comes out does two jobs. Your opponent must answer, and you bring out your next piece.',
    ],
    diagram: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    diagramCaption: 'White has brought out three pieces, one move each, and no piece has moved twice.',
    drills: [
      {
        fen: 'rnb1kbnr/pppp1ppp/8/4p1q1/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
        prompt: 'Black\'s queen is on g5. Bring your knight out to attack her.',
        hint: 'the knight can attack the queen as it comes out',
        why: 'The knight comes to f3 and attacks the queen on g5. Black must spend a move saving her, so you bring a piece out for free.',
        best: 'g1f3',
        accepted: ['g1f3'],
      },
      {
        fen: 'r3k3/4b2p/2n5/1p2p3/4P3/5N2/P7/4KB1R w - - 0 1',
        prompt: 'Bring your bishop out and take the pawn on b5 as it goes.',
        hint: 'bring out the piece that can take as it comes out',
        why: 'The bishop takes the pawn on b5 as it comes out. You win a pawn and bring a piece out, and nothing can take the bishop.',
        best: 'f1b5',
        accepted: ['f1b5'],
      },
      {
        fen: '4k3/8/8/3p4/8/2n5/7P/1N2K3 w - - 0 1',
        prompt: 'A black knight has jumped in. Take it with your knight.',
        hint: 'the piece that can take the intruder is at home',
        why: 'Your knight takes the black knight on c3, and nothing defends it. One move brings your knight out and wins a piece.',
        best: 'b1c3',
        accepted: ['b1c3'],
      },
    ],
  },

  {
    id: 'castle-early',
    requires: ['develop'],
    title: 'Get the king safe: castle early',
    goal: 'Castle before the middle of the board opens up.',
    body: [
      'The king starts in the middle, where the fighting will be. Get it out of there early, usually by move six.',
      'Castling moves the king two squares towards a rook, and the rook jumps over to the other side. It is the only move that moves two pieces at once.',
      'Castling does two jobs at once. The king hides behind pawns and the rook comes out to the middle.',
      'You may castle only if the king and that rook have not moved and nothing stands between them. A king left in the middle loses quickly.',
    ],
    diagram: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
    diagramCaption: 'White has castled, so the king is on g1 behind three pawns and the rook has come to f1.',
    drills: [
      {
        fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6',
        prompt: 'The king and the rook are clear. Move the king to safety.',
        hint: 'two pieces move at once, and the king goes behind pawns',
        why: 'Castling puts the king on g1 behind the pawns and brings the rook to f1. The king leaves the centre before the middle opens.',
        best: 'e1g1',
        // The position is level (every move within about 20 centipawns), so the
        // engine's ranking is noise; the drill asks for the king-safety move and
        // accepts only that, rather than telling a learner that a2-a3 is a pass.
        accepted: ['e1g1'],
        note: 'the position is level, so the drill accepts only the king-safety move',
      },
      {
        fen: 'r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQK2R w KQkq - 0 8',
        prompt: 'Enemy pieces are in your half. Get your king to safety.',
        hint: 'the king is still standing in the middle of the board',
        why: 'Castling puts the king on g1 behind the pawns and the rook on f1. Black was aiming at the king in the centre, and now nothing is there.',
        best: 'e1g1',
        accepted: ['e1g1'],
      },
      {
        fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/P1PP1N2/1P3PPP/RNBQK2R b KQkq - 0 6',
        prompt: 'Now you are Black. Get your king out of the middle.',
        hint: 'the other king has not castled, so put yours in safety',
        why: 'Castling puts the black king on g8 behind the pawns and the rook on f8. Pieces on both sides aim at the middle, and the king steps out of it.',
        best: 'e8g8',
        // Same as the drill above: a level position, so only the king-safety move
        // counts as the answer.
        accepted: ['e8g8'],
        note: 'the position is level, so the drill accepts only the king-safety move',
      },
    ],
  },

  {
    id: 'look-first',
    requires: ['castle-early'],
    title: 'Look first: checks and captures',
    goal: 'Look before every move, for captures and for checks.',
    body: [
      'Before each move, stop and look at the board. Ask three things: what is attacked, what can I take, and what am I leaving undefended?',
      'A piece that nothing defends is loose. Finding a loose piece is the quickest way to win it.',
      'Also count the defenders. If two of your pieces can reach a piece and only one defends it, you can take it.',
      'Check means a piece attacks your king. You must stop it: move the king, block the attack, or take the checking piece. If none of those is possible, it is checkmate.',
      'Look at your own pieces first, not just at captures. Most beginner games are lost by a piece left where it can be taken.',
    ],
    diagram: '1r2k3/pp6/8/4b3/8/8/5PPP/4R1K1 w - - 0 1',
    diagramCaption: 'The rook on e1 and the bishop on e5 are on the same line, and nothing defends the bishop.',
    drills: [
      {
        fen: '1r2k3/8/8/2n5/8/8/5PPP/2R1K3 w - - 0 1',
        prompt: 'One black piece stands alone with no defender. Take it.',
        hint: 'run your eye along every line on the board',
        why: 'The knight on c5 is on the same line as your rook, with nothing in between. Nothing defends it, so your rook takes it.',
        best: 'c1c5',
        accepted: ['c1c5'],
      },
      {
        fen: '1r2k3/8/8/4n3/3P4/8/5PPP/2R1K3 w - - 0 1',
        prompt: 'A black knight has landed on e5 with no defender. Take back.',
        hint: 'a piece that has just captured may have no defender',
        why: 'Nothing defends the knight on e5, so your pawn takes it back. You give a pawn worth one and win a knight worth three.',
        best: 'd4e5',
        accepted: ['d4e5'],
      },
      {
        fen: '6k1/8/8/8/8/8/4r3/4K3 w - - 0 1',
        prompt: 'The black rook is checking your king. Take the attacker.',
        hint: 'the piece that checks you may have nothing defending it',
        why: 'The rook checks your king and nothing defends it, so you take it. Taking the attacker is the quickest of the three ways out of check.',
        best: 'e1e2',
        accepted: ['e1e2'],
      },
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        prompt: 'The pawn on f7 is guarded by the king alone. Finish the game.',
        hint: 'look at the pawn in front of the black king',
        why: 'The queen takes on f7 and gives check. The king cannot take her, nothing can block, and it has nowhere to run.',
        best: 'h5f7',
        accepted: ['h5f7'],
      },
      {
        fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1',
        prompt: 'His king is boxed in by its own pawns. Finish the game.',
        hint: 'the far row of the board, where his king stands',
        why: 'The rook goes to a8 and checks the king on g8. Its own pawns fill f7, g7 and h7, and the rook covers the back rank, so there is no way out.',
        best: 'a1a8',
        accepted: ['a1a8'],
      },

      {
        fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
        prompt: 'The queen is on a8. Find a knight move that hits both.',
        hint: 'one knight square can see the king and the queen',
        why: 'Your knight jumps to c7 and gives check. From c7 it also attacks the queen on a8, so she falls next move.',
        best: 'b5c7',
        accepted: ['b5c7'],
      },
    ],
  },

  {
    id: 'italian',
    requires: ['look-first'],
    title: 'A model opening: the Italian game',
    goal: 'Play the first six moves of the Italian game.',
    body: [
      'You now have a plan for the start of a game. A pawn in the centre, a new piece every move, castle early, and no piece moved twice.',
      'The Italian game does all four, and people have played it for five hundred years. White plays e4, the knight to f3 and the bishop to c4.',
      'Black answers with the pawn to e5, the knight to c6 and the bishop to c5. White then plays c3 and d4 to build two pawns in the middle, and castles.',
      'Then White puts the rooks on open lines and hunts for pieces Black left undefended. The three drills below are the moves this opening turns on.',
    ],
    diagram: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    diagramCaption: 'The Italian after three moves each, with both sides holding a pawn in the middle.',
    drills: [
      {
        fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/5N2/P1PP1PPP/RNBQK2R w KQkq - 0 5',
        prompt: 'A black bishop has grabbed your b4 pawn. Hit it with a pawn.',
        hint: 'a pawn move that attacks it and helps the centre',
        why: 'The pawn on c3 attacks the bishop on b4, so Black must move it again. The pawn also supports d4, to build two pawns in the middle.',
        best: 'c2c3',
        accepted: ['c2c3'],
      },
      {
        fen: 'r1bqk1nr/pppp1ppp/2n5/b3p3/2B1P3/2P2N2/P2P1PPP/RNBQK2R w KQkq - 1 6',
        prompt: 'Push the pawn that stands next to your pawn on e4.',
        hint: 'the pawn that stands next to the pawn on e4',
        why: 'The pawn goes to d4, so White has two pawns side by side in the middle. Black must decide what to do about the pawn on e5.',
        best: 'd2d4',
        accepted: ['d2d4'],
      },
      {
        fen: 'r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/2N2N2/PP3PPP/R1BQK2R b KQkq - 2 7',
        prompt: 'Take the white pawn on e4. Check who can take back first.',
        hint: 'check who can take back before you take the pawn',
        why: 'The knight takes the pawn on e4. Your bishop on b4 pins the white knight on c3 to the king, so it cannot take back, and Black wins a pawn.',
        best: 'f6e4',
        accepted: ['f6e4'],
      },
    ],
  },

  {
    id: 'mate-in-one',
    requires: ['italian'],
    title: 'End it: mate in one',
    goal: 'Deliver checkmate with a single move.',
    body: [
      'Checkmate ends the game. The king is attacked and nothing can save it: no free square to run to, nothing can block, and nothing can take the piece that attacks him.',
      'A mate in one wins the game at once, so look for one every move. Before you play anything, ask what check you can give.',
      'Most mates are one of three shapes. The first is a rook or a queen on the back rank, the row where the king started, with his own pawns in front of him.',
      'The second is your queen beside the king, where your own king guards her. The third is a knight jumping into the corner, with the king smothered by his own pieces.',
      'Before you play it, count the squares the king has left to run to. If one of them is free, or a piece can block, or a piece can take your attacker, it is only a check.',
    ],
    diagram: '6rk/5ppp/8/6N1/8/8/8/6K1 w - - 0 1',
    diagramCaption: 'The black king is smothered: its own rook and pawns fill every square around it.',
    drills: [
      {
        fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
        prompt: 'His own pawns block the way out. Find the mate.',
        hint: 'the far row of the board, where his king stands',
        why: 'The rook reaches d8 and checks the king along the back rank. The pawns on f7, g7 and h7 block every square, so the king has nowhere to go.',
        best: 'd1d8',
        accepted: ['d1d8'],
      },
      {
        fen: '6k1/8/7K/8/8/8/8/Q7 w - - 0 1',
        prompt: 'Bring the queen across and end it.',
        hint: 'stand her beside the king, where your king guards her',
        why: 'The queen crosses the board to g7, right beside the black king. Your king on h6 guards her, so he cannot take her and has no square to run to.',
        best: 'a1g7',
        accepted: ['a1g7'],
      },
      {
        fen: '6rk/5ppp/8/6N1/8/8/8/6K1 w - - 0 1',
        prompt: 'Jump your knight in and end the game.',
        hint: 'a knight jumps over the pieces that crowd the king',
        why: 'The knight jumps to f7 and checks the king on h8. Its own rook and pawns fill every square, and nothing can take the knight.',
        best: 'g5f7',
        accepted: ['g5f7'],
      },
      {
        fen: '6k1/5ppp/8/8/8/8/8/3QK3 w - - 0 1',
        prompt: 'The same back rank, and the queen can reach it.',
        hint: 'she slides up the file to the far row',
        why: 'The queen slides to d8 and checks the king on g8. The pawns on f7, g7 and h7 are in the way of its own king, so it is mate.',
        best: 'd1d8',
        accepted: ['d1d8'],
      },
      {
        fen: '8/8/8/8/8/8/Q7/5K1k w - - 0 1',
        prompt: 'The black king is in the corner. Mate him.',
        hint: 'your king guards the square beside his king',
        why: 'The queen comes to g2, beside the king on h1, and your king on f1 guards her. He cannot take her and he has no square to run to.',
        best: 'a2g2',
        accepted: ['a2g2'],
      },
    ],
  },

  /* The two boss stops. A branch ends in a game rather than another puzzle: the
     habit the branch taught is the thing the game tests. It carries no drills
     and no diagram — the stop is won on the play screen, by checkmating Pip —
     and `boss.level` is the strength of Pip it is won against. */
  {
    id: 'boss-first-game',
    requires: ['mate-in-one'],
    boss: { level: 1 },
    title: 'Boss: beat Pip',
    goal: 'Beat Pip in a real game to finish this stretch.',
    body: [
      'This stop is a whole game, not a puzzle: you play White, and Pip plays at his sleepiest.',
      'Win it by checkmate. A draw or a loss leaves the stop open, so you can start again.',
    ],
  },

  {
    id: 'boss-last-game',
    requires: ['boss-first-game'],
    boss: { level: 2 },
    title: 'Boss: the last game',
    goal: 'Beat a stronger Pip to finish the whole path.',
    body: [
      'The last game on the path: you play White, and this time Pip plays properly.',
      'Win it by checkmate. A draw or a loss leaves the stop open, so you can start again.',
    ],
  },
];

/* The detour stops. The path has twelve stops and no way to practise one idea a
 * learner is shaky on, so a **pack** hangs off the lesson that teaches the idea:
 * three more puzzles on it, and *optional* — nothing requires a pack, a pack
 * requires nothing, and finishing one, or never opening it, changes nothing about
 * which lesson is open. A learner who keeps missing knight forks can drill forks.
 *
 * A pack is shaped like a lesson's drills, so the same tool measures it:
 *   id          the key its stars are counted under, and what the map places
 *   title       what the stop is called on the map
 *   idea        what the pack practises, in one line
 *   opensWith   the lesson that teaches that idea. The stop is offered once that
 *               lesson is finished, and it is never a requirement of anything
 *   drills[]    the same shape as a lesson's drills — fen, prompt, hint, why,
 *               best, accepted, and a `note` when the accepted list is
 *               deliberately narrower than the engine's own margin
 *
 * Where each pack hangs, and why:
 *   fork       -> look-first     ("look before every move" is where a child
 *                                 learns to spot a move that hits two things)
 *   pin        -> develop        (a pin is what an out bishop does)
 *   back-rank  -> castle-early   (the back rank is what castling is for)
 *
 * Every best/accepted pair below was measured with the same engine and the same
 * settings as the course's drills — Stockfish at /usr/games/stockfish, MultiPV 6,
 * depth 18, one thread, hash 16, one fresh process per position — by
 *   bun run scripts/verify-drills.ts
 * which reports the packs beside the lessons and writes docs/DRILLS.md.
 */
export const PACKS = [
  {
    id: 'fork',
    title: 'Fork practice',
    idea: 'One knight move that attacks two things.',
    opensWith: 'look-first',
    drills: [
      {
        fen: '6k1/p2q4/8/3N4/8/8/4P3/4K3 w - - 0 1',
        prompt: 'Fork the king and the queen with your knight.',
        hint: 'a knight forks when it attacks two pieces at once',
        why: 'Your knight jumps to f6 and gives check. The king has to move, and your knight takes the queen next.',
        best: 'd5f6',
        accepted: ['d5f6'],
      },
      {
        fen: '2r3k1/8/2N5/8/8/4P3/8/6K1 w - - 0 1',
        prompt: 'Your knight is attacked. Fork the king and the rook.',
        hint: 'check first, and take the rook next move',
        why: 'Ne7 is a check, and the same knight is looking at the rook on c8. The king must move, so the rook is yours.',
        best: 'c6e7',
        accepted: ['c6e7'],
      },
      {
        fen: '3k4/4q3/8/8/1N6/8/4P3/6K1 w - - 0 1',
        prompt: 'Fork the king and the queen.',
        hint: 'one knight move can attack two squares at once',
        why: 'Nc6 gives check and attacks the queen on e7. The king must move, so the queen cannot be saved.',
        best: 'b4c6',
        accepted: ['b4c6'],
      },
    ],
  },

  {
    id: 'pin',
    title: 'Pin practice',
    idea: 'A piece in front of its own king cannot run away.',
    opensWith: 'develop',
    drills: [
      {
        fen: '4k3/pp6/2n5/1B6/3P4/P7/8/4K3 w - - 0 1',
        prompt: 'The knight on c6 cannot move. Push the pawn to win it.',
        hint: 'a piece that is pinned cannot run away',
        why: 'Your bishop pins the knight to the king. d5 attacks it, and it is not allowed to move, so you win it.',
        best: 'd4d5',
        accepted: ['d4d5'],
      },
      {
        fen: '4k3/p6p/2n5/1B6/8/8/6PP/4K3 w - - 0 1',
        prompt: 'The knight on c6 is pinned. Take it with your bishop.',
        hint: 'look along the bishop\'s diagonal',
        why: 'The knight stands in front of its own king, so it may not move. Your bishop takes it for nothing.',
        best: 'b5c6',
        accepted: ['b5c6'],
      },
      {
        fen: '4k3/p6p/2n5/1B6/1N6/8/6PP/4K3 w - - 0 1',
        prompt: 'Take the knight that cannot move.',
        hint: 'your knight and your bishop can both reach c6',
        why: 'The pin means the knight may as well be nailed down. Your knight takes it, and nothing can take back.',
        best: 'b4c6',
        accepted: ['b4c6'],
        note: 'White is already a piece up, so the engine\'s own margin also keeps quiet moves; the drill asks for the pin\'s consequence.',
      },
    ],
  },

  {
    id: 'back-rank',
    title: 'Back-rank practice',
    idea: 'A king behind its own pawns has nowhere to go.',
    opensWith: 'castle-early',
    drills: [
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
        prompt: 'Mate in one. The king cannot leave its back rank.',
        hint: 'the rook belongs on the back rank',
        why: 'The king\'s own pawns block every square it could run to. The rook slides to e8: check, and nowhere to go.',
        best: 'e1e8',
        accepted: ['e1e8'],
      },
      {
        fen: '7k/6pp/8/8/8/1B6/6PP/4R1K1 w - - 0 1',
        prompt: 'Mate in one. One escape square is covered already.',
        hint: 'count the king\'s squares before you move',
        why: 'Re8 is check. The king has no square left: its pawns block two, and your bishop covers f7.',
        best: 'e1e8',
        accepted: ['e1e8'],
      },
      {
        fen: '3q2k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
        prompt: 'Mate in one. Take the piece that guards the rank.',
        hint: 'the black queen is the only defender',
        why: 'Qxd8 is mate. The queen that guarded the back rank is gone, and the king\'s own pawns shut the door.',
        best: 'd1d8',
        accepted: ['d1d8'],
      },
    ],
  },
];
