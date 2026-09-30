/* The path — the map a child walks. It is `#/path`, and the screen the game opens
 * on, because it is where a learner starts.
 *
 * The stops, the forks and the legs are the course's `requires` graph drawn: the
 * layout is derived in `src/path/layout.js` and nothing about the order is written
 * down here — a stop cannot be drawn somewhere the course does not open it. What
 * state a stop is in is read from `src/path/progress.js`, and the only two
 * questions this screen asks of it are "is this finished" and "is this open".
 *
 * What is new since the port is the world around them: `src/map/**` draws the art
 * card's painting under the map, its route as a trail of beads, the marker set, the
 * star banner and the dark edges, and this file composes them in the one order that
 * works — ground, then route, then the stops that stand on both, then the edges,
 * then the header over everything. Nothing about the course, the unlock rules or
 * the numbers is theirs; they draw what the layout and the record say.
 *
 * Four things a reader should know before changing it:
 *
 *   - **The map scrolls and the header does not.** The path is taller than a phone,
 *     and the page itself must not scroll — the canvas is the whole viewport, and
 *     the board screen that follows this one keeps a fixed frame. So the map is one
 *     Pixi container moved by a pointer drag and by the wheel, clamped to what there
 *     is to scroll, and the header is drawn over it on an opaque curtain that also
 *     eats the taps of the stops sliding underneath. docs/DESIGN.md carries the
 *     decision and why it is a drag rather than a native scrollbar.
 *   - **The world is 520 wide and the window may be narrower.** The column is
 *     `min(window, 520)` and the painting is drawn at the column's width with the
 *     rows left at the height the art was painted against, so a phone gets the whole
 *     world a little narrower rather than a crop of it. Why, and what it costs, is
 *     in `src/map/terrain.js` and on the card's pull request.
 *   - **The star counter is on the map's own banner**, at the top-right where the
 *     reference keeps it, and it counts both numbers from `src/path/progress.js`.
 *   - **A tap is not a drag.** Pixi fires `pointertap` on whatever the finger lifted
 *     over, however far it travelled, so the gesture sets a `moved` flag past a
 *     threshold and a stop scrolled under a finger never counts as pressed — and a
 *     locked stop still opens the sheet that names its opener and walks there.
 *
 * `window.learnChessPath` is the handle a browser check reads, beside the shell's
 * own `window.learnChess` and the kit's `window.learnChessKit`: every stop as it is
 * really drawn, the legs, the beads, the bands and the banner, the scroll, the
 * sheet, and the centre of each stop in the page's own pixels, so a check taps a
 * stop rather than its own guess at the pixels.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, LIFT, PAD, TAP_FLOOR, animates } from '../ui/theme.js';
import { createChip } from '../ui/chip.js';
import { createPanel } from '../ui/panel.js';
import { loadChrome, loadMap } from '../ui/assets.js';
import { LESSONS } from '../data/lessons.js';
import * as progress from '../path/progress.js';
import { layout, scrollFor } from '../path/layout.js';
import { place } from '../path/place.js';
import { createStop } from '../path/stop.js';
import { openSheet } from '../path/sheet.js';
import { bandAt, createTerrain } from '../map/terrain.js';
import { FOOTING } from '../path/layout.js';
import { drawRoute } from '../map/route.js';
import { createBanner } from '../map/banner.js';
import { createEdges } from '../map/edges.js';

/* Loaded at the top of the module on purpose: the shell imports a scene inside its
 * own try/catch, so a sprite that is not there is a screen the shell knows how to
 * report rather than a promise nobody is holding. The map's art is loaded here and
 * not with the chrome because the chrome is fifteen small files every screen wants
 * and the map is 336KB only this screen draws. */
const SPRITES = await loadChrome();
const MAP_SPRITES = await loadMap();

/* The column the map lives in. Above it the columns and the captions keep their
 * proportions instead of stretching a phone's layout across a laptop, and 520 is the
 * width the old document already capped the board's column at — and the width the
 * art card painted its world at. The stops and the type stay at the sizes the port
 * contract measured — 64 and 48 for a finger, the ramp for the words — at every
 * width: a finger does not get smaller on a laptop. */
const MAP_WIDTH = 520;
const BELOW = 16;          // the screen's own margin, above and below its chrome
const DRAG = 6;            // how far a finger travels before it is a drag, not a tap
const BANNER_MAX = 360;    // the banner's own width, the size the art drew it for

const status = document.getElementById('status');

let view = null;
let wheel = null;
let bob = null;

/* The line under a stop's name. A locked stop names the lesson that opens it by its
 * number — the same words for a detour as for a lesson, because a number is the
 * stop's place on the path and every other locked stop says it that way; the sheet a
 * tap opens names it in full, and the open stop wears its number on the map so the
 * two agree. */
function lineFor({ kind, state, puzzles, held, here }) {
  if (here) return 'you are here';
  if (state === 'locked') return `after lesson ${LESSONS.indexOf(progress.byId.get(held)) + 1}`;
  if (kind === 'boss') return state === 'done' ? 'beaten' : 'beat Pip';
  if (kind === 'pack') {
    if (state === 'done') {
      return puzzles.stars === puzzles.of ? 'optional \u00b7 all first time' : `optional \u00b7 ${puzzles.stars} of ${puzzles.of} stars`;
    }
    return `optional \u00b7 ${puzzles.of} puzzles`;
  }
  if (state === 'done') {
    return puzzles.stars === puzzles.of ? 'all first time' : `${puzzles.stars} of ${puzzles.of} stars`;
  }
  /* Both numbers stay apart, and a stop that has been started says how far: a puzzle
   * solved with a hint is not a star, so "solved" and "stars" are different lines. */
  return puzzles.solved === 0 ? `${puzzles.of} puzzles` : `${puzzles.solved} of ${puzzles.of} puzzles`;
}

/* The glyph a stop's face wears: the lesson's number, and nothing for a boss or a
 * detour, whose own art says what they are — the crest and the medallion. */
const glyphFor = (spot, unit) => (spot.kind === 'lesson' ? String(LESSONS.indexOf(unit) + 1) : '');

/* What a tap on a locked stop answers with: which lesson opens it, and the way there
 * when that lesson is playable. */
function answer(context, unit, kind, record) {
  const held = progress.heldBy(record, unit);
  const lesson = progress.byId.get(held);
  const puzzles = progress.puzzles(record, unit);
  const playable = lesson ? progress.open(record, lesson) : false;
  const solvedAhead = kind === 'pack' && progress.finished(record, unit);
  return openSheet(view.root, {
    width: context.width,
    height: context.height,
    icon: 'lock',
    title: 'Not open yet',
    text: solvedAhead
      ? `All ${puzzles.of} puzzles are solved — this detour opens on the path once you finish “${lesson.title}”.`
      : `Finish “${lesson.title}” first — then “${unit.title}” opens.`,
    action: playable ? `Go to ${lesson.title}` : 'Got it',
    cancel: 'Not now',
    onAction: playable ? () => { location.hash = `#/lesson/${LESSONS.indexOf(lesson) + 1}`; } : undefined,
    /* Closing the sheet ends the announcement it was answering: the words on the
     * sheet are for as long as the sheet is there. */
    onClosed: () => { view.sheet = null; announce(''); },
  });
}

function announce(line) {
  status.textContent = line;
  status.hidden = !line;
}

function build(context) {
  const record = progress.read();
  const width = context.width;
  const height = context.height;
  const column = Math.min(width, MAP_WIDTH);
  const left = Math.round((width - column) / 2);

  const root = new Container();
  root.addChild(new Graphics().rect(0, 0, width, height).fill(COLOUR.ground));

  /* ---- the header: where the child is, and what they have ------------------
   * Drawn after the map so it covers it, on an opaque curtain that is interactive
   * so a stop sliding underneath cannot be tapped through it. The star counter is
   * the art card's banner, at the top-right of the map where the reference keeps
   * its own; the rank and the puzzles solved stay the kit's, under it. */
  const header = new Container();
  const curtain = new Graphics();
  curtain.eventMode = 'static';
  header.addChild(curtain);

  const counts = progress.counts(record);
  const rank = progress.rank(counts.stars);
  const banner = createBanner(header, {
    x: left + column - PAD - Math.min(BANNER_MAX, column - 2 * PAD),
    y: BELOW,
    width: Math.min(BANNER_MAX, column - 2 * PAD),
    stars: counts.stars,
    of: counts.of,
  });
  const strip = createPanel(header, {
    units: column - 2 * PAD,
    tone: 'action',
    title: `Rank: ${rank.name}`,
    body: rank.next ? `${rank.need} more ${rank.need === 1 ? 'star' : 'stars'} to ${rank.next}` : 'the whole course, every star',
  });
  strip.node.position.set(left + PAD, BELOW + banner.height + LIFT);
  const chips = new Container();
  chips.position.set(left + PAD, strip.node.position.y + strip.measure().height + LIFT);
  const solved = createChip(chips, { icon: 'tick', value: `${counts.solved}`, label: 'solved' });
  header.addChild(chips);
  const headerHeight = chips.position.y + solved.measure().height + BELOW;
  curtain.rect(0, 0, width, headerHeight).fill(COLOUR.ground);
  curtain.hitArea = new Rectangle(0, 0, width, headerHeight);

  /* ---- the map ------------------------------------------------------------- */
  const geometry = layout(column);
  const map = new Container();
  const terrain = createTerrain(map, { width: column });

  const here = progress.here(record);
  const stops = [];
  for (const spot of geometry.stops) {
    const unit = progress.byId.get(spot.id);
    const state = progress.state(record, unit);
    const puzzles = progress.puzzles(record, unit);
    const isHere = !!here && here.id === spot.id;
    stops.push({
      spot,
      stop: createStop(map, {
        stop: spot,
        state,
        glyph: glyphFor(spot, unit),
        line: lineFor({ kind: spot.kind, state, puzzles, held: progress.heldBy(record, unit), here: isHere }),
        puzzles,
        here: isHere,
        caption: spot.caption,
        room: column - spot.x,
        panned: () => view.dragged,
        onTap: () => tapStop(context, unit, spot.kind),
      }),
    });
  }
  /* The words under a stop need more room than a 152px row leaves them, so the rows
   * are placed before the route is drawn: a row starts where the grid puts it and
   * moves later only as far as the boxes really drawn in the rows above demand,
   * inside the band its depth stands in, and no further. The distance is set by the
   * boxes the rows above really drew, not by a fraction of the row: a half-row clamp
   * would put the caption's own bottom into the marker below it, which is the overlap
   * this change removes.
   * `src/path/place.js` is the rule; the numbers it works on are the boxes
   * `src/path/stop.js` measured while drawing, so the check is against what a child
   * sees and not against a second copy of the geometry. */
  const rows = [...new Set(geometry.stops.map((spot) => spot.depth))].map((depth) => {
    const nominal = geometry.stops.find((spot) => spot.depth === depth).y;
    const band = bandAt(nominal);
    return { depth, nominal, max: band.y + band.height - 1 };
  });
  const placed = place({
    rows,
    boxes: stops.map(({ spot, stop }) => ({ row: spot.depth, x: spot.x, ...stop.box })),
    /* The words under the last stop may run past the painting's own ground by the
     * footing the layout already keeps below the last row: the map grows to hold them,
     * and below the painting's last pixel what shows is the screen's own ground colour
     * under the vignette, not the ash. */
    ground: terrain.height + FOOTING,
  });
  /* The other half of `place`'s contract, and the reason it returns `problems`: a row
   * whose words need more room than its band leaves is clamped to the band and named
   * here, never hidden. Nothing on this screen can open a band — that is the course's
   * depth and the painting's own regions — so a course that no longer fits is a fact
   * about that course, and the console is the one place it can be read. The real course
   * places cleanly (`tests/place.test.ts` holds the drawn boxes to it), so this is the
   * alarm for the day a lesson's caption stops fitting, not a path a child walks. */
  if (placed.problems.length) console.warn('the map could not place every row inside its band:', placed.problems.join('; '));
  for (const entry of stops) {
    const y = placed.y.get(entry.spot.depth);
    if (y === undefined || y === entry.spot.y) continue;
    entry.spot = { ...entry.spot, y };
    entry.stop.node.position.y = y;
  }
  const byId = new Map(stops.map((entry) => [entry.spot.id, entry.spot]));

  /* The route goes over the ground and under the stops: a bead is never drawn on
   * top of the marker it runs into. */
  const route = drawRoute(map, {
    legs: geometry.legs,
    byId,
    walked: (id) => progress.finished(record, progress.byId.get(id)),
  });

  root.addChild(map);
  /* The edges are the last thing over the map and the first thing under the
   * header: they belong to the screen the child is looking at, not to the map that
   * scrolls beneath it. */
  const edges = createEdges(root, { left, width: column, height });
  root.addChild(header);

  /* The map's own height: what the layout asks for, what was really drawn plus a
   * margin, or the painting's own height — whichever is most, so a longer caption
   * grows the map instead of being cut off by a constant, and the ground is never
   * short of the last thing drawn on it. */
  const drawn = stops.reduce((low, entry) => Math.max(low, entry.spot.y + entry.stop.box.bottom), 0);
  const contentHeight = Math.max(geometry.height, Math.round(drawn + BELOW), terrain.height);
  const top = headerHeight;
  const viewport = Math.max(1, height - top);
  const maxScroll = Math.max(0, contentHeight - viewport);

  const arrow = stops.find((entry) => entry.stop.arrow) ?? null;
  return { root, map, stops, byId, geometry, left, column, top, viewport, contentHeight, maxScroll, here: here?.id ?? null, strip, chips: [solved], terrain, route, banner, edges, arrow };
}

function applyScroll(next) {
  view.scroll = Math.max(0, Math.min(view.maxScroll, Math.round(next)));
  view.map.position.set(view.left, view.top - view.scroll);
}

function tapStop(context, unit, kind) {
  const record = progress.read();
  const entry = view.stops.find((pair) => pair.spot.id === unit.id);
  /* The canvas is one node to a screen reader, so a stop names itself through the
   * shell's live region as it is tapped — the same sentence, whoever reads it. */
  announce(entry ? entry.stop.spoken() : unit.title);
  /* A stop that is not open answers instead of going anywhere — including a detour
   * whose puzzles were solved before the path offered it, which wears its tick and
   * still cannot be walked into. */
  if (!progress.open(record, unit)) {
    view.sheet = answer(context, unit, kind, record);
    return;
  }
  announce('');
  location.hash = kind === 'pack' ? `#/pack/${unit.id}` : `#/lesson/${LESSONS.indexOf(unit) + 1}`;
}

function handle() {
  return {
    /* Every stop as it is really drawn, in the map's own coordinates and in the
     * page's: a check compares `content` with the geometry, and the caption's bottom
     * edge with the map's height. */
    stops: () => view.stops.map(({ spot, stop }) => ({
      id: spot.id,
      kind: spot.kind,
      depth: spot.depth,
      state: stop.state,
      title: stop.title,
      line: stop.line,
      stars: stop.stars,
      here: spot.id === view.here,
      floor: TAP_FLOOR,
      content: {
        x: spot.x,
        y: spot.y,
        top: spot.y + stop.box.top,
        bottom: spot.y + stop.box.bottom,
        left: spot.x + stop.box.left,
        right: spot.x + stop.box.right,
      },
      page: { x: Math.round(view.left + spot.x), y: Math.round(view.top - view.scroll + spot.y) },
    })),
    legs: () => view.geometry.legs.map((leg) => ({
      kind: leg.kind,
      from: leg.from,
      to: leg.to,
      at: { from: view.byId.get(leg.from), to: view.byId.get(leg.to) },
    })),
    graph: () => ({ stops: progress.stops.map((stop) => stop.id), legs: view.geometry.legs.map((leg) => `${leg.from}->${leg.to}`) }),
    /* The point of a stop a check should tap: the centre of the marker, in the page's
     * own pixels, so the check taps the stop rather than a guess at the pixels. */
    points: () => view.stops.map(({ spot, stop }) => ({
      id: spot.id,
      x: Math.round(view.left + spot.x),
      y: Math.round(view.top - view.scroll + spot.y),
      width: stop.measure().width,
      height: stop.measure().height,
    })),
    here: () => view.here,
    scroll: () => view.scroll,
    scrollTo: (y) => applyScroll(y),
    maxScroll: () => view.maxScroll,
    contentHeight: () => view.contentHeight,
    viewport: () => view.viewport,
    map: () => ({ left: view.left, top: view.top, width: view.column, height: view.viewport }),
    rank: () => progress.rank(progress.counts(progress.read()).stars),
    counts: () => progress.counts(progress.read()),
    /* What the header really says, read off the nodes that were drawn: the rank line
     * and the chip's own words, so a check does not have to trust a second copy of
     * the numbers the screen passed in. */
    header: () => ({
      rank: view.strip.titleNode?.text ?? '',
      line: view.strip.bodyNode?.text ?? '',
      chips: view.chips.map((chip) => chip.node.children
        .filter((child) => typeof child.text === 'string')
        .map((child) => child.text)),
    }),
    /* The art, as it was really drawn: the bands and where each one landed, the
     * beads and how many of them are on a walked leg, the marker a stop wears, the
     * banner's own reading and where the arrow sits. Everything here is measured off
     * the nodes, so a check can hold the screen to the card without reading it. */
    art: () => ({
      world: { width: view.column, height: view.terrain.height },
      bands: view.terrain.bands.map((band) => ({ id: band.id, region: band.region, drawn: band.drawn })),
      beads: view.route.beads.length,
      beadsWalked: view.route.beads.filter((bead) => bead.walked).length,
      drawnBeads: view.route.beads.map((bead) => ({ from: bead.from, to: bead.to, walked: bead.walked, x: bead.x, y: bead.y })),
      markers: view.stops.map(({ spot, stop }) => ({ id: spot.id, kind: stop.kind, state: stop.state, glyph: glyphFor(spot, progress.byId.get(spot.id)) })),
      banner: { read: view.banner.read(), x: view.banner.node.x, y: view.banner.node.y, width: view.banner.width, height: view.banner.height, stars: view.banner.stars, of: view.banner.of },
      edges: { depth: view.edges.depth, peak: view.edges.peak },
      arrow: view.arrow ? {
        base: view.arrow.base,
        y: Math.round(view.arrow.stop.arrow.position.y),
        height: view.arrow.stop.arrow.height,
        animates: !!bob,
      } : null,
      sprites: { chrome: SPRITES.length, map: MAP_SPRITES.length },
    }),
    sheet: () => (view.sheet ? view.sheet.state() : null),
    closeSheet: () => { view.sheet?.close(); view.sheet = null; },
    spoken: () => ({ text: status.textContent, hidden: status.hidden }),
    sprites: () => SPRITES.length + MAP_SPRITES.length,
  };
}

function start(context, { scroll = null } = {}) {
  view = { ...build(context), scroll: 0, dragged: false, sheet: null, drag: null };
  context.layer.eventMode = 'static';
  context.layer.hitArea = new Rectangle(0, 0, context.width, context.height);
  context.layer.addChild(view.root);
  applyScroll(scroll ?? (view.here ? scrollFor({ stops: view.stops.map((entry) => entry.spot), viewport: view.viewport, scroll: view.maxScroll, id: view.here }) : 0));

  /* The one thing on the map that moves: the arrow over the stop the child is on.
   * It hovers, and it stops hovering the moment the device asks for less motion —
   * the repository's standing rule, and the arrow is the only moving part the map
   * has. */
  if (view.arrow) {
    const stop = view.arrow.stop;
    view.arrow.base = stop.arrow.position.y;
    if (animates()) {
      let phase = 0;
      bob = (ticker) => {
        if (view && stop.arrow.destroyed) {
          /* The scene went away under the ticker: a destroyed node has no position
           * to write, and a callback left on the app's ticker would throw on every
           * frame. Nothing outlives the screen, so it lets go of itself here as
           * well as in `stopScene`. */
          context.app.ticker.remove(bob);
          bob = null;
          return;
        }
        phase += ticker.deltaMS / 1000;
        stop.arrow.position.y = view.arrow.base + Math.sin(phase * 3.4) * 3;
      };
      context.app.ticker.add(bob);
    }
  }

  /* One gesture, one owner: the pointer moves the map, and the stops read `dragged`
   * to tell a lift from a tap. */
  const down = (event) => {
    if (view.sheet) return;
    view.drag = { at: event.global.y, from: view.scroll };
    view.dragged = false;
  };
  const move = (event) => {
    if (!view.drag) return;
    const travelled = event.global.y - view.drag.at;
    if (Math.abs(travelled) > DRAG) view.dragged = true;
    if (view.dragged) applyScroll(view.drag.from - travelled);
  };
  const up = () => { view.drag = null; };
  context.layer.on('pointerdown', down);
  context.layer.on('pointermove', move);
  context.layer.on('pointerup', up);
  context.layer.on('pointerupoutside', up);

  /* The wheel is a native listener rather than a Pixi one: the canvas carries
   * `touch-action: none` and the page must not scroll behind the game, so the event
   * has to be taken before the browser acts on it. */
  wheel = (event) => {
    if (view.sheet) return;
    event.preventDefault();
    applyScroll(view.scroll + (event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY));
  };
  context.app.canvas.addEventListener('wheel', wheel, { passive: false });
  window.learnChessPath = handle();
}

function stopScene(context) {
  window.learnChessPath = null;
  view?.sheet?.close();
  if (bob) {
    context.app.ticker.remove(bob);
    bob = null;
  }
  if (wheel) {
    context.app.canvas.removeEventListener('wheel', wheel);
    wheel = null;
  }
  if (view) {
    context.layer.removeChild(view.root);
    view.root.destroy({ children: true });
  }
  view = null;
}

export default {
  /* The shell starts a screen by calling `size()` and then `mount()`, so it is built
   * twice on every open. The resize that runs first is the *new* screen's own, not the
   * old one's: `src/main.js` assigns `scene = screen` (line 123) and only then calls
   * `size()` (line 135), after the previous screen was unmounted. So `resize()` builds
   * once and `mount()` builds again; clearing what `resize()` left is what makes the
   * pair cost one root and one ticker rather than two. The double build itself belongs
   * to the shell — `src/main.js:135-136` — not to this screen. */
  mount(context) {
    stopScene(context);
    start(context);
  },

  /* A new size is a new map: the columns are shares of the width and the captions
   * are measured against them, so the screen is rebuilt — and the child's scroll is
   * kept where it can be rather than reset under them. */
  resize(context) {
    const scroll = view ? view.scroll : null;
    window.learnChessPath = null;
    stopScene(context);
    start(context, { scroll: scroll ?? 0 });
  },

  /* The shell destroys the layer after this runs; the handle goes with the screen, so
   * a late check cannot read a destroyed one. */
  unmount(context) {
    stopScene(context);
    announce('');
  },
};
