/* The kit, on a page — `#/kit/phone` and `#/kit/desktop`.
 *
 * This is the chrome card's own screen, and it exists so nobody has to guess
 * what a button looks like: every component `src/ui/**` offers is drawn here at
 * the size a screen gets it, and each block prints the measures the components
 * themselves report — the hit area, not the drawing, which is what a finger
 * gets. A route with no frame name picks the phone or the laptop by the window
 * width; `#/kit/phone` and `#/kit/desktop` say which one to draw.
 *
 * Two rules the frame keeps:
 *   - the frame is never scaled up, only down when a window is smaller than it,
 *     so the sizes shown are the sizes the kit really draws; and
 *   - the whole kit fits inside the frame, so the phone frame is a truthful
 *     answer to "does this fit on a 640px screen", not a screenshot of a page
 *     that happens to be cut off.
 *
 * `window.learnChessKit` is the handle a browser check reads, beside the shell's
 * own `window.learnChess`: the frame it drew, every control's measured hit area,
 * the coach's two voices, and whether motion is allowed on this device.
 */
import { Container, Graphics, Rectangle } from '../../vendor/pixi/pixi.min.mjs';
import { COLOUR, GAP, SCALE, TAP_FLOOR, TYPE, animates, text } from '../ui/theme.js';
import { loadChrome } from '../ui/assets.js';
import { createButton } from '../ui/button.js';
import { createChip } from '../ui/chip.js';
import { createPanel } from '../ui/panel.js';
import { createProgress } from '../ui/progress.js';
import { createSpeech } from '../ui/speech.js';

const FRAME = {
  phone: { width: 360, height: 640, scale: SCALE.phone },
  desktop: { width: 1280, height: 800, scale: SCALE.wide },
};

/* Loaded at the top of the module on purpose: the shell imports a scene inside
 * its own try/catch, so a sprite that is not there is a screen the shell knows
 * how to report, on screen and in the console, rather than a promise nobody is
 * holding. */
const SPRITES = await loadChrome();

let view = null;

const measures = (items) => items
  .map((item) => { const size = item.measure(); return `${size.kind} ${size.width}×${size.height}`; })
  .join(' · ');

function build(context, frame) {
  const k = frame.scale;
  const px = (units) => Math.round(units * k);
  /* The frame's own gutter, tighter than a component's padding: on the phone
   * frame the difference is what lets the four live buttons share one row. */
  const pad = px(14);
  const columns = frame.width >= 900 ? 2 : 1;
  const columnWidth = Math.floor((frame.width - pad * (columns + 1)) / columns);
  const gapY = px(7);

  const controls = [];   // the interactive ones: these are what the tap floor is about
  const parts = [];      // every component drawn, so a check can print all their measures
  let presses = 0;
  let offPresses = 0;

  const root = new Container();
  root.addChild(new Graphics().rect(0, 0, frame.width, frame.height).fill(COLOUR.ground).stroke({ width: 1, color: COLOUR.line }));
  const content = new Container();
  root.addChild(content);

  const heading = text(`the kit · ${frame.width}×${frame.height} at scale ${k} · ${SPRITES.length} chrome sprites`, { size: px(TYPE.tiny), colour: COLOUR.inkMute, weight: '700' });
  heading.position.set(pad, px(10));
  content.addChild(heading);
  const top = px(10) + heading.height + px(6);

  /* One block: a heading, then rows and fits the caller fills, then a note.
   * Every component is created onto the block itself, so the only thing that
   * ever moves is its position. */
  const block = (title, fill) => {
    const box = new Container();
    let cursor = 0;
    const head = text(title, { size: px(TYPE.tiny), colour: COLOUR.inkMute, weight: '700' });
    head.position.set(0, cursor);
    box.addChild(head);
    cursor += head.height + px(5);

    const row = (items, { interactive = false, gap = 10 } = {}) => {
      let x = 0;
      let tallest = 0;
      for (const item of items) {
        const size = item.measure();
        if (x > 0 && x + size.width > columnWidth) { x = 0; cursor += tallest + px(6); tallest = 0; }
        item.node.position.set(x, cursor);
        x += size.width + px(gap);
        tallest = Math.max(tallest, size.height);
        if (interactive) controls.push(item);
      }
      parts.push(...items);
      cursor += tallest + px(5);
      return items;
    };

    const fit = (item) => {
      item.node.position.set(0, cursor);
      cursor += item.measure().height + px(5);
      parts.push(item);
      return item;
    };

    const note = (line) => {
      const node = text(line, { size: px(TYPE.tiny), colour: COLOUR.inkMute, weight: '500', wrap: columnWidth });
      node.position.set(0, cursor);
      box.addChild(node);
      cursor += node.height + px(4);
    };

    fill({ box, row, fit, note });
    return { node: box, height: cursor };
  };

  const buttons = () => block('buttons — a raised face is live, a flat one is not', ({ box, row, note }) => {
    row([
      createButton(box, { label: 'Continue', scale: k, onPress: () => { presses += 1; } }),
      createButton(box, { label: 'Hint', kind: 'quiet', scale: k }),
      createButton(box, { kind: 'icon', icon: 'east', label: 'Next', scale: k }),
      createButton(box, { kind: 'square', icon: 'tick', label: 'Done', scale: k }),
    ], { interactive: true });
    const off = createButton(box, { label: 'Show me', scale: k, onPress: () => { offPresses += 1; } });
    off.setDisabled(true, 'waiting for Pip');
    row([off], { interactive: true });
    note(`hit areas — ${measures(controls)}`);
  });

  const chips = () => block('chips — a star count, a run, a rank, and one not yet', ({ box, row }) => {
    row([
      createChip(box, { icon: 'star', value: '9', label: 'first-try', scale: k }),
      createChip(box, { icon: 'tick', value: '4', label: 'in a row', scale: k }),
      createChip(box, { icon: 'badge', value: 'Knight', scale: k, tone: 'earned' }),
      createChip(box, { icon: 'lock', label: 'not yet', scale: k, tone: 'locked' }),
    ]);
  });

  const bars = () => block('the bar — the pack\'s track and fill', ({ box, fit }) => {
    fit(createProgress(box, { units: columnWidth / k, scale: k, value: 5, max: 8, caption: 'five of the eight behind' }));
  });

  const panels = () => block('panels — the card, and the pack\'s flat face', ({ box, fit }) => {
    fit(createPanel(box, { units: columnWidth / k, scale: k, title: 'Castle early', body: 'Get your king out of the middle.' }));
  });

  const coach = () => block('the coach — two voices, two elements', ({ box, fit }) => {
    const speech = createSpeech(box, { units: columnWidth / k, scale: k });
    speech.verdict('Nice move — that knight is safe.', 'good');
    speech.reply('Pip played Nf6, watching e5.');
    speechHandle = speech;
    fit(speech);
  });

  let speechHandle = null;
  const titles = ['buttons', 'chips', 'bars', 'panels', 'coach'];
  const placed = [buttons(), chips(), bars(), panels(), coach()];
  const blocks = placed.map((item, index) => ({ title: titles[index], height: Math.round(item.height) }));

  const heights = new Array(columns).fill(0);
  for (const item of placed) {
    const column = heights.indexOf(Math.min(...heights));
    item.node.position.set(pad + column * (columnWidth + pad), top + heights[column]);
    content.addChild(item.node);
    heights[column] += item.height + gapY;
  }
  const used = Math.ceil(top + Math.max(...heights));

  context.layer.addChild(root);
  context.layer.eventMode = 'static';
  context.layer.hitArea = new Rectangle(0, 0, context.width, context.height);

  return { root, frame, k, used, blocks, controls, parts, speech: speechHandle, presses: () => presses, offPresses: () => offPresses };
}

function fit(context, state) {
  const width = Math.min(1, context.width / state.frame.width);
  const height = Math.min(1, context.height / state.frame.height);
  state.scale = Math.min(width, height);
  state.root.scale.set(state.scale);
  state.root.position.set(
    Math.round((context.width - state.frame.width * state.scale) / 2),
    Math.round((context.height - state.frame.height * state.scale) / 2),
  );
  context.layer.hitArea = new Rectangle(0, 0, context.width, context.height);
}

export default {
  mount(context) {
    const asked = context.params[0];
    const name = FRAME[asked] ? asked : context.width >= 900 ? 'desktop' : 'phone';
    view = { ...build(context, FRAME[name]), name };
    fit(context, view);
    view.fit = view.scale;

    window.learnChessKit = {
      frame: () => ({ name: view.name, width: view.frame.width, height: view.frame.height, scale: view.k, drawnAt: view.fit }),
      content: () => ({ used: view.used, fits: view.used <= view.frame.height, blocks: view.blocks }),
      controls: () => view.controls.map((control) => control.measure()),
      /* every component on the page, interactive or not — the chips and the bar
       * have sizes a check wants to read too */
      parts: () => view.parts.map((part) => part.measure()),
      /* The same controls with the point a check should tap: the centre of the
       * hit area, in the page's own pixels. A check that guesses coordinates
       * from a screenshot is testing its own guess, not the control. */
      points: () => view.controls.map((control) => {
        const size = control.measure();
        const at = control.node.getGlobalPosition();
        return { ...size, x: Math.round(at.x + size.width / 2), y: Math.round(at.y + size.height / 2) };
      }),
      spoken: () => view.controls.map((control) => control.spoken()),
      voices: () => {
        const voices = view.speech.voices();
        return { verdict: voices.verdict.text, reply: voices.reply.text, separate: voices.verdict !== voices.reply };
      },
      presses: () => view.presses(),
      offPresses: () => view.offPresses(),
      animates: () => animates(),
      floor: TAP_FLOOR,
    };
  },

  resize(context) {
    if (view) fit(context, view);
  },

  /* The shell destroys the layer's children after this runs; the handle goes
   * with the screen, so a late check cannot read a destroyed one. */
  unmount() {
    window.learnChessKit = null;
    view = null;
  },
};
