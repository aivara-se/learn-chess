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
    title: 'The board, and how the pieces move',
    goal: 'Learn the squares, and the move of every piece.',
    body: [
      'A chessboard has 64 squares: eight rows, called ranks, and eight columns, called files. Set the pieces up so that each player has a light square in their right-hand corner, with the white queen on a light square and the black queen on a dark one.',
      'Every game starts with the same 32 pieces. Each side has eight pawns, two knights, two bishops, two rooks, one queen and one king. The pawns go on the second rank, and the other pieces stand behind them.',
      'Each piece moves its own way. A rook slides any distance in a straight line, along a file or a rank. A bishop slides any distance along a diagonal, so it stays on one colour of square for the whole game. A queen does both. A knight jumps in an L — two squares one way and one square across — and it is the only piece that can jump over another. A king steps one square in any direction. A pawn is the odd one out: it moves one square straight forward, it may move two squares the first time it moves, and it captures one square diagonally forward. It never captures straight ahead. A pawn that reaches the far end of the board becomes a queen.',
      'In the three positions below, take a piece with a pawn, with a knight and with a bishop. Before each move, trace the line the piece travels along.',
    ],
    diagram: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    diagramCaption: 'The starting position. Eight pawns in front, and behind them the pieces that will come out one at a time.',
    drills: [
      {
        fen: '4k3/p7/8/3n4/4P3/8/7P/4K2R w - - 0 1',
        prompt: 'A black knight has stepped in front of your pawn. Take it.',
        hint: 'a pawn captures one square diagonally, never straight ahead',
        why: 'Your pawn on e4 takes the knight on d5 by stepping one square diagonally — the only way a pawn ever captures a piece.',
        best: 'e4d5',
        accepted: ['e4d5'],
      },
      {
        fen: '4k3/p7/8/8/3n4/5N2/4P2P/4K2R w - - 0 1',
        prompt: 'The black knight on d4 is attacking your knight. Take it.',
        hint: 'the knight jumps in an L, and it can jump over anything in the way',
        why: 'Your knight takes on d4 in a single jump: two squares up the board and one across. Nothing defends the black knight, so you win it for nothing.',
        best: 'f3d4',
        accepted: ['f3d4'],
      },
      {
        fen: '4k3/p7/8/3p4/2B5/7P/8/4K2R w - - 0 1',
        prompt: 'Your bishop has a clear diagonal to the black pawn. Take it.',
        hint: 'the bishop travels along diagonals only',
        why: 'The bishop takes the pawn on d5 along the diagonal from c4. The pawn on a7 is on a dark square and your bishop stays on the light squares all game, so that pawn is safe — but this one is free.',
        best: 'c4d5',
        accepted: ['c4d5'],
      },
    ],
  },

  {
    id: 'piece-values',
    title: 'What the pieces are worth, and counting',
    goal: 'Know what each piece is worth, and count before you capture.',
    body: [
      'Players count material in pawns, so that they can tell who is ahead. A pawn is one. A knight is three. A bishop is three, and slightly more useful than a knight. A rook is five. The queen is nine. The king is never counted: you cannot capture it, and the game ends when it is attacked and cannot escape.',
      'So a rook for a knight is a gain of two, and a knight for a pawn is a gain of two as well. Before every capture, ask two questions: what am I taking, and what is defending it? A piece that has a defender is not free, even when you can take it.',
      'In each of the positions below there is more than one piece you could take. Count first: a knight is worth three pawns and a rook is worth five.',
    ],
    diagram: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    diagramCaption: 'Count both sides: each player still has every piece, eight pawns, two knights, two bishops, two rooks and a queen. Nobody is ahead yet.',
    drills: [
      {
        fen: '4k3/p7/8/1r1p4/8/2N5/7P/2R1K3 w - - 0 1',
        prompt: 'Your knight on c3 can reach the rook on b5 or the pawn on d5. Take the one that wins more.',
        hint: 'counting first: a rook is worth five pawns, a pawn only one',
        why: 'The rook on b5 is worth five pawns and nothing defends it. The pawn on d5 is worth one. Taking the rook with your knight wins a whole piece.',
        best: 'c3b5',
        accepted: ['c3b5'],
      },
      {
        fen: '4k3/1r6/8/8/3n4/2P5/7P/5RK1 w - - 0 1',
        prompt: 'A black knight has captured on d4 and nothing is defending it. Take it back.',
        hint: 'a knight for a pawn is a good trade — take back',
        why: 'Your pawn on c3 takes the knight on d4. You give back a pawn worth one and take a knight worth three, so the exchange leaves you two pawns ahead, and nothing defends that knight.',
        best: 'c3d4',
        accepted: ['c3d4'],
      },
      {
        fen: 'r3k3/p7/8/4n3/3p4/5N2/7P/4K2R w - - 0 1',
        prompt: 'Both black pieces are within reach: the knight on e5 and the pawn on d4. Take the one that is worth more.',
        hint: 'three pawns beat one — look for the knight',
        why: 'The knight on e5 is worth three pawns and the pawn on d4 only one, and nothing defends either of them. Taking the knight leaves you a piece ahead.',
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
      'The four squares in the middle of the board, d4, e4, d5 and e5, are the most useful squares in the game. A piece in the centre reaches more squares than a piece on the edge, and both players try to put a pawn there first.',
      'That is why most games begin with a pawn to e4 or d4. The pawn also attacks the two squares diagonally in front of it. If an enemy piece is standing on one of those squares, the pawn attacks it and the piece has to move — and while it runs, you get a free move with something else.',
      'A pawn is the cheapest piece on the board, and the pawn that reaches the middle is the hardest one to shift, because pawns defend each other. Push a pawn into the centre and you have already started well.',
    ],
    diagram: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    diagramCaption: 'Both players have put a pawn in the middle: White on e4, Black on e5. Each pawn attacks two squares in front of it.',
    drills: [
      {
        fen: '4k3/8/8/2n1n3/8/8/3P4/4K3 w - - 0 1',
        prompt: 'Your pawn is still on its home square, and the middle is empty except for two black knights. Push the pawn into the centre.',
        hint: 'one pawn push can attack two pieces at the same time',
        why: 'The pawn steps to d4 and attacks the knights on c5 and e5 at once. Black can only save one of them, so you win the other piece next move.',
        best: 'd2d4',
        accepted: ['d2d4'],
      },
      {
        fen: '4k3/p7/8/3n4/4P3/8/7P/4K3 w - - 0 1',
        prompt: 'A black knight has landed in the centre right in front of your pawn. Take it.',
        hint: 'a pawn captures the square diagonally in front of it',
        why: 'Your pawn on e4 takes the knight on d5 diagonally and lands in the centre. Nothing defends the knight, so you are a whole piece ahead.',
        best: 'e4d5',
        accepted: ['e4d5'],
      },
      {
        fen: '4k3/p7/8/2n5/3P4/8/7P/4K3 w - - 0 1',
        prompt: 'A black knight has stepped next to your centre pawn, and nothing defends it. Take it.',
        hint: 'the pawn in the centre can take the piece standing beside it',
        why: 'Your pawn on d4 takes the knight on c5. You win a knight worth three pawns for nothing, because no black piece defends c5.',
        best: 'd4c5',
        accepted: ['d4c5'],
      },
    ],
  },

  {
    id: 'develop',
    title: 'Develop your pieces: one move for each piece',
    goal: 'Bring out a new piece with every move.',
    body: [
      'A piece sitting on its starting square does nothing. Developing means giving each piece one move so that it can see the board. The knights come out first, because they are the slowest to reach the middle: to f3 and c3 for White, to f6 and c6 for Black. Then the bishops, usually to c4 and g5 where they look towards the other king, or to c5 and g4 the other way round.',
      'The rule is one move for each piece. If you move the same piece twice while other pieces are still asleep, the other player gets a free move with a new piece. Beginners lose a great many games this way: four moves with one knight, and the other seven pieces never left home.',
      'A developing move can do two jobs at once. Send a piece to a square where it attacks something, and the other player has to deal with the attack while you bring out your next piece.',
    ],
    diagram: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    diagramCaption: 'White has moved three pieces three times: the pawn to e4, the knight to f3, the bishop to c4. Not one piece has moved twice.',
    drills: [
      {
        fen: 'rnb1kbnr/pppp1ppp/8/4p1q1/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
        prompt: 'Black has brought the queen out to g5 on move two. Your knight is still on g1 — develop it so that it also attacks the queen.',
        hint: 'a developing knight can attack the queen on its way out',
        why: 'The knight comes to f3, where it attacks the queen on g5. Black has to spend a move saving the queen, so you develop a piece and slow Black down in the same move.',
        best: 'g1f3',
        accepted: ['g1f3'],
      },
      {
        fen: 'r3k3/4b2p/2n5/1p2p3/4P3/5N2/P7/4KB1R w - - 0 1',
        prompt: 'Your bishop is still on its home square. Bring it out and take the pawn on b5 on the way.',
        hint: 'develop the piece that can take something as it comes out',
        why: 'The bishop develops to b5 by capturing the pawn there in the same move. You are a pawn up and a piece out, and the bishop stands on a square nothing can take it on.',
        best: 'f1b5',
        accepted: ['f1b5'],
      },
      {
        fen: '4k3/8/8/3p4/8/2n5/7P/1N2K3 w - - 0 1',
        prompt: 'A black knight has jumped into your half of the board. Bring your own knight out by taking it.',
        hint: 'the piece that can take the intruder is still at home',
        why: 'Your knight develops to c3 by capturing the black knight, which has nothing defending it. One move brings a piece out and wins a piece.',
        best: 'b1c3',
        accepted: ['b1c3'],
      },
    ],
  },

  {
    id: 'castle-early',
    title: 'Get your king safe: castle early',
    goal: 'Castle before the middle of the board opens up.',
    body: [
      'The king starts the game in the middle of the board, which is exactly where the fighting will be. Once the knight and the bishop between the king and the rook have moved, you can swap the king and the rook in a single move: the king moves two squares towards the rook, and the rook jumps over to the other side of the king. That move is called castling.',
      'Castling does two jobs at once. The king goes behind a wall of pawns, where few pieces can reach it, and the rook comes out to the middle of the board, where it belongs. It is the only move in chess that moves two pieces at the same time.',
      'Castle early, by move six or so. A king left in the middle is the usual reason beginners lose quickly: as soon as the pawns in front of it move, the enemy queen and rooks come down the open files, and every attack costs the player in the middle a piece to defend it.',
      'You may castle only if neither the king nor that rook has moved yet, if the squares between them are empty, and if the king is not in check, does not pass through an attacked square and does not land on one.',
    ],
    diagram: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
    diagramCaption: 'White has castled: the king is on g1 behind three pawns, and the rook has come from h1 to f1 in the same move.',
    drills: [
      {
        fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6',
        prompt: 'Both players have brought out their pieces, and nothing stands between your king and your rook. Get the king out of the middle.',
        hint: 'two pieces move at once, and the king ends up behind the pawns',
        why: 'Castling puts the king on g1, behind the pawns, and brings the rook to f1 in the same move. The king is out of the centre before the files in the middle open. Nothing else here does that job: this position is level, so the engine rates a quiet pawn move just as highly, and the move the position really asks for is the one that shelters the king.',
        best: 'e1g1',
        // The position is level (every move within about 20 centipawns), so the
        // engine's ranking is noise; the drill asks for the king-safety move and
        // accepts only that, rather than telling a learner that a2-a3 is a pass.
        accepted: ['e1g1'],
      },
      {
        fen: 'r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQK2R w KQkq - 0 8',
        prompt: 'A black bishop and a black knight are standing in your half of the board and the centre pawns have been traded off. Away with the king.',
        hint: 'the king is still on the open file in the middle',
        why: 'Castling takes the king off the middle of the board and puts it on g1 behind the pawns, while the rook comes to f1. Black was looking at the king in the centre; now there is nothing there to look at.',
        best: 'e1g1',
        accepted: ['e1g1'],
      },
      {
        fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/P1PP1N2/1P3PPP/RNBQK2R b KQkq - 0 6',
        prompt: 'Now you are Black. White has just spent a move on the pawn in the corner, and your king is still standing in the middle with the bishop on c5 and the knight on f6 already out. Get it safe.',
        hint: 'the other king has not castled either — put yours where White has not put theirs',
        why: 'Castling puts the black king on g8 behind the pawns and brings the rook to f8. The pieces on both sides are pointing at the d-file and the e-file, and the king steps out of both of them. This position is level — the engine rates the waiting moves h6 and a5 the same — so the answer is the move that does the job the lesson is about.',
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
      'The queen is the strongest piece and one of the easiest to lose. On move two or three, while the knights and bishops are still at home, a queen that comes out has no support: any pawn or knight can attack it, and it has to run away again.',
      'Every time the queen is attacked and moves again, the other player has a free move to bring out another piece. A queen that comes out early usually ends up hiding on the edge of the board, while the other player is ahead in development.',
      'There is a second reason to leave the queen at home. It needs open lines to be strong, and at the start of the game the board is full of pawns. Bring the knights and bishops out, castle, put your rooks on the open files, and the queen will find work by itself.',
      'In the positions below the queen has come out too early, and the other side has a way to punish it. Look at every piece that can reach the queen, and at whether anything defends her.',
    ],
    diagram: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',
    diagramCaption: 'White has played the queen out on move two. Black can hit it with the pawn on g7 or the knight on g8 (to f6), and every hit costs White a move.',
    drills: [
      {
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        prompt: 'Black has brought the queen out to h4 on move two, where your knight on f3 can already reach it. Take it.',
        hint: 'something you have already developed is looking straight at the queen',
        why: 'Your knight on f3 has been attacking h4 ever since the queen landed there, and no black piece defends it. You win the queen for a knight, which decides the game.',
        best: 'f3h4',
        accepted: ['f3h4'],
      },
      {
        fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
        prompt: 'The black queen has run to the corner on a8 and the black king is on e8. Find the knight move that attacks both of them at once.',
        hint: 'one knight square can see the king and the queen together',
        why: 'Your knight jumps to c7 and gives check, and from c7 it also attacks the queen on a8. Black has to answer the check, and you take the queen next move.',
        best: 'b5c7',
        accepted: ['b5c7'],
      },
      {
        fen: '4k3/8/8/8/3q4/2B5/8/3NK3 w - - 0 1',
        prompt: 'The black queen has wandered into the middle of the board on d4, and nothing defends her. Take her.',
        hint: 'count what your bishop can reach, and what defends the queen',
        why: 'Your bishop on c3 takes the queen on d4 along the diagonal. Nine pawns of material go off the board for nothing, because no black piece defends d4.',
        best: 'c3d4',
        accepted: ['c3d4'],
      },
    ],
  },

  {
    id: 'look-first',
    title: 'Look first: what is attacked',
    goal: 'Look for captures and undefended pieces before every move.',
    body: [
      'Before you choose a move, spend a few seconds looking at the board. Ask three questions. Which of my pieces is being attacked? Which of the other player\'s pieces can I capture? What will my move leave undefended?',
      'A piece that nothing defends is called a loose piece. Finding one is the quickest way to win material. So is a piece that is attacked more often than it is defended: if two of your pieces can reach it and only one defends it, you can take it.',
      'This is also the reason to look at your own pieces first. Most beginner games are decided by a piece left standing where it can be taken, not by clever moves.',
      'Below there is a piece nothing defends, a pawn that can take back, and a way to finish the game in one move.',
    ],
    diagram: '1r2k3/pp6/8/4b3/8/8/5PPP/4R1K1 w - - 0 1',
    diagramCaption: 'Look along the e-file: the rook on e1 and the bishop on e5 are on the same line, nothing is between them, and nothing defends the bishop.',
    drills: [
      {
        fen: '1r2k3/8/8/2n5/8/8/5PPP/2R1K3 w - - 0 1',
        prompt: 'Look at every black piece and ask what defends it. One of them is standing alone — take it.',
        hint: 'run your eye up every file and along every rank',
        why: 'The knight on c5 stands on the same file as your rook with nothing in between, and no black piece defends it. Your rook takes it and you are a whole piece ahead.',
        best: 'c1c5',
        accepted: ['c1c5'],
      },
      {
        fen: '1r2k3/8/8/4n3/3P4/8/5PPP/2R1K3 w - - 0 1',
        prompt: 'A black knight has captured on e5 and is standing there without a defender. Take back.',
        hint: 'a piece that has just captured may have nothing defending it',
        why: 'Nothing defends the knight on e5, so your pawn takes it back. You give up a pawn worth one and take a knight worth three, and the pawn lands in the centre.',
        best: 'd4e5',
        accepted: ['d4e5'],
      },
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        prompt: 'Black has left the pawn on f7 guarded by the king alone, and your bishop on c4 covers that same square. Finish the game.',
        hint: 'look at the pawn in front of the black king and count who defends it',
        why: 'The queen takes on f7 and gives check. The king cannot take back because your bishop on c4 guards f7, there is no square for it to run to, and nothing can block the check. That is checkmate.',
        best: 'h5f7',
        accepted: ['h5f7'],
      },
    ],
  },

  {
    id: 'italian',
    title: 'A model opening: the Italian game',
    goal: 'Play the first six moves of the Italian opening, and know why.',
    body: [
      'You now have a plan for the start of a game: put a pawn in the centre, bring out a new piece with every move, castle early, and do not move the same piece twice. The Italian opening does all four, and it has been played for five hundred years.',
      'The moves are these. e4, so a pawn takes the centre. Nf3, so the knight comes out and attacks the pawn on e5. Bc4, so the bishop lands on the diagonal that points at f7, the square in Black\'s camp that only the king defends. Black answers in the same way: e5, Nc6, Bc5.',
      'White then plays c3 and d4, to stand two pawns side by side in the middle, and castled. Black looks for a chance to take the pawn on e4, which the bishop on c5 watches. After the kings are safe, the middlegame begins: rooks go to the open files, and both players hunt for a piece the other one has left undefended.',
      'The three positions below are moments this opening turns on: the pawn move that builds the centre, the push that takes the middle, and a capture that punishes a pawn left undefended.',
    ],
    diagram: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    diagramCaption: 'The Italian after three moves each: both sides have a pawn in the centre, a knight out, and a bishop on the diagonal towards the weakness on f7.',
    drills: [
      {
        fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/5N2/P1PP1PPP/RNBQK2R w KQkq - 0 5',
        prompt: 'Black\'s bishop has grabbed the pawn on b4 and is standing out on its own. Play the move that builds the centre and attacks it.',
        hint: 'a small pawn move that attacks a piece and supports the centre at the same time',
        why: 'The pawn on c3 attacks the bishop on b4, so the bishop has to move again, and the pawn is ready to support d4: two pawns side by side in the middle. Black has to spend a whole move on saving the bishop.',
        best: 'c2c3',
        accepted: ['c2c3'],
      },
      {
        fen: 'r1bqk1nr/pppp1ppp/2n5/b3p3/2B1P3/2P2N2/P2P1PPP/RNBQK2R w KQkq - 1 6',
        prompt: 'The bishop has run back to a5. Now make the big centre: push the pawn that belongs beside the pawn on e4.',
        hint: 'the pawn that stands next to the pawn on e4',
        why: 'The pawn goes to d4, so White has two pawns side by side in the middle and rules more of the board than Black does. Black\'s pawn on e5 has to decide what to do about it.',
        best: 'd2d4',
        accepted: ['d2d4'],
      },
      {
        fen: 'r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/2N2N2/PP3PPP/R1BQK2R b KQkq - 2 7',
        prompt: 'Now you are Black. White\'s pawn on e4 has stepped forward and nothing defends it. Take it, but check first who can take back.',
        hint: 'check who can take back before you take the pawn',
        why: 'The knight takes the pawn on e4 and nothing defends it: the black bishop on b4 pins White\'s knight on c3 to the king, so that knight cannot even try to take back, and no other white piece defends e4. Black wins a pawn.',
        best: 'f6e4',
        accepted: ['f6e4'],
      },
    ],
  },
];
