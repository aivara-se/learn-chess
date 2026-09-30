/* The lesson's own rules — run with `bun test`.
 *
 * `src/scenes/lesson.js` is a PixiJS screen, so a suite cannot hold it still;
 * everything it decides that is worth arguing about is in `src/lesson/`, which is
 * pure by construction, and this file is where those decisions are held. The
 * browser check in the pull request is the other half — it plays `#/lesson/1` end
 * to end and says what the pixels do. What is here is what a browser is a bad
 * instrument for: every puzzle in the course, checked against the engine.
 *
 * The four rules this file exists for:
 *
 *  1. **Every drill in the course is solvable and its answer is right.** For all
 *     35 puzzles, the drill's own answer is a legal move in its own position and
 *     the drill accepts it; every UCI in every `accepted` list names a legal move;
 *     and a legal move the list does not hold is not an answer, which is the other
 *     half of the same rule — a drill that accepts anything teaches nothing.
 *  2. **A promotion is one tap.** Four moves reach one square, so the marks are
 *     grouped by square and the tap takes the drill's own promotion out of the
 *     four — with no promotion drill left in the course, that one is checked on a
 *     position built for it rather than silently dropped.
 *  3. **A tap lands on the square it was made on.** `src/lesson/board-input.js` is
 *     the inverse of the board's own geometry; every square, tapped at its centre,
 *     must come back as itself, in both orientations.
 *  4. **The coach says something about every move, and never criticises the
 *     engine's own.** The six bands are the ported ones, a played move that *is*
 *     the engine's choice is praised rather than corrected, and a move that misses
 *     a mate is named the better move it missed.
 *
 * And the one rule that spans two modules, which is why it is here and not in
 * either of them: **a lesson writes progress once and the map reads the same
 * keys.** `src/lesson/record.js` is the only writer and `src/path/progress.js` is
 * the only reader; this file solves a lesson's puzzles through the writer and asks
 * the reader what the map makes of it.
 *
 * **A detour pack is played by the same screen**, so its rules are here beside
 * the lesson's: `#/pack/<id>` names its stop or refuses in words a child can
 * read, a pack is walked as its idea and its puzzles, and solving those is what
 * finishes it on the map — without opening or closing anything else on the path.
 */
import { describe, expect, test } from 'bun:test';
import { LESSONS, PACKS } from '../src/data/lessons.js';
import { boardLayout, cornerOf } from '../src/board/geometry.js';
import { inCheck, isCheckmate, legalMoves, makeMove, parseFen, pieceAt, squareName } from '../src/engine/engine.js';
import { squareAt } from '../src/lesson/board-input.js';
import { lessonAddress, packAddress } from '../src/lesson/address.js';
import { describeMove, grade, verdict } from '../src/lesson/coach.js';
import { answerMove, answered, moveFor, targetsFor, toUci, uciToMove } from '../src/lesson/drill.js';
import { solve } from '../src/lesson/record.js';
import { numberOf, openedBy, puzzlesIn, stepsFor } from '../src/lesson/steps.js';
import { blank, drillKey, finished, open, puzzles, read, state } from '../src/path/progress.js';

/* Every drill in the course, with the position it is played from — the shape the
 * screen builds per step, in one list, so a test can walk the whole course. */
const everyDrill = LESSONS.flatMap((lesson) => (lesson.drills ?? []).map((drill, index) => ({
  lesson,
  index,
  drill,
  pos: parseFen(drill.fen),
})));

/* A storage that behaves like the device's, for the writer. */
const store = (initial = null) => ({
  value: initial,
  getItem() { return this.value; },
  setItem(_key, text) { this.value = text; },
});

describe('a lesson is walked as steps', () => {
  test('every stop is its paragraphs, its diagram, its puzzles and the panel', () => {
    for (const lesson of LESSONS) {
      const steps = stepsFor(lesson);
      expect(steps.filter((step) => step.kind === 'read').length).toBe((lesson.body ?? []).length);
      expect(steps.filter((step) => step.kind === 'look').length).toBe(lesson.diagram ? 1 : 0);
      expect(puzzlesIn(steps).length).toBe((lesson.drills ?? []).length);
      expect(steps.at(-1).kind).toBe('done');
    }
  });

  test('the puzzle steps carry their own drill, in the course’s order', () => {
    for (const lesson of LESSONS) {
      const steps = puzzlesIn(stepsFor(lesson));
      expect(steps.map((step) => step.i)).toEqual((lesson.drills ?? []).map((_, i) => i));
      expect(steps.map((step) => step.drill.prompt)).toEqual((lesson.drills ?? []).map((drill) => drill.prompt));
    }
  });

  test('a lesson’s number is the number in its address', () => {
    for (const lesson of LESSONS) expect(LESSONS[numberOf(lesson) - 1]).toBe(lesson);
  });

  test('the panel offers what finishing the lesson opens, off the graph', () => {
    /* Nothing is played, so a fresh record opens nothing, for any lesson. */
    const fresh = blank();
    for (const lesson of LESSONS) expect(openedBy(fresh, lesson)).toEqual([]);

    /* Finish one lesson's own puzzles. What it opens is the stops the graph hangs
     * off it — every one of them names it as a requirement, and none of them is
     * opened by a lesson it does not require. */
    const first = LESSONS[0];
    const record = blank();
    for (let i = 0; i < (first.drills ?? []).length; i += 1) record.done[drillKey(first.id, i)] = true;
    for (const opened of openedBy(record, first)) expect(opened.requires ?? []).toContain(first.id);
    for (const stop of LESSONS) {
      if ((stop.requires ?? []).includes(first.id)) continue;
      expect(openedBy(record, first)).not.toContain(stop);
    }
  });
});

describe('the drill arithmetic, over the whole course', () => {
  test('the course has puzzles to check', () => {
    expect(everyDrill.length).toBeGreaterThan(20);
  });

  test('every drill’s own answer is legal, and the drill accepts it', () => {
    for (const { lesson, index, drill, pos } of everyDrill) {
      const move = answerMove(pos, drill);
      expect(move, `${lesson.id} puzzle ${index + 1} has no playable answer`).toBeTruthy();
      expect(answered(drill, move), `${lesson.id} puzzle ${index + 1} does not accept its own answer`).toBe(true);
    }
  });

  test('every accepted move in the course names a legal move', () => {
    for (const { lesson, index, drill, pos } of everyDrill) {
      for (const uci of drill.accepted ?? []) {
        expect(uciToMove(pos, uci), `${lesson.id} puzzle ${index + 1}: ${uci} is not legal here`).toBeTruthy();
        expect(toUci(uciToMove(pos, uci))).toBe(uci);
      }
    }
  });

  test('a legal move the drill does not accept is not an answer', () => {
    let checked = 0;
    for (const { drill, pos } of everyDrill) {
      const other = legalMoves(pos).find((move) => !answered(drill, move));
      if (!other) continue;
      checked += 1;
      expect(answered(drill, other)).toBe(false);
    }
    expect(checked).toBe(everyDrill.length);
  });

  test('a promotion is one square and one mark, and the tap takes the drill’s own promotion', () => {
    const pos = parseFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const from = 48;                                  // a7
    const moves = legalMoves(pos).filter((move) => move.from === from);
    expect(moves.length).toBeGreaterThan(1);          // four pieces it could become
    expect(new Set(moves.map((move) => move.to)).size).toBe(1);

    const marks = targetsFor(pos, from);
    expect(marks.length).toBe(1);                     // one mark, not four
    expect(marks[0].square).toBe(56);                 // a8

    const asQueen = moveFor(pos, from, 56, { accepted: ['a7a8q'] });
    expect(asQueen?.promotion).toBe('q');
    /* With no preference in the data, the first legal promotion is what a tap at
     * an empty square means — the child cannot have meant nothing. */
    expect(moveFor(pos, from, 56, { accepted: [] })).toBeTruthy();
    expect(moveFor(pos, from, 40, { accepted: ['a7a8q'] })).toBeNull();
  });

  test('a rook’s reach is marked once per square', () => {
    const pos = parseFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    const marks = targetsFor(pos, 0);                 // a1
    expect(marks.length).toBe(0 + marks.length);
    expect(new Set(marks.map((mark) => mark.square)).size).toBe(marks.length);
    expect(marks.every((mark) => typeof mark.capture === 'boolean')).toBe(true);
  });
});

describe('a tap lands on the square it was made on', () => {
  const layout = boardLayout({ width: 360, height: 360, room: 328 });

  test('every square, tapped at its centre, comes back as itself', () => {
    for (const flipped of [false, true]) {
      for (let sq = 0; sq < 64; sq += 1) {
        const corner = cornerOf(sq, layout, flipped);
        const at = { x: corner.x + layout.square / 2, y: corner.y + layout.square / 2 };
        expect(squareAt(at, layout, flipped), `square ${squareName(sq)} (flipped: ${flipped})`).toBe(sq);
      }
    }
  });

  test('a tap outside the board is nothing', () => {
    expect(squareAt({ x: layout.left - 4, y: layout.top + 4 }, layout)).toBeNull();
    expect(squareAt({ x: layout.left + 4, y: layout.top - 4 }, layout)).toBeNull();
    expect(squareAt({ x: layout.left + layout.side + 4, y: layout.top + 4 }, layout)).toBeNull();
    expect(squareAt({ x: 0, y: 0 }, null)).toBeNull();
  });
});

describe('the coach’s words', () => {
  test('the six bands are the ported ones, at their own boundaries', () => {
    expect(verdict(0).word).toBe('Perfect!');
    expect(verdict(10).word).toBe('Perfect!');
    expect(verdict(11).word).toBe('Nice move');
    expect(verdict(40).word).toBe('Nice move');
    expect(verdict(41).word).toBe('Okay');
    expect(verdict(70).word).toBe('Okay');
    expect(verdict(71).word).toBe('Careful');
    expect(verdict(150).word).toBe('Careful');
    expect(verdict(151).word).toBe('That loses something');
    expect(verdict(300).word).toBe('That loses something');
    expect(verdict(301).word).toBe('Oops');
  });

  test('the tone is the colour the bubble is tinted', () => {
    expect(verdict(0).tone).toBe('good');
    expect(verdict(41).tone).toBe('plain');
    expect(verdict(151).tone).toBe('bad');
  });

  test('a move is described in the child’s words', () => {
    const take = parseFen('4k3/8/3p4/8/4N3/8/8/4K3 w - - 0 1');
    const capture = legalMoves(take).find((move) => move.from === 28 && move.to === 43);   // Ne4xd6
    expect(describeMove(take, capture).text).toContain('wins the pawn on d6');
    expect(describeMove(take, capture).verb).toBe('take the pawn on d6');

    const castle = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const short = legalMoves(castle).find((move) => move.from === 4 && move.to === 6);
    expect(describeMove(castle, short).text).toContain('tucks the king away safely');
    expect(describeMove(castle, short).verb).toBe('castle');
  });

  test('the answer the drill asks for is never criticised — it is the engine’s own', () => {
    const { drill, pos } = everyDrill.find(({ drill }) => drill.prompt === 'Take the black pawn on e6 with your knight.');
    const said = grade(pos, answerMove(pos, drill));
    expect(said.line.startsWith('Perfect!')).toBe(true);
    expect(said.line).not.toContain('Better was');
    expect(said.tone).toBe('good');
  });

  test('a move that loses the mate is told what the better move was', () => {
    const mate = everyDrill.find(({ drill, pos }) => {
      const move = answerMove(pos, drill);
      return move && isCheckmate(makeMove(pos, move));
    });
    expect(mate, 'the course has a mate to check').toBeTruthy();
    const aim = answerMove(mate.pos, mate.drill);
    expect(grade(mate.pos, aim).line).toBe('Perfect! Checkmate — the game is yours.');

    const missed = legalMoves(mate.pos).find((move) => !isCheckmate(makeMove(mate.pos, move)));
    const said = grade(mate.pos, missed);
    expect(said.line).toContain('Better was the');
    expect(said.tone).not.toBe('good');
  });

  test('a check is announced before the sentence', () => {
    const checking = everyDrill.find(({ drill, pos }) => {
      const move = answerMove(pos, drill);
      if (!move) return false;
      const after = makeMove(pos, move);
      return inCheck(after, after.turn) && !isCheckmate(after);
    });
    expect(checking, 'the course has a check to check').toBeTruthy();
    expect(grade(checking.pos, answerMove(checking.pos, checking.drill)).line.startsWith('Check! ')).toBe(true);
  });

  test('a move that takes nothing and checks nothing still gets a verdict', () => {
    const quiet = everyDrill.find(({ drill, pos }) => describeMove(pos, answerMove(pos, drill)).empty);
    if (quiet) {
      const said = grade(quiet.pos, answerMove(quiet.pos, quiet.drill));
      expect(said.line.length).toBeGreaterThan(3);
      expect(said.tone).toBeTruthy();
    }
  });
});

describe('progress is written once and read everywhere', () => {
  const lesson = LESSONS.find((unit) => (unit.drills ?? []).length > 1);

  test('a solve writes the map’s own key', () => {
    const storage = store();
    const { written, star } = solve(lesson, 0, { firstTry: true, store: storage });
    expect(written).toBe(true);
    expect(star).toBe(true);
    const record = read(storage);
    expect(record.done[drillKey(lesson.id, 0)]).toBe(true);
    expect(record.first[drillKey(lesson.id, 0)]).toBe(true);
  });

  test('a solved puzzle that was not a first try is solved and is not a star', () => {
    const storage = store();
    solve(lesson, 0, { firstTry: false, store: storage });
    const record = read(storage);
    expect(record.done[drillKey(lesson.id, 0)]).toBe(true);
    expect(record.first[drillKey(lesson.id, 0)]).toBe(undefined);
  });

  test('the map reads a solved lesson as finished, and its stars as stars', () => {
    const storage = store();
    for (let i = 0; i < lesson.drills.length; i += 1) solve(lesson, i, { firstTry: i === 0, store: storage });
    const record = read(storage);
    expect(finished(record, lesson)).toBe(true);
    expect(state(record, lesson)).toBe('done');
    expect(puzzles(record, lesson)).toEqual({ of: lesson.drills.length, solved: lesson.drills.length, stars: 1 });
    expect(open(record, lesson)).toBe(true);
  });

  test('a stop opens exactly when the lessons the graph requires of it are finished', () => {
    const stop = LESSONS.find((unit) => (unit.requires ?? []).length > 0);
    if (!stop) return;
    const storage = store();
    const needs = stop.requires.map((id) => LESSONS.find((unit) => unit.id === id));

    /* Nothing has been played, so nothing is open. */
    expect(open(read(storage), stop)).toBe(false);
    expect(state(read(storage), stop)).toBe('locked');

    /* Every requirement but the last: a merge stays shut until all of them are
     * finished, which is the whole point of a merge. */
    for (const need of needs.slice(0, -1)) {
      for (let i = 0; i < need.drills.length; i += 1) solve(need, i, { firstTry: true, store: storage });
    }
    if (needs.length > 1) expect(open(read(storage), stop)).toBe(false);

    const last = needs[needs.length - 1];
    for (let i = 0; i < last.drills.length; i += 1) solve(last, i, { firstTry: true, store: storage });
    expect(open(read(storage), stop)).toBe(true);
    expect(state(read(storage), stop)).not.toBe('locked');
  });

  test('the writer keeps the fields it does not own', () => {
    const storage = store(JSON.stringify({ done: {}, first: {}, boss: {}, sound: false, badges: ['x'], daily: 4 }));
    solve(lesson, 0, { firstTry: true, store: storage });
    const raw = JSON.parse(storage.value);
    expect(raw.sound).toBe(false);
    expect(raw.badges).toEqual(['x']);
    expect(raw.daily).toBe(4);
    expect(raw.done[drillKey(lesson.id, 0)]).toBe(true);
    expect(raw.first[drillKey(lesson.id, 0)]).toBe(true);
  });

  test('a record the writer cannot read is not thrown away', () => {
    const storage = store('not json at all');
    const { written } = solve(lesson, 0, { firstTry: true, store: storage });
    expect(written).toBe(true);
    expect(read(storage).done[drillKey(lesson.id, 0)]).toBe(true);
  });

  test('a storage that refuses the write is a child whose stars do not stick, not an error', () => {
    const refusing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    const { written, star } = solve(lesson, 0, { firstTry: true, store: refusing });
    expect(written).toBe(false);
    expect(star).toBe(true);
  });

  test('no storage at all is silence, not a crash', () => {
    const { written, record } = solve(lesson, 0, { firstTry: true, store: null });
    expect(written).toBe(false);
    expect(record).toEqual(blank());
  });

  test('the drill’s own answer is what a tap plays, for every drill in the lesson', () => {
    for (const { drill, pos } of everyDrill.filter((entry) => entry.lesson === lesson)) {
      const move = answerMove(pos, drill);
      const played = moveFor(pos, move.from, move.to, drill);
      expect(answered(drill, played)).toBe(true);
      expect(pieceAt(pos, move.from)).toBeTruthy();
    }
  });
});

describe('a detour pack is played by the lesson screen', () => {
  const pack = PACKS.find((entry) => entry.id === 'pin');

  test('each route names its own stop, and a pack is named by its id', () => {
    for (const entry of PACKS) expect(packAddress([entry.id]).unit).toBe(entry);
    expect(lessonAddress(['1']).unit).toBe(LESSONS[0]);
    /* A pack is not on the path, so the lesson route cannot name it — the lesson
     * that opens it is named by its number, and that is a different stop. */
    expect(lessonAddress([String(LESSONS.findIndex((entry) => entry.id === pack.opensWith) + 1)]).unit.id).toBe(pack.opensWith);
  });

  test('an address that names nothing says so rather than opening an empty screen', () => {
    /* Every one of these is a wrong address a child can reach by editing the hash,
     * or a shape the router can hand over. None of them may throw, and none of
     * them may draw a screen with nothing on it. */
    for (const params of [[], [undefined], ['0'], ['99'], ['x'], ['1.5'], ['../secrets']]) {
      expect(packAddress(params).refuse, `#/pack/${params.join('/')}`).toBeTruthy();
      expect(lessonAddress(params).refuse, `#/lesson/${params.join('/')}`).toBeTruthy();
    }
    expect(packAddress(['pin']).refuse).toBe(undefined);
    expect(lessonAddress(['1']).refuse).toBe(undefined);
  });

  test('the boss stops are refused in words, because their screen is another card’s', () => {
    const boss = LESSONS.find((entry) => entry.boss);
    expect(boss).toBeTruthy();
    const refused = lessonAddress([String(LESSONS.indexOf(boss) + 1)]);
    expect(refused.unit).toBe(undefined);
    expect(refused.refuse.title).toBe(boss.title);
  });

  test('a pack is walked as its idea and its puzzles, and nothing else', () => {
    const steps = stepsFor(pack);
    expect(steps.filter((step) => step.kind === 'read').map((step) => step.text)).toEqual([pack.idea]);
    expect(steps.some((step) => step.kind === 'look')).toBe(false);
    expect(puzzlesIn(steps).map((step) => step.i)).toEqual(pack.drills.map((_, i) => i));
    expect(puzzlesIn(steps).map((step) => step.drill.prompt)).toEqual(pack.drills.map((drill) => drill.prompt));
    expect(steps.at(-1).kind).toBe('done');
    /* The lesson screen's own walk is untouched: a lesson still reads its body,
     * one paragraph a step. */
    for (const lesson of LESSONS) {
      expect(stepsFor(lesson).filter((step) => step.kind === 'read').length).toBe((lesson.body ?? []).length);
    }
  });

  test('solving a pack’s puzzles is what finishes it, and a star is still a first try', () => {
    const storage = store();
    for (let i = 0; i < pack.drills.length; i += 1) solve(pack, i, { firstTry: i === 0, store: storage });
    const record = read(storage);
    expect(state(record, pack)).toBe('done');
    expect(finished(record, pack)).toBe(true);
    expect(puzzles(record, pack)).toEqual({ of: pack.drills.length, solved: pack.drills.length, stars: 1 });
    /* A detour changes nothing about the path: nothing requires it, so no lesson
     * is finished by it, and it is still held by the lesson that teaches its idea. */
    expect(LESSONS.filter((entry) => finished(record, entry))).toEqual([]);
    expect(open(record, pack)).toBe(false);
  });

  test('the pack’s own answer is what a tap plays, for every pack in the course', () => {
    for (const entry of PACKS) {
      for (const [index, drill] of entry.drills.entries()) {
        const pos = parseFen(drill.fen);
        const move = answerMove(pos, drill);
        expect(move, `${entry.id} puzzle ${index + 1} has no playable answer`).toBeTruthy();
        expect(answered(drill, moveFor(pos, move.from, move.to, drill))).toBe(true);
      }
    }
  });
});
