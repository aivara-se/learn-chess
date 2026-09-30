/* Which stop an address names.
 *
 * Two routes open a stop to play, and they name it differently because the
 * course does: `#/lesson/<n>` uses a lesson's number on the path — the number
 * the map prints on the stop — and `#/pack/<id>` uses a pack's id, because a
 * pack has no place in that order. It is offered *beside* the lesson that
 * teaches its idea rather than on the path itself (`docs/PORT.md`), which is
 * also why it is required by nothing.
 *
 * This module is the whole of that translation, and it is pure — no PixiJS, no
 * DOM, no storage — which is what lets `tests/lesson.test.ts` ask it what a
 * browser is a bad instrument for: that `#/lesson/1` names the first stop, that
 * `#/pack/pin` names the pin pack, and that an address naming nothing answers in
 * words rather than as an empty screen.
 *
 * A refusal is a value and not a throw: the screen draws it as a card with the
 * way back to the path, which is what a wrong address should be.
 */
import { LESSONS, PACKS } from '../data/lessons.js';

const refuse = (title, body) => ({ refuse: { title, body } });

/**
 * `#/lesson/<n>` — the n-th stop on the path, counted the way the path counts
 * them. A boss game is refused here rather than played: it is finished by a game
 * against Pip, and the screen that plays that game is a card of its own, so
 * saying so is the honest answer and drawing a lesson with nothing to do in it
 * is not.
 */
export function lessonAddress(params) {
  const asked = Number(params[0]);
  const lesson = LESSONS[Number.isInteger(asked) ? asked - 1 : -1];
  if (!lesson) {
    return refuse('That lesson is not here.', `The course has ${LESSONS.length} stops, so #/lesson/1 to #/lesson/${LESSONS.length} are the addresses.`);
  }
  if (lesson.boss) {
    return refuse(lesson.title, 'This stop is finished by a game against Pip rather than by puzzles, and the game screen is not built yet.');
  }
  return { unit: lesson };
}

/**
 * `#/pack/<id>` — a detour by its own name. A pack is offered by one lesson and
 * required by nothing, so its id is the only address it could have; the refusal
 * lists the ones that exist, because an id is not a number a child can count to.
 */
export function packAddress(params) {
  const id = params[0];
  const pack = PACKS.find((entry) => entry.id === id);
  if (!pack) {
    const addresses = PACKS.map((entry) => `#/pack/${entry.id}`).join(', ');
    return refuse('That detour is not here.', `The course has ${PACKS.length} detours: ${addresses}.`);
  }
  return { unit: pack };
}
