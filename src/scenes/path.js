/* The path — the map a child walks. It is `#/path`, and the screen the game opens
 * on, because it is where a learner starts.
 *
 * The stops, the forks and the legs are the course's `requires` graph drawn: the
 * layout is derived in `src/path/layout.js` and nothing about the order is written
 * down here — a stop cannot be drawn somewhere the course does not open it. What
 * state a stop is in is read from `src/path/progress.js`, and the only two
 * questions this screen asks of it are "is this finished" and "is this open".
 *
 * Three things a reader should know before changing it:
 *
 *   - **The map scrolls and the header does not.** The path is taller than a phone,
 *     and the page itself must not scroll — the canvas is the whole viewport, and
 *     the board screen that follows this one keeps a fixed frame. So the map is one
 *     Pixi container moved by a pointer drag and by the wheel, clamped to what there
 *     is to scroll, and the header is drawn over it on an opaque curtain that also
 *     eats the taps of the stops sliding underneath. docs/DESIGN.md carries the
 *     decision and why it is a drag rather than a native scrollbar.
 *   - **A tap is not a drag.** Pixi fires `pointertap` on whatever the finger lifted
 *     over, however far it travelled, so the gesture sets a `moved` flag past a
 *     threshold and a stop scrolled under a finger never counts as pressed.
 *   - **A locked stop answers.** It opens a sheet naming the lesson that opens it,
 *     and offers the button that walks there when that lesson is playable. A stop
 *     that looks playable and does nothing is the wall the design document forbids.
 *
 * `window.learnChessPath` is the handle a browser check reads, beside the shell's own
 * `window.learnChess` and the kit's `window.learnChessKit`: every stop as it is
 * really drawn, the legs, the scroll, the sheet, and the centre of each stop in the
 * page's own pixels, so a check taps a stop rather than its own guess at the pixels.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, GAP, LIFT, PAD, TAP_FLOOR } from '../ui/theme.js';
import { createChip } from '../ui/chip.js';
import { createPanel } from '../ui/panel.js';
import { loadChrome } from '../ui/assets.js';
import { LESSONS } from '../data/lessons.js';
import * as progress from '../path/progress.js';
import { captionWidth, layout, scrollFor } from '../path/layout.js';
import { createStop } from '../path/stop.js';
import { openSheet } from '../path/sheet.js';

/* Loaded at the top of the module on purpose: the shell imports a scene inside its
 * own try/catch, so a sprite that is not there is a screen the shell knows how to
 * report rather than a promise nobody is holding. */
const SPRITES = await loadChrome();

/* The column the map lives in. Above it the columns and the captions keep their
 * proportions instead of stretching a phone's layout across a laptop, and 520 is the
 * width the old document already capped the board's column at. The stops and the type
 * stay at the sizes the port contract measured — 64 and 48 for a finger, the ramp for
 * the words — at every width: a finger does not get smaller on a laptop. */
const MAP_WIDTH = 520;
const GUTTER = 6;          // between two neighbouring stops' captions
const BELOW = 16;          // the screen's own margin, above and below its chrome
const DRAG = 6;            // how far a finger travels before it is a drag, not a tap
const LEG = 3;             // the route's own line
const THREAD = 2;          // a detour's, which is not a leg of the route

const status = document.getElementById('status');

let view = null;
let wheel = null;

/* The line under a stop's name. A locked stop names the lesson that opens it by its
 * number — the same words for a detour as for a lesson, because a number is the
 * stop's place on the path and every other locked stop says it that way; the sheet a
 * tap opens names it in full. */
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

/* A trail. A leg whose stop has been finished is drawn solid, and a leg not yet
 * walked as a line of dots — the shape carries it and the colour only agrees, so
 * nothing on the map is said by a colour alone. */
function trail(graphics, from, to, { colour, width = LEG, dots = false }) {
  if (!dots) {
    graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width, color: colour, cap: 'round' });
    return;
  }
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.round(span / 9));
  for (let step = 0; step <= steps; step += 1) {
    const at = step / steps;
    graphics.circle(from.x + (to.x - from.x) * at, from.y + (to.y - from.y) * at, Math.max(1, width / 2)).fill(colour);
  }
}

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
  const caption = captionWidth(column);

  const root = new Container();
  root.addChild(new Graphics().rect(0, 0, width, height).fill(COLOUR.ground));

  /* ---- the header: where the child is, and what they have ------------------
   * Drawn after the map so it covers it, on an opaque curtain that is interactive
   * so a stop sliding underneath cannot be tapped through it. */
  const header = new Container();
  const curtain = new Graphics();
  curtain.eventMode = 'static';
  header.addChild(curtain);

  const counts = progress.counts(record);
  const rank = progress.rank(counts.stars);
  const strip = createPanel(header, {
    units: column - 2 * PAD,
    tone: 'action',
    title: `Rank: ${rank.name}`,
    body: rank.next ? `${rank.need} more ${rank.need === 1 ? 'star' : 'stars'} to ${rank.next}` : 'the whole course, every star',
  });
  strip.node.position.set(left + PAD, BELOW);
  const chips = new Container();
  chips.position.set(left + PAD, BELOW + strip.measure().height + LIFT);
  const stars = createChip(chips, { icon: 'star', value: `${counts.stars}`, label: 'first-try' });
  const solved = createChip(chips, { icon: 'tick', value: `${counts.solved}`, label: 'solved' });
  solved.node.position.set(stars.measure().width + GAP, 0);
  header.addChild(chips);
  const headerHeight = chips.position.y + stars.measure().height + BELOW;
  curtain.rect(0, 0, width, headerHeight).fill(COLOUR.ground);
  curtain.hitArea = new Rectangle(0, 0, width, headerHeight);

  /* ---- the map ------------------------------------------------------------- */
  const geometry = layout(column);
  const legend = new Graphics();
  const map = new Container();
  map.addChild(legend);

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
        glyph: spot.kind === 'boss' ? '\u265A' : spot.kind === 'pack' ? '+' : String(LESSONS.indexOf(unit) + 1),
        line: lineFor({ kind: spot.kind, state, puzzles, held: progress.heldBy(record, unit), here: isHere }),
        puzzles,
        here: isHere,
        caption,
        room: column - spot.x,
        panned: () => view.dragged,
        onTap: () => tapStop(context, unit, spot.kind),
      }),
    });
  }
  /* The trails go under the stops: the legend is the first child of the map, so a
   * stop always sits on top of the legs that point at it. */
  for (const leg of geometry.legs) {
    const from = geometry.byId.get(leg.from);
    const to = geometry.byId.get(leg.to);
    if (!from || !to) continue;
    const walked = progress.finished(record, progress.byId.get(leg.from));
    trail(legend, from, to, leg.kind === 'detour'
      ? { colour: walked ? COLOUR.actionRim : COLOUR.mute, width: THREAD, dots: !walked }
      : { colour: walked ? COLOUR.action : COLOUR.mute, dots: !walked });
  }

  root.addChild(map);
  root.addChild(header);

  /* The map's own height: what the layout asks for, or what was really drawn plus a
   * margin — whichever is more, so a longer caption grows the map instead of being
   * cut off by a constant. */
  const drawn = stops.reduce((low, entry) => Math.max(low, entry.spot.y + entry.stop.box.bottom), 0);
  const contentHeight = Math.max(geometry.height, Math.round(drawn + BELOW));
  const top = headerHeight;
  const viewport = Math.max(1, height - top);
  const maxScroll = Math.max(0, contentHeight - viewport);

  return { root, map, stops, geometry, caption, left, column, top, viewport, contentHeight, maxScroll, here: here?.id ?? null, strip, chips: [stars, solved] };
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
      at: { from: view.geometry.byId.get(leg.from), to: view.geometry.byId.get(leg.to) },
    })),
    graph: () => ({ stops: progress.stops.map((stop) => stop.id), legs: view.geometry.legs.map((leg) => `${leg.from}->${leg.to}`) }),
    /* The point of a stop a check should tap: the centre of the circle, in the page's
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
     * and the two chips' own words, so a check does not have to trust a second copy
     * of the numbers the screen passed in. */
    header: () => ({
      rank: view.strip.titleNode?.text ?? '',
      line: view.strip.bodyNode?.text ?? '',
      chips: view.chips.map((chip) => chip.node.children
        .filter((child) => typeof child.text === 'string')
        .map((child) => child.text)),
    }),
    sheet: () => (view.sheet ? view.sheet.state() : null),
    closeSheet: () => { view.sheet?.close(); view.sheet = null; },
    spoken: () => ({ text: status.textContent, hidden: status.hidden }),
    sprites: () => SPRITES.length,
  };
}

function start(context, { scroll = null } = {}) {
  view = { ...build(context), scroll: 0, dragged: false, sheet: null, drag: null };
  context.layer.eventMode = 'static';
  context.layer.hitArea = new Rectangle(0, 0, context.width, context.height);
  context.layer.addChild(view.root);
  applyScroll(scroll ?? (view.here ? scrollFor({ stops: view.geometry.stops, viewport: view.viewport, scroll: view.maxScroll, id: view.here }) : 0));

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
  mount(context) {
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
