/* Learn chess — the course.
 *
 * Eight lessons for someone who has never played, three drills each, in order:
 * the board and the pieces, what material is worth, pawns in the centre,
 * developing, castling, the early queen, looking before you move, and the
 * Italian opening as a model.
 *
 * A lesson is data: { id, title, goal, body[], diagram, diagramCaption, drills[] }.
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
 *
 * Every best/accepted pair was measured with Stockfish 17 at
 * /usr/games/stockfish (MultiPV=4, depth 18, one thread, hash 16, one fresh
 * engine per position) and re-checked with python-chess: the position is legal,
 * every accepted move is legal in it, and each mate-in-one really is mate. The
 * record of those runs is tmp/drill-verification.txt. If a position changes,
 * measure again — an accepted list that rejects a good move teaches the wrong
 * thing.
 */

export const LESSONS = [
  {
    id: 'board-and-pieces',
    title: 'The board and the pieces',
    goal: 'Learn the squares and how every piece moves.',
    body: [
      'A chessboard has 64 squares, eight rows called ranks and eight columns called files. Set it up with a light square in each player\'s right-hand corner.',
      'Every game starts with the same 32 pieces. Each side has eight pawns, two rooks, two knights, two bishops, a queen and a king.',
      'A rook slides in a straight line and a bishop slides along a diagonal. A queen does both, a knight jumps in an L, and a king steps one square.',
      'A pawn moves straight ahead and captures one square diagonally. At the far end of the board it becomes a queen.',
    ],
    diagram: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    diagramCaption: 'The starting position: eight pawns in front and the other pieces behind them.',
    drills: [
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
        fen: '4k3/p7/8/3p4/2B5/7P/8/4K2R w - - 0 1',
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
      },
    ],
  },

  {
    id: 'queen-early',
    title: 'Do not bring the queen out early',
    goal: 'Keep the queen at home until the other pieces are out.',
    body: [
      'The queen is the strongest piece and one of the easiest to lose. Coming out on move two, it has no support.',
      'Any pawn or knight can attack it, so it must run away again. Every time it runs, the other player brings out a new piece for free.',
      'The queen needs open lines to be strong. At the start the board is full of pawns, so she has no room.',
      'Bring the knights and bishops out and castle first. The queen will find work on her own.',
    ],
    diagram: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',
    diagramCaption: 'White has played the queen out on move two, and every attack on it costs White a move.',
    drills: [
      {
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        prompt: 'Black\'s queen is out on h4. Take it with your knight.',
        hint: 'a piece you already brought out is looking at the queen',
        why: 'Your knight on f3 attacks h4, and no black piece defends the queen. You win the queen for a knight, and that wins the game.',
        best: 'f3h4',
        accepted: ['f3h4'],
      },
      {
        fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
        prompt: 'The queen is on a8. Find a knight move that hits both.',
        hint: 'one knight square can see the king and the queen',
        why: 'Your knight jumps to c7 and gives check. From c7 it also attacks the queen on a8, so she falls next move.',
        best: 'b5c7',
        accepted: ['b5c7'],
      },
      {
        fen: '4k3/8/8/8/3q4/2B5/8/3NK3 w - - 0 1',
        prompt: 'The black queen is on d4 with nothing defending her. Take her.',
        hint: 'see if your bishop can reach the queen',
        why: 'Your bishop on c3 takes the queen on d4 along the diagonal. The queen is worth nine pawns and nothing defends her.',
        best: 'c3d4',
        accepted: ['c3d4'],
      },
    ],
  },

  {
    id: 'look-first',
    title: 'Look first: what is attacked',
    goal: 'Look before every move, for free pieces and captures.',
    body: [
      'Before each move, stop and look at the board. Ask three things: what is attacked, what can I take, and what am I leaving undefended?',
      'A piece that nothing defends is loose. Finding a loose piece is the quickest way to win it.',
      'Also count the defenders. If two of your pieces can reach a piece and only one defends it, you can take it.',
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
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        prompt: 'The pawn on f7 is guarded by the king alone. Finish the game.',
        hint: 'look at the pawn in front of the black king',
        why: 'The queen takes on f7 and gives check. The king cannot take her, nothing can block, and it has nowhere to run.',
        best: 'h5f7',
        accepted: ['h5f7'],
      },
    ],
  },

  {
    id: 'italian',
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
];
