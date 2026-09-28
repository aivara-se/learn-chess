/* Learn chess — the badges, and the shelf they sit on.
 *
 * A puzzle rewards the moment: confetti, "Correct!", a star for a first try.
 * A badge is the other half of that — something to show for what a child
 * actually did, kept on this device and never sent anywhere. Every badge is
 * earned once and kept: the record is `localStorage`, under the same key the
 * stars use, so "start over" clears the badges with everything else.
 *
 * A badge is data: `{ id, name, what, of, unit }`. `what` is how a child earns
 * it, in one short line a parent can read over their shoulder; `of` is how many
 * it takes — a number, or a function of the totals the app passes in, because
 * nothing here counts the course; `unit` names what is being counted, for the
 * "three more of those" line.
 *
 * The record holds one number per badge: the best a child has ever got towards
 * it. That one field answers both questions — earned (`number >= of`) and how
 * close (`of - number`) — and because the number only ever grows, the moment it
 * reaches `of` happens once, so a badge cannot be handed out twice and there is
 * no separate "earned" flag to drift out of step with the count.
 *
 * Nothing here touches the DOM or `localStorage`: the book is given the app's
 * own read and write, so the module is a pure rule set that `bun test` can
 * check, and a badge is stored wherever progress is stored.
 */

export const BADGES = [
  { id: 'first-game', name: 'First game', what: 'finish a game against Pip', of: 1, unit: 'games' },
  { id: 'first-win', name: 'First win', what: 'beat Pip at any level', of: 1, unit: 'wins' },
  { id: 'win-level-1', name: 'Level 1 win', what: 'beat Pip when he plays sleepily', of: 1, unit: 'wins' },
  { id: 'win-level-2', name: 'Level 2 win', what: 'beat Pip when he plays like a club beginner', of: 1, unit: 'wins' },
  { id: 'win-level-3', name: 'Level 3 win', what: 'beat Pip when he plays properly', of: 1, unit: 'wins' },
  { id: 'castle', name: 'First castle', what: 'castle in a game', of: 1, unit: 'castles' },
  { id: 'checkmate', name: 'First checkmate', what: 'deliver checkmate', of: 1, unit: 'checkmates' },
  { id: 'streak-5', name: 'Five in a row', what: 'answer five puzzles right first try in a row', of: 5, unit: 'first-try answers in a row' },
  { id: 'all-stars', name: 'Every star', what: 'win every star in the course', of: ({ stars }) => stars, unit: 'stars' },
];

/* How many of a badge it takes. A function of the app's own totals where the
   answer is the size of the course, so no count of it is written down here. */
const targetOf = (badge, totals) => (typeof badge.of === 'function' ? badge.of(totals) : badge.of);

export function createBook({ read, write, badges = BADGES, totals = {} }) {
  /* The numbers a child has got so far, by badge id. */
  const numbers = () => read().badges || {};

  const find = (id) => badges.find((badge) => badge.id === id);

  /* Every badge with what a child has of it, clamped to what it asks for, and
     how much is left. `need` is the only thing the shelf ranks by. */
  const standing = () => badges.map((badge) => {
    const of = targetOf(badge, totals);
    const have = Math.min(of, numbers()[badge.id] || 0);
    return { badge, have, of, need: of - have };
  });

  return {
    /* What a child has of a badge — the best they ever got, 0 if never. */
    value: (id) => numbers()[id] || 0,

    /* Count towards a badge and answer the badge when this is the moment it was
       earned, or null when it was not — not far enough yet, or earned already.
       The record keeps the best number a child reached, so a run that carries on
       past what the badge asks for (a sixth first-try answer) is stored but
       never handed out twice. Only a higher number is worth a write, so an id
       the app names once per puzzle does not rewrite storage on every answer.
       An id no badge carries is a mistake in the calling code and is thrown,
       not swallowed. */
    note(id, value = 1) {
      const badge = find(id);
      if (!badge) throw new Error(`no badge called "${id}"`);
      const before = numbers()[id] || 0;
      if (value <= before) return null;
      const of = targetOf(badge, totals);
      const data = read();
      data.badges = { ...numbers(), [id]: value };
      write(data);
      return before < of && value >= of ? badge : null;
    },

    /* The shelf: what is earned, the one badge nearest to being earned, and the
       rest — earned ones first, fewest left first among the rest, so the line
       under the shelf always names the badge a child is closest to. */
    shelf() {
      const all = standing();
      const earned = all.filter((s) => s.need === 0);
      const left = all.filter((s) => s.need > 0).sort((a, b) => a.need - b.need);
      return { earned, next: left[0] || null, locked: left.slice(1), total: badges.length };
    },
  };
}
