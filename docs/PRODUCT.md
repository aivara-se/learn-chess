# learn-chess: product

A beginner's chess course for children, walked as a path of ten stops on a painted map.

## Problem

A child learns chess from an adult, not from a page of rules. What is missing
is a course walked alone: short lessons that end in a position, an opponent that does not
crush, and a reason to open the next stop. A free game to wander into, and a puzzle chosen by
the date, taught less than a lesson did.

Learn-chess is that course: stops that open as the child finishes what comes before, every idea played
on a board, and Pip the pawn judging the move just played.

## Scope

**In.** One path of ten stops — eight lessons and two boss games — and three optional detour packs,
thirty-nine positions in all. The coach's verdict on every move. Stars, ranks, and the child's progress
on their own device. The painted map. Offline once visited.

**Not this version.** Free play. A daily puzzle. Sound. More packs. A view for a parent.

**Never.** An account, a server, analytics, a payment, or a request off the device. A lesson with no
position to play in it. A verdict a child cannot read.

## Behaviour

- A stop opens when the stop it requires is finished; the path is a chain, and the map draws what the graph opens.
- The path ends in a boss game, won by a checkmate the child delivers.
- A star is a first-try solve: never after a wrong answer or a hint. A boss game earns none.
- Puzzles solved and stars won are shown as two numbers.
- Stars become a rank: Pawn, Knight, Bishop, Rook, Queen, King, one rung every five to seven stars.
- Every total is derived, never written down.
- Pip has a verdict for every move: Perfect!, Nice move, Okay, Careful, That loses something, Oops.
- The stronger move is named when the child missed it; Pip's own move is never criticised for the score it leaves.
- The biggest threat Pip's reply creates is said aloud, in one sentence.
- The score is said in words, never as a bare number.
- A check is announced first, and mate as the end of the game.
- Nothing is signalled by colour alone: a verdict, a turn and a check are always also a word.
- Every square names itself for a screen reader.
- 48px is the floor for anything a child taps; the board is the measured exception, down to 240px.
- Under `prefers-reduced-motion: reduce` nothing moves, the piece that just arrived included.
- Progress is kept on the device, and a reload returns the child to it.
- A visited stop opens with the network off.

## Autonomy

An agent decides alone: a lesson's wording inside its copy budget, art, and the mechanics behind a
rule. It stops for a decision on a new dependency, a new stop or pack, a change to the course data's
shape, or anything `Never` refuses.

## Vision

A child who finishes the path can play a game and see why a move was good. What must not change: the
course is data, and every idea is played rather than read.

## Acceptance

1. It opens on the path, one stop open.
2. Every stop is reachable and no requirement is a circle.
3. A lesson is walked end to end, a star per first-try solve.
4. Pip's verdict survives his own reply.
5. Progress survives a reload.
6. Every answer is within 30 centipawns of Stockfish's.
7. At 360×640 the board holds 240px.
8. Offline, a visited stop still opens.
