/* The kit`s browser check — scratch. This copy lives on the shots/chrome-kit-40
 * branch for a reviewer to run; it is evidence, and it must never be merged into
 * main. Copy it somewhere outside the tree and point it at a checkout.
 * Serves the checkout over http (never file://: a module loaded from file:// is
 * refused, and the service worker needs an origin), drives `#/kit/phone` and
 * `#/kit/desktop` in headless Chromium, and reports:
 *   - every console error, page error, failed request and non-200 response
 *   - the frame it drew and whether the kit fits inside it
 *   - every control's measured hit area against the 48px floor
 *   - the coach's two voices, and that they are two elements
 *   - a real tap on a live button and on a disabled one
 *   - the same with prefers-reduced-motion on
 * and writes a 1:1 screenshot of each frame.
 *
 * Run: NODE_PATH=$HOME/.bun/install/global/node_modules bun /tmp/kit-check.ts <repoDir> <port>
 */
import { chromium } from 'playwright';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const root = process.argv[2] ?? process.cwd();
const port = Number(process.argv[3] ?? 8848);
const shots = '/tmp/kit-shots';
mkdirSync(shots, { recursive: true });

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = Bun.file(join(root, path));
    if (!(await file.exists())) return new Response(`not found: ${path}`, { status: 404 });
    return new Response(file);
  },
});

const base = `http://127.0.0.1:${port}`;
const report = { base, frames: {}, paths: [], problems: [], notes: [] };

function watch(page, tag) {
  const bucket = { errors: [], failed: [], bad: [] };
  page.on('console', (message) => { if (message.type() === 'error') bucket.errors.push(`${message.text()}`); });
  page.on('pageerror', (error) => bucket.errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => bucket.failed.push(`${request.url()} — ${request.failure()?.errorText}`));
  page.on('response', (response) => { if (response.status() >= 400) bucket.bad.push(`${response.status()} ${response.url()}`); });
  return bucket;
}

/* The listeners live for the page's life, so a bucket read after a later
 * navigation would carry that navigation's failures. Read a copy, at the moment
 * the route under test is the one on screen. */
const snapshot = (bucket) => ({ errors: [...bucket.errors], failed: [...bucket.failed], bad: [...bucket.bad] });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

async function open(route) {
  const bucket = watch(page, route);
  await page.goto(`${base}/#/kit/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.learnChessKit, null, { timeout: 20000 });
  await page.waitForTimeout(250);
  return bucket;
}

const read = () => page.evaluate(() => ({
  frame: window.learnChessKit.frame(),
  content: window.learnChessKit.content(),
  controls: window.learnChessKit.controls(),
  parts: window.learnChessKit.parts(),
  points: window.learnChessKit.points(),
  spoken: window.learnChessKit.spoken(),
  voices: window.learnChessKit.voices(),
  animates: window.learnChessKit.animates(),
  floor: window.learnChessKit.floor,
  presses: window.learnChessKit.presses(),
  offPresses: window.learnChessKit.offPresses(),
}));

for (const route of ['phone', 'desktop']) {
  const bucket = await open(route);
  const state = await read();

  /* a live tap and a dead one, at the centres the controls report */
  const live = state.points.find((point) => !point.disabled);
  const dead = state.points.find((point) => point.disabled);
  await page.mouse.click(live.x, live.y);
  await page.waitForTimeout(120);
  if (dead) { await page.mouse.click(dead.x, dead.y); await page.waitForTimeout(120); }
  const after = await read();

  const frame = state.frame;
  const rect = {
    x: Math.round((1400 - frame.width * frame.drawnAt) / 2),
    y: Math.round((900 - frame.height * frame.drawnAt) / 2),
    width: Math.round(frame.width * frame.drawnAt),
    height: Math.round(frame.height * frame.drawnAt),
  };
  await page.screenshot({ path: `${shots}/kit-${route}.png`, clip: rect });

  report.frames[route] = {
    frame,
    rect,
    content: state.content,
    fits: state.content.fits,
    controls: state.controls,
    parts: state.parts,
    underFloor: state.controls.filter((control) => Math.min(control.width, control.height) < state.floor).map((c) => `${c.kind} ${c.width}×${c.height}`),
    voices: state.voices,
    spoken: state.spoken,
    taps: { before: state.presses, after: after.presses, disabledFired: after.offPresses },
    problems: snapshot(bucket),
  };
}

/* the same two frames with the device asking for less motion */
await page.emulateMedia({ reducedMotion: 'reduce' });
const reduced = await open('phone');
const reducedState = await read();
report.frames.phone.reducedMotion = { animates: reducedState.animates, ...snapshot(reduced) };

/* a frame name nobody has: the route falls back rather than failing, and a
 * screen that does not exist still says so — on a fresh page, so nothing here
 * lands in the buckets above. */
const solo = await browser.newPage({ viewport: { width: 1400, height: 900 } });
watch(solo, 'solo');
await solo.goto(`${base}/#/kit/nonsense`, { waitUntil: 'domcontentloaded' });
await solo.waitForFunction(() => !!window.learnChessKit, null, { timeout: 20000 });
report.notes.push(`#/kit/nonsense fell back to ${JSON.stringify(await solo.evaluate(() => window.learnChessKit.frame().name))}`);
await solo.goto(`${base}/#/lesson/1`, { waitUntil: 'domcontentloaded' });
await solo.waitForTimeout(700);
report.notes.push(`#/lesson/1 status text: ${JSON.stringify(await solo.evaluate(() => document.getElementById('status').textContent))}`);
await solo.close();

for (const [name, frame] of Object.entries(report.frames)) {
  if (!frame.fits) report.problems.push(`${name}: the kit is ${frame.content.used}px tall in a ${frame.frame.height}px frame`);
  for (const item of frame.underFloor) report.problems.push(`${name}: ${item} is under the tap floor`);
  if (!frame.voices.separate) report.problems.push(`${name}: the coach's two voices are the same element`);
  if (frame.taps.after !== 1) report.problems.push(`${name}: a live tap landed ${frame.taps.after} times, not once`);
  if (frame.taps.disabledFired !== 0) report.problems.push(`${name}: a disabled button fired ${frame.taps.disabledFired} times`);
  for (const key of ['errors', 'failed', 'bad']) {
    for (const line of frame.problems[key]) report.problems.push(`${name}: ${key}: ${line}`);
  }
  if (frame.reducedMotion && frame.reducedMotion.animates) report.problems.push(`${name}: motion is still on under prefers-reduced-motion`);
  for (const line of frame.reducedMotion?.errors ?? []) report.problems.push(`phone (reduced motion): ${line}`);
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
server.stop(true);
process.exit(report.problems.length ? 1 : 0);
