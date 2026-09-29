/* Learn chess — the shell.
 *
 * One Pixi Application that fills the viewport, and a hash route that decides
 * which screen is on stage. No bundler: the browser loads this file, this file
 * loads the pinned library beside it, and a screen is a module the route
 * imports when someone asks for it.
 *
 * A screen is `src/scenes/<name>.js`, and its route is `#/<name>/<params…>`:
 * `#/lesson/1` imports `./scenes/lesson.js` and hands it `['1']`. There is
 * deliberately no `scenes/index.js` — a list of screens is a file every screen
 * has to edit, which is how parallel work ends up conflicting on one line.
 * Adding a screen adds one file.
 *
 * A scene module default-exports any of:
 *   mount(context)    build it and add its children to `context.layer`
 *   resize(context)   the viewport changed; re-lay out
 *   unmount(context)  let go of anything that outlives the layer
 *
 * `context` is one object, mutated in place: `{ app, layer, params, width,
 * height }`, with `width` and `height` in CSS pixels and always current — a
 * screen reads them during a resize, not only when it is mounted.
 */
import { Application, Container } from '../vendor/pixi/pixi.min.mjs';

/* A phone at 3x gets a 2x drawing buffer: above that the extra pixels are not
 * visible and the memory is real. Everything here is measured in CSS pixels;
 * `autoDensity` is what maps them onto the buffer. */
const DPR_CAP = 2;

/* The screen the game opens on: the path, because that is where a learner starts
 * — one open stop, the rest of the course locked behind it. */
const DEFAULT_SCENE = 'path';

/* What a route segment may be before it becomes a file name: lowercase, no
 * dots and no slashes, so `#/../../secrets` is a message and not an import. */
const SCENE_NAME = /^[a-z][a-z0-9-]*$/;

const canvasHost = document.getElementById('app');
const status = document.getElementById('status');

const app = new Application();
const context = { app, layer: null, params: [], width: 0, height: 0 };

let scene = null;      // the mounted scene module, if any
let sceneName = null;  // its name, for the guard below and for the handle a check reads
let ticket = 0;        // the route in flight: a newer one invalidates an older import

function fail(what, error) {
  /* Said on screen and left in the console: a screen that does not start is a
   * bug in that screen, and swallowing the stack would hide it. */
  console.error(what, error);
  message(what);
}

function message(text) {
  status.textContent = text;
  status.hidden = !text;
}

function pixelRatio() {
  return Math.min(window.devicePixelRatio || 1, DPR_CAP);
}

/* One owner of the size: this function. It applies the ratio cap, resizes the
 * renderer, and hands the new size to the scene — so a screen never has to
 * listen for a resize itself, and two of them can never disagree. */
function size() {
  context.width = window.innerWidth;
  context.height = window.innerHeight;
  app.renderer.resize(context.width, context.height, pixelRatio());
  scene?.resize?.(context);
}

/* `#/lesson/1` → `{ name: 'lesson', params: ['1'] }`. An empty route is the
 * default screen. A malformed escape (`#/%`) is left as it was written and fails
 * the name test below, rather than throwing out of the router. */
function route(hash) {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const decode = (segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  };
  const [name = '', ...params] = path.split('/').filter(Boolean).map(decode);
  return { name: name || DEFAULT_SCENE, params };
}

async function open(hash) {
  const { name, params } = route(hash);
  const mine = ++ticket;

  if (!SCENE_NAME.test(name)) {
    message(`There is no screen called “${name}”.`);
    return;
  }

  let screen;
  try {
    screen = (await import(`./scenes/${name}.js`)).default;
  } catch (error) {
    /* A module that is not there is a wrong address, not a broken screen — and
     * the same TypeError is thrown when a screen *does* exist and something it
     * imports does not, so the error itself is kept in the console, where the
     * difference between "no such screen" and "a broken screen" is readable. */
    if (error instanceof TypeError) {
      console.warn(`#/${name} did not load`, error);
      message(`There is no screen called “${name}”.`);
      return;
    }
    fail(`The screen “${name}” did not start.`, error);
    return;
  }
  if (mine !== ticket) return;   // a newer route arrived while this one was loading
  if (typeof screen?.mount !== 'function') {
    fail(`“${name}” is not a screen.`, new TypeError('a scene module default-exports mount()'));
    return;
  }

  scene?.unmount?.(context);
  if (context.layer) {
    app.stage.removeChild(context.layer);
    context.layer.destroy({ children: true });
  }

  scene = screen;
  sceneName = name;
  context.params = params;
  context.layer = new Container();
  app.stage.addChild(context.layer);
  message('');
  size();
  scene.mount(context);
}

async function boot() {
  try {
    await app.init({
      background: '#eef3ff',
      antialias: true,
      autoDensity: true,
      resolution: pixelRatio(),
      width: window.innerWidth,
      height: window.innerHeight,
    });
  } catch (error) {
    fail('The game could not start.', error);
    return;
  }

  canvasHost.appendChild(app.canvas);
  app.canvas.setAttribute('role', 'img');
  app.canvas.setAttribute('aria-label', 'Learn chess');

  window.addEventListener('resize', size);
  window.addEventListener('hashchange', () => open(location.hash));
  await open(location.hash);
}

/* The offline copy registers itself once the page has loaded. The promise it
 * keeps is "no internet needed after it loads"; a browser that will not
 * register a worker still gets the whole game, minus that promise. */
function registerWorker() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.warn('the offline copy did not register; the game runs anyway', error);
    });
  });
}

/* The shell's own handle, for a browser check: the screen the route resolved
 * to, and the size and ratio the renderer really has. The old app exposed
 * nothing, and the checks around it had to infer both from the DOM. */
window.learnChess = {
  scene: () => sceneName,
  size: () => ({ width: context.width, height: context.height }),
  resolution: () => app.renderer.resolution,
};

registerWorker();
boot();
