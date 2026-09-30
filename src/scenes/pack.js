/* The detour packs — `#/pack/<id>`, where a child drills an idea again with the
 * puzzles the path offers beside the lesson that teaches it.
 *
 * There is no drill loop here. A pack is a stop with puzzles, and the screen that
 * plays a stop's puzzles is `src/scenes/lesson.js`; this file is the address and
 * nothing else — it hands that screen a pack instead of a lesson
 * (`src/lesson/address.js`), and the steps, the board, the coach, the star rule
 * and the record it writes are the same ones, because a second loop is what
 * `docs/PORT.md` says a port must never become.
 *
 * The screen module is imported on demand, like every other route: this file is
 * not in `sw.js`'s `SHELL` — the shell is the first frame's closure and the game
 * does not open on a pack — so it is fetched when a pack is first opened and kept
 * from then on. `window.learnChessLesson` is the handle a browser check reads
 * here and on the lesson route alike: it is the same screen under two addresses.
 */
import { scene } from './lesson.js';
import { packAddress } from '../lesson/address.js';

export default scene(packAddress);
