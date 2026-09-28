/* Learn chess — the detour stops.
 *
 * The path has eight stops and no way to practise one idea a learner is shaky on.
 * A pack is a detour off the path: three puzzles on one idea, hung beside the
 * lesson that teaches it, and *optional*. Nothing requires a pack, a pack
 * requires nothing, and finishing one — or never opening it — changes nothing
 * about which lesson is open. A learner who keeps missing knight forks can drill
 * forks; a learner who wants more does not have to wait for the next lesson.
 *
 * A pack is shaped like a lesson's drills, so the same tool measures it:
 *   id          the key its stars are counted under, and what the map places
 *   title       what the stop is called on the map
 *   idea        what the pack practises, in one line
 *   opensWith   the lesson that teaches the idea. The stop is offered when that
 *               lesson is finished; it is never a requirement of anything
 *   drills[]    the same shape as a lesson's drills — fen, prompt, hint, why,
 *               best, accepted, and a `note` when the accepted list is
 *               deliberately narrower than the engine's own margin.
 *
 * Where each pack hangs, and why:
 *   fork       -> look-first     ("look before every move" is where a child
 *                                 learns to spot a move that hits two things)
 *   pin        -> develop        (a pin is what an out bishop does)
 *   back-rank  -> castle-early   (the back rank is what castling is for)
 *
 * Every best/accepted pair below was measured with the same engine and settings
 * as the course's drills — Stockfish 17 at /usr/games/stockfish, MultiPV 6,
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

/* The number a pack adds to the course, and the keys its stars are counted
 * under. Both are derived here so no screen has to write a total down. */
export const PACK_DRILLS = PACKS.reduce((n, p) => n + p.drills.length, 0);
