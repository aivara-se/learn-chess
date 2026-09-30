/* The path — the map a child walks. It is `#/path`, and the screen the game opens
 * on, because it is where a learner starts.
 *
 * The stops, the forks and the legs are the course's `requires` graph drawn: the
 * layout is derived in `src/path/layout.js` and nothing about the order is written
 * down here — a stop cannot be drawn somewhere the course does not open it. What
 * state a stop is in is read from `src/path/progress.js`, and the only two questions
 * this screen asks of it are "is this finished" and "is this open".
 *
 * The world around the stops is the operator's own painting (`assets/map/world.png`),
 * drawn by `src/map/terrain.js` at a cover fit, with the art's route beads, the
 * marker set, the star banner and the dark edges composed over it in the one order
 * that works — ground, then route, then the stops that stand on both, then the edges,
 * then the banner over everything. Nothing about the course, the unlock rules or the
 * numbers is theirs; they draw what the layout and the record say.
 *
 * Four things a reader should know before changing it:
 *
 *   - **The world is wider than the window, and that is the pan.** The painting is
 *     2.353:1 and no phone is, so the cover fit leaves the world wider than the pane
 *     at every window shape (measured in `src/map/terrain.js`). The map is one Pixi
 *     container moved by a pointer drag and by the wheel, clamped to what there is to
 *     pan in each direction, and the course is read left to right across it — the
 *     vertical behaviour this replaces, turned through 90°. The page itself must not
 *     scroll: the canvas is the whole viewport and the board screen that follows this
 *     one keeps a fixed frame. docs/DESIGN.md carries the decision and why it is a
 *     drag rather than a native scrollbar.
 *   - **The chrome over the painting is the minimum.** The star counter is the art's
 *     own banner, at the top-right where the reference keeps it, and it counts both
 *     numbers from `src/path/progress.js`. The rank strip and the puzzle chip are not
 *     on this screen: the header the port drew is gone with the column it was sized
 *     for, and every word the map adds is a word written over the painting.
 *   - **A tap is not a drag.** Pixi fires `pointertap` on whatever the finger lifted
 *     over, however far it travelled, so the gesture sets a `moved` flag past a
 *     threshold and a stop panned under a finger never counts as pressed — and a
 *     locked stop still opens the sheet that names its opener and walks there.
 *   - **The arrow on the stop the child is on is the only thing that moves**, and it
 *     stops under `prefers-reduced-motion: reduce`.
 *
 * `window.learnChessPath` is the handle a browser check reads, beside the shell's
 * own `window.learnChess` and the kit's `window.learnChessKit`: every stop as it is
 * really drawn with the box it really took, the legs, the beads, the painting's
 * drawn size next to the window's, the pan, the sheet, and the centre of each stop in
 * the page's own pixels, so a check taps a stop rather than its own guess at them.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { TAP_FLOOR, animates, PAD } from '../ui/theme.js';
import { loadChrome, loadMap } from '../ui/assets.js';
import { LESSONS } from '../data/lessons.js';
import * as progress from '../path/progress.js';
import { layout, panFor } from '../path/layout.js';
import { createStop } from '../path/stop.js';
import { openSheet } from '../path/sheet.js';
import { coverFit, createTerrain, panRange } from '../map/terrain.js';
import { drawRoute } from '../map/route.js';
import { createBanner } from '../map/banner.js';
import { createEdges } from '../map/edges.js';

/* Loaded at the top of the module on purpose: the shell imports a scene inside its
 * own try/catch, so a sprite that is not there is a screen the shell knows how to
 * report rather than a promise nobody is holding. The map's art is loaded here and
 * not with the chrome because the chrome is fifteen small files every screen wants
 * and the map is the painting only this screen draws. */
const SPRITES = await loadChrome();
const MAP_SPRITES = await loadMap();

const BELOW = 16;          // the screen's own margin, from the window's edges
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

  const root = new Container();
  /* Under everything, and never seen: the painting covers the window, and this is
   * only what shows if a rounding ever leaves a pixel of the window uncovered. */
  root.addChild(new Graphics().rect(0, 0, width, height).fill(0x1d222b));

  /* ---- the world: the painting, the route and the stops that stand on both ----- */
  const fit = coverFit({ width, height });
  const range = panRange({ width, height }, fit);
  const geometry = layout(fit.scale);
  const world = new Container();
  const terrain = createTerrain(world, { fit });

  const here = progress.here(record);
  const stops = [];
  for (const spot of geometry.stops) {
    const unit = progress.byId.get(spot.id);
    const state = progress.state(record, unit);
    const puzzles = progress.puzzles(record, unit);
    const isHere = !!here && here.id === spot.id;
    stops.push({
      spot,
      stop: createStop(world, {
        stop: spot,
        state,
        glyph: glyphFor(spot, unit),
        line: lineFor({ kind: spot.kind, state, puzzles, held: progress.heldBy(record, unit), here: isHere }),
        puzzles,
        here: isHere,
        caption: spot.caption,
        side: spot.side,
        room: fit.width - spot.x,
        panned: () => view.dragged,
        onTap: () => tapStop(context, unit, spot.kind),
      }),
    });
  }
  const byId = new Map(stops.map((entry) => [entry.spot.id, entry.spot]));

  /* The route goes over the ground and under the stops: a bead is never drawn on
   * top of the marker it runs into. */
  const route = drawRoute(world, {
    legs: geometry.legs,
    byId,
    walked: (id) => progress.finished(record, progress.byId.get(id)),
  });

  root.addChild(world);

  /* The edges are the last thing over the world and the first thing under the
   * banner: they belong to the window the child is looking at, not to the painting
   * that pans beneath them. */
  const edges = createEdges(root, { left: 0, width, height });

  /* ---- the banner: what the child has earned, in the art's own plate ----------
   * The only chrome this screen has left. It is a readout and not a control, so it
   * does not eat a tap — and nothing stands under it: the road runs down the middle
   * of the painting and the banner hangs in the sky. */
  const counts = progress.counts(record);
  const bannerWidth = Math.min(BANNER_MAX, width - 2 * PAD);
  const banner = createBanner(root, {
    x: width - PAD - bannerWidth,
    y: BELOW,
    width: bannerWidth,
    stars: counts.stars,
    of: counts.of,
  });

  const arrow = stops.find((entry) => entry.stop.arrow) ?? null;
  return {
    root, world, terrain, stops, byId, geometry, banner, edges, arrow, route,
    fit, range, pan: { x: 0, y: 0 },
    here: here?.id ?? null,
    sheet: null,
  };
}

function applyPan(next) {
  view.pan.x = Math.max(0, Math.min(view.range.x, Math.round(next.x)));
  view.pan.y = Math.max(0, Math.min(view.range.y, Math.round(next.y)));
  view.world.position.set(-view.pan.x, -view.pan.y);
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

function handle(context) {
  const window_ = { width: context.width, height: context.height };
  return {
    /* Every stop as it is really drawn, in the world's own coordinates and in the
     * page's: a check compares `content` with the geometry, asks whether each point
     * is on the road, and holds the boxes apart. */
    stops: () => view.stops.map(({ spot, stop }) => ({
      id: spot.id,
      kind: spot.kind,
      depth: spot.depth,
      state: stop.state,
      title: stop.title,
      line: stop.line,
      stars: stop.stars,
      side: spot.side,
      off: spot.off,
      here: spot.id === view.here,
      floor: TAP_FLOOR,
      content: {
        x: spot.x,
        y: spot.y,
        onRoad: spot.onRoad,
        top: spot.y + stop.box.top,
        bottom: spot.y + stop.box.bottom,
        left: spot.x + stop.box.left,
        right: spot.x + stop.box.right,
      },
      page: { x: spot.x - view.pan.x, y: spot.y - view.pan.y },
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
      x: spot.x - view.pan.x,
      y: spot.y - view.pan.y,
      width: stop.measure().width,
      height: stop.measure().height,
    })),
    here: () => view.here,
    /* The pan, and the two sizes a check needs to hold the fit to the window: the
     * painting as it is drawn and the window it is drawn over. A cover means the
     * drawn box is at least the window in both directions, and the labels mean the
     * world is wider than the pane — which is what makes the pan worth having. */
    pan: () => ({ x: view.pan.x, y: view.pan.y }),
    panTo: (x) => applyPan({ x, y: view.pan.y }),
    maxPan: () => ({ x: view.range.x, y: view.range.y }),
    world: () => ({
      scale: view.fit.scale,
      drawn: view.fit,
      window: window_,
      pan: { x: view.pan.x, y: view.pan.y },
      maxPan: { x: view.range.x, y: view.range.y },
    }),
    counts: () => progress.counts(progress.read()),
    /* The art, as it was really drawn: the painting's own box, the beads and how many
     * of them are on a walked leg, the marker a stop wears, the banner's own reading
     * and where the arrow sits. Everything here is measured off the nodes, so a check
     * can hold the screen to the card without reading it. */
    art: () => ({
      painting: view.terrain.drawn,
      scale: view.fit.scale,
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

function start(context, { pan = null } = {}) {
  view = { ...build(context), dragged: false, drag: null };
  context.layer.eventMode = 'static';
  context.layer.hitArea = new Rectangle(0, 0, context.width, context.height);
  context.layer.addChild(view.root);
  applyPan(pan ?? { x: view.here ? panFor({ stops: view.stops.map((entry) => entry.spot), width: context.width, max: view.range.x, id: view.here }) : 0, y: 0 });

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

  /* One gesture, one owner: the pointer moves the world, and the stops read `dragged`
   * to tell a lift from a tap. Both axes move, but only one of them has anywhere to
   * go: the cover leaves the painting taller than the window only when the window is
   * wider than 2.353:1, and the pan is clamped to whatever that leaves. */
  const down = (event) => {
    if (view.sheet) return;
    view.drag = { at: { x: event.global.x, y: event.global.y }, from: { x: view.pan.x, y: view.pan.y } };
    view.dragged = false;
  };
  const move = (event) => {
    if (!view.drag) return;
    const dx = event.global.x - view.drag.at.x;
    const dy = event.global.y - view.drag.at.y;
    if (Math.abs(dx) > DRAG || Math.abs(dy) > DRAG) view.dragged = true;
    if (view.dragged) applyPan({ x: view.drag.from.x - dx, y: view.drag.from.y - dy });
  };
  const up = () => { view.drag = null; };
  context.layer.on('pointerdown', down);
  context.layer.on('pointermove', move);
  context.layer.on('pointerup', up);
  context.layer.on('pointerupoutside', up);

  /* The wheel is a native listener rather than a Pixi one: the canvas carries
   * `touch-action: none` and the page must not scroll behind the game, so the event
   * has to be taken before the browser acts on it. A wheel moves the world the way
   * the course is read — sideways — and a device that sends its scroll as `deltaY`
   * is what this and every other horizontal map has to answer. */
  wheel = (event) => {
    if (view.sheet) return;
    event.preventDefault();
    applyPan({ x: view.pan.x + (event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY), y: view.pan.y });
  };
  context.app.canvas.addEventListener('wheel', wheel, { passive: false });
  window.learnChessPath = handle(context);
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

  /* A new size is a new cover: the world is drawn at a different scale, every stop
   * moves, and the captions are measured against a different painting, so the screen
   * is rebuilt — and the child's place in the world is kept where it can be rather
   * than reset under them, by keeping the stop they were looking at in the middle of
   * the window. */
  resize(context) {
    const pan = view ? { ...view.pan } : null;
    window.learnChessPath = null;
    stopScene(context);
    start(context, { pan: pan ?? { x: 0, y: 0 } });
  },

  /* The shell destroys the layer after this runs; the handle goes with the screen, so
   * a late check cannot read a destroyed one. */
  unmount(context) {
    stopScene(context);
    announce('');
  },
};
