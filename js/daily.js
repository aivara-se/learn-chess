/* Today's puzzle: one puzzle a day, the same one for everyone, worked out from
 * the date rather than looked up.
 *
 * The app has no server and no account, so there is nowhere to keep "the puzzle
 * of the day" and nothing to fetch it from. It has to be computed: a pure
 * function from a date to a place in the course's list of puzzles. Same date,
 * same puzzle on every device; the next day, a different one; and no seed, no
 * counter and no cookie is needed to make that repeat — the date is the seed.
 *
 * Nothing here reads the clock, the DOM or storage: the caller passes the date
 * in, which is also what makes it checkable without waiting for tomorrow.
 *
 * What it cannot promise: which puzzle a day gets follows the length of the
 * list, so adding a puzzle to the course can change which one a day lands on.
 * The pick is derived and never stored, so it is never wrong — only different.
 */

/* The day as a whole number, counted in the reader's own calendar: 1970-01-01 is
   0, and any two moments on the same local date are that same number. Built from
   `Date.UTC` of the local year, month and day rather than from the clock's UTC
   offset, so a daylight-saving shift cannot move the boundary by an hour and
   hand somebody a different puzzle. */
export function dayNumber(date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

/* The same day as text: 'YYYY-MM-DD', in the reader's own calendar. This is the
   one thing the app stores about the daily — which day's puzzle is finished. */
export function dayStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/* How far to step through the list each day. Stepping by a number that shares no
   factor with the length walks the whole list once before it repeats, and never
   lands twice in a row on the same entry — which a hash of the date cannot
   promise, because two days can hash to the same place. */
function strideFor(count) {
  let step = Math.min(3, count - 1) || 1;
  while (step < count && gcd(step, count) !== 1) step += 1;
  return Math.max(1, step);
}

/* Which entry a day gets, as an index into a list of `count`. -1 for an empty
   list, so a caller with no puzzles gets an answer it can test rather than NaN. */
export function dailyIndex(date, count) {
  const n = Math.floor(count);
  if (!Number.isFinite(n) || n < 1) return -1;
  return (((dayNumber(date) * strideFor(n)) % n) + n) % n;
}

/* The day's entry out of a list of candidates — the same entry however many
   times it is asked for, and a different one tomorrow. */
export function dailyDrill(date, drills) {
  const list = Array.isArray(drills) ? drills : [];
  const i = dailyIndex(date, list.length);
  return i < 0 ? null : list[i];
}
