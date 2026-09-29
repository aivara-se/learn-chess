/* A lesson's own shape: the steps it is walked in, and where the path goes when
 * it is finished.
 *
 * A lesson is data (`src/data/lessons.js`): a title, a goal, the paragraphs to
 * read, a diagram to look at, and the puzzles to play. The screen walks that as
 * a list of steps — one paragraph is one step, so a child is never asked to read
 * a wall of text on a phone — and this file is the whole of that translation.
 *
 * It is here rather than in the screen because it is pure: `stepsFor` takes a
 * lesson and returns a list, with no PixiJS, no DOM and no storage in sight, so
 * `tests/lesson.test.ts` can hold it still without a browser. The two questions
 * about the path — what finishing this lesson opens, and where a learner goes
 * next — are here for the same reason: both are read off the course's `requires`
 * graph, and neither may be answered from a hand-written table.
 *
 * `openedBy` and `nextStop` read `src/path/progress.js` rather than re-deriving
 * what "finished" means: the map and the lesson screen have to agree on that,
 * and one definition is the only way they can.
 */
import { LESSONS } from '../data/lessons.js';
import { byId, finished, open } from '../path/progress.js';

/**
 * The steps a lesson is walked in, in order:
 *
 *   read   one paragraph of `body`, in the course's own words
 *   look   the diagram, when the lesson has one
 *   drill  one puzzle of `drills`, played on the board
 *   done   the completion panel, which is where the lesson ends
 *
 * A boss stop is a lesson without puzzles and without a diagram — it is finished
 * by a game — so its steps are its paragraphs and the panel. That shape is not
 * something this screen plays; the screen says so rather than drawing a lesson
 * with nothing to do in it.
 */
export function stepsFor(lesson) {
  const steps = (lesson.body ?? []).map((text, i) => ({ kind: 'read', text, i }));
  if (lesson.diagram) steps.push({ kind: 'look' });
  (lesson.drills ?? []).forEach((drill, i) => steps.push({ kind: 'drill', drill, i }));
  steps.push({ kind: 'done' });
  return steps;
}

/** The puzzle steps of a lesson, in order — the `drill` steps and nothing else. */
export const puzzlesIn = (steps) => steps.filter((step) => step.kind === 'drill');

/** How many stops of the course are lessons a learner reads and plays: every
 *  stop except the boss games, which are won rather than read. */
export const lessonStops = LESSONS.filter((lesson) => !lesson.boss);

/** Where a lesson stands in the course, 1-based — the number the path prints on
 *  a stop and the one a route carries. `-1` when it is not a stop at all. */
export const numberOf = (lesson) => LESSONS.indexOf(lesson) + 1;

/**
 * What finishing this lesson opens: a stop whose every requirement is now
 * finished, and one of whose requirements is this lesson. Ported from `v1`'s
 * `openedBy`, which is the same question asked of the same graph.
 */
export const openedBy = (record, lesson) =>
  LESSONS.filter((stop) => (stop.requires ?? []).includes(lesson.id)
    && (stop.requires ?? []).every((id) => finished(record, byId.get(id))));

/**
 * Where a learner is sent next: the first lesson that is open and not finished
 * — the same stop the map marks "you are here". `src/path/progress.js` owns
 * that answer; a boss stop is filtered out because finishing one is a game, and
 * the game screen is not this screen's to open.
 */
export function nextStop(record) {
  return lessonStops.find((lesson) => open(record, lesson) && !finished(record, lesson)) ?? null;
}
