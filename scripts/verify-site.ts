#!/usr/bin/env bun
/* The rules that can be checked mechanically. Run from the repository root:
 *
 *   bun run scripts/verify-site.ts
 *
 * It answers six questions: does every file the page asks for exist, is there
 * any third-party request, is the offline file list complete, does the course
 * hold together (positions legal, answers legal, one idea per drill, copy inside
 * its budgets), is the path of lessons a graph a learner can walk, and does the
 * shell carry the markup the app needs.
 *
 * It cannot tell you whether a drill's answer is the best move or whether the
 * accepted list is the right width — scripts/verify-drills.ts asks Stockfish
 * that, and docs/DRILLS.md is the record.
 */
import { parseFen, legalMoves } from '../js/engine.js';
import { LESSONS, PACKS } from '../js/lessons.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems: string[] = [];
const checks: string[] = [];
const read = (p: string) => Bun.file(`${ROOT}${p}`).text();
const exists = async (p: string) => await Bun.file(`${ROOT}${p}`).exists();
/* The app's own addresses, for the share card; nothing else off this site is
   allowed anywhere in the sources. */
const OWN_HOSTS = ['aivara.se', 'aivara-se.github.io', 'w3.org'];

/* 1. every local reference resolves */
const html = await read('index.html');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const cssRefs = [...html.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, '').trim());
let localRefs = 0;
for (const ref of refs) {
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) {
    problems.push(`index.html references something off this site: ${ref}`);
    continue;
  }
  if (!(await exists(ref))) problems.push(`index.html points at a file that is not here: ${ref}`);
  else localRefs++;
}
for (const ref of cssRefs) {
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) {
    problems.push(`the stylesheet loads something off this site: ${ref}`);
    continue;
  }
  if (!(await exists(ref))) problems.push(`the stylesheet points at a file that is not here: ${ref}`);
  else localRefs++;
}
checks.push(`${localRefs} local references in index.html and its stylesheet, all present`);

/* 2. no third-party request, anywhere in the sources */
const sources = ['index.html', 'js/app.js', 'js/engine.js', 'js/lessons.js', 'sw.js', 'manifest.webmanifest'];
for (const file of sources) {
  if (!(await exists(file))) continue;
  const text = await read(file);
  const offenders = [...text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]);
  const real = offenders.filter((o) => !OWN_HOSTS.some((host) => o.includes(host)));
  if (real.length) problems.push(`${file} makes a third-party request: ${[...new Set(real)].join(', ')}`);
}
checks.push(`${sources.length} source files checked for third-party requests`);

/* 3. fonts, their licences and the mark ship with the app */
for (const f of ['assets/fonts/inter-latin.woff2', 'assets/fonts/space-grotesk-latin.woff2',
  'assets/fonts/OFL-Inter.txt', 'assets/fonts/OFL-SpaceGrotesk.txt',
  'assets/favicon.svg', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/icon-maskable-512.png', 'assets/share-card.png', 'manifest.webmanifest', 'sw.js']) {
  if (!(await exists(f))) problems.push(`missing asset: ${f}`);
}
checks.push('fonts, licences, icons, share card, manifest and offline worker are present');

/* 4. the offline list is the app's own files, and all of them exist */
const sw = await read('sw.js');
const listed = [...sw.matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]);
const CACHE_FLOOR = ['index.html', 'js/app.js', 'js/engine.js', 'js/lessons.js',
  'assets/fonts/inter-latin.woff2', 'assets/fonts/space-grotesk-latin.woff2'];
for (const need of CACHE_FLOOR) {
  if (!listed.includes(need)) problems.push(`sw.js does not cache ${need}, so the app is not offline without it`);
}
for (const f of listed) {
  if (f === './') continue;
  if (!(await exists(f))) problems.push(`sw.js caches a file that is not here: ${f}`);
}
const cssUrls = cssRefs.filter((r) => !listed.includes(r));
if (cssUrls.length) problems.push(`the stylesheet's fonts are not in sw.js: ${cssUrls.join(', ')}`);
checks.push(`${listed.length} files in the offline cache, each present`);

/* 5. the course: every drill is legal, playable, and its answers are real moves */
let drills = 0;
/* The copy is written for a nine-year-old, and short. These budgets are the
   measurable half of that rule (AGENTS.md); how it reads is a human's job. */
const BUDGET = { title: 40, goal: 55, caption: 110, body: 170, prompt: 65, hint: 55, why: 150 };
let longest = { prompt: 0, body: 0 };
const ids = new Set<string>();
const packIds = new Set<string>(PACKS.map((p: any) => p.id));
/* A stop is a stop: a lesson's drills and a pack's puzzles are checked by the same
   rules, and a failure names the stop it came from. A lesson carries the copy a
   pack does not (a goal, a body, a diagram); a pack carries the lesson that opens
   it, its idea in one line, and exactly three puzzles. */
for (const stop of [...LESSONS, ...PACKS] as any[]) {
  const isPack = packIds.has(stop.id);
  const kind = isPack ? 'pack' : 'lesson';
  if (!stop.id || !stop.title) problems.push(`a stop without id/title: ${stop.title}`);
  if (ids.has(stop.id)) problems.push(`two stops share the id ${stop.id}, so the map cannot tell them apart`);
  ids.add(stop.id);
  if ((stop.title ?? '').length > BUDGET.title) problems.push(`${kind} ${stop.id}: title is ${stop.title.length} chars (budget ${BUDGET.title})`);
  if (isPack) {
    /* A pack is offered by a lesson and by nothing else, so the lesson it names
       has to exist — otherwise the stop could never open and would sit locked on
       the map forever. */
    if (!stop.idea) problems.push(`pack ${stop.id} has no idea line, and the map shows one`);
    if (!LESSONS.some((l) => l.id === stop.opensWith)) {
      problems.push(`pack ${stop.id} opens with "${stop.opensWith}", which is not a lesson, so nothing could ever open it`);
    }
    if ((stop.drills ?? []).length !== 3) problems.push(`pack ${stop.id} has ${(stop.drills ?? []).length} puzzles: a pack is three`);
  } else {
    if (!stop.goal) problems.push(`lesson without a goal: ${stop.title}`);
    if (!Array.isArray(stop.body) || stop.body.length < 2) problems.push(`lesson ${stop.id} has no body text`);
    if ((stop.goal ?? '').length > BUDGET.goal) problems.push(`lesson ${stop.id}: goal is ${stop.goal.length} chars (budget ${BUDGET.goal})`);
    if (stop.diagramCaption && stop.diagramCaption.length > BUDGET.caption) problems.push(`lesson ${stop.id}: caption is ${stop.diagramCaption.length} chars (budget ${BUDGET.caption})`);
    (stop.body ?? []).forEach((para: string, i: number) => {
      longest.body = Math.max(longest.body, para.length);
      if (para.length > BUDGET.body) problems.push(`lesson ${stop.id}: paragraph ${i + 1} is ${para.length} chars (budget ${BUDGET.body})`);
    });
    /* A boss stop is a game, not a page of puzzles: it has no drills and no
       diagram, and it names the level of the opponent it is won at. Everything
       else about it is every stop's business — its title, its goal, its copy. */
    const boss = stop.boss as { level?: number } | undefined;
    if (boss) {
      if (!Number.isInteger(boss.level) || (boss.level as number) < 1 || (boss.level as number) > 3) {
        problems.push(`lesson ${stop.id}: a boss stop names the level it is won at, and ${boss.level} is not one of 1, 2 or 3`);
      }
    } else if (!stop.diagram) {
      problems.push(`lesson ${stop.id} has no diagram position`);
    } else {
      try { parseFen(stop.diagram); } catch { problems.push(`lesson ${stop.id} has an unparseable diagram FEN`); }
    }
  }
  const list = stop.drills ?? [];
  if (!list.length && !stop.boss) problems.push(`${kind} ${stop.id} has no puzzles and is not a boss stop`);
  list.forEach((drill: any, i: number) => {
    drills++;
    const where = `${stop.id} drill ${i + 1}`;
    let pos;
    try { pos = parseFen(drill.fen); } catch { problems.push(`${where}: unparseable FEN`); return; }
    const moves = legalMoves(pos);
    if (!moves.length) problems.push(`${where}: nobody can move in this position`);
    if (!drill.prompt || !drill.hint || !drill.why) problems.push(`${where}: missing prompt, hint or explanation`);
    longest.prompt = Math.max(longest.prompt, (drill.prompt ?? '').length);
    for (const [field, budget] of [['prompt', BUDGET.prompt], ['hint', BUDGET.hint], ['why', BUDGET.why]] as const) {
      const value = (drill as any)[field] as string;
      if (value && value.length > budget) problems.push(`${where}: ${field} is ${value.length} chars (budget ${budget})`);
    }
    const legal = new Set(moves.map((m: any) => `${'abcdefgh'[m.from % 8]}${Math.floor(m.from / 8) + 1}${'abcdefgh'[m.to % 8]}${Math.floor(m.to / 8) + 1}${m.promotion ?? ''}`));
    if (!Array.isArray(drill.accepted) || !drill.accepted.length) problems.push(`${where}: no accepted move`);
    if (!drill.best) problems.push(`${where}: no best move recorded`);
    /* The answer the sheet reveals has to be an answer the board takes, or a
       learner who plays it is told they are wrong and then shown that move. */
    if (drill.best && Array.isArray(drill.accepted) && !drill.accepted.includes(drill.best)) {
      problems.push(`${where}: best (${drill.best}) is not in accepted, so the board would reject its own answer`);
    }
    for (const uci of [...(drill.accepted ?? []), drill.best].filter(Boolean)) {
      if (!legal.has(String(uci).toLowerCase())) problems.push(`${where}: ${uci} is not a legal move in this position`);
    }
  });
}
const bossStops = LESSONS.filter((l) => (l as any).boss).length;
checks.push(`${LESSONS.length} stops (${bossStops} of them boss games, ${PACKS.length} packs beside them), ${drills} puzzles — every FEN legal and every answer a legal move`);
checks.push(`copy within a nine-year-old's budgets (longest prompt ${longest.prompt}, longest paragraph ${longest.body})`);

/* 6. the shell carries what the app needs */
if (!/name="viewport"/.test(html)) problems.push('index.html has no viewport meta tag');
if (!/<noscript>/.test(html)) problems.push('index.html has no noscript fallback');
if (!/<script type="module" src="js\/app\.js">/.test(html)) problems.push('index.html does not load js/app.js as a module');
if (!/rel="manifest"/.test(html)) problems.push('index.html has no manifest, so it cannot be added to a home screen');
if (!/rel="apple-touch-icon"/.test(html)) problems.push('index.html has no apple-touch-icon');
if (!/property="og:image"/.test(html) || !/property="og:image:alt"/.test(html)) {
  problems.push('index.html has no share card (og:image with alt text), so a shared link shows no picture');
}
checks.push('shell markup: viewport, noscript fallback, module entry point, manifest, touch icon, share card');

/* 7. the shell has no hard-coded progress totals: they are counted from the course */
for (const file of ['js/app.js', 'index.html']) {
  const text = await read(file);
  const written = text.match(/\b(of|=)\s*24\b|\b24\s*(puzzles|drills|stars)\b/gi);
  if (written) {
    problems.push(`${file} writes a puzzle total down (${[...new Set(written)].join(', ')}): count it from js/lessons.js instead`);
  }
}

/* 8. the two things that must stay small on the smallest phone — measured in
 * docs/DESIGN.md: a longer app bar line wraps at 360px and costs the board 18px,
 * and a fourth button in the play screen's row wraps onto a second line, which
 * pushes Hint and Undo off the bottom of a 640px phone. */
{
  const app = await read('js/app.js');
  const lines = [...app.matchAll(/^\s{2}(learn|play|train):\s*'([^']*)',$/gm)].map((m) => [m[1], m[2]] as const);
  if (lines.length !== 3) {
    problems.push(`the app bar's three lines are not all in SUBTITLE (found ${lines.length})`);
  }
  for (const [tab, line] of lines) {
    if (line.length > 24) {
      problems.push(`the ${tab} app bar line is ${line.length} characters ("${line}"): past 24 it wraps at 360px and the board loses 18px of height, so say it shorter`);
    }
  }
  const row = html.match(/<div class="row" style="justify-content:center">([\s\S]*?)<\/div>/);
  const buttons = row ? (row[1].match(/<button/g) || []).length : 0;
  if (buttons !== 3) {
    problems.push(`the row of buttons under the play board holds ${buttons}: a fourth wraps onto a second line at 360px and pushes Hint and Undo off the bottom of a 640px phone`);
  }
  const longestLine = lines.length ? Math.max(...lines.map(([, l]) => l.length)) : 0;
  checks.push(`the app bar lines stay on one line at 360px (longest ${longestLine} characters) and the game's buttons are one row of three`);
}

/* 9. the path of lessons is a graph a learner can walk. The map in the lessons
 * tab is drawn from `requires` in js/lessons.js, so a broken graph is a broken
 * picture: a stop that names nothing, a circle, or a stop no route reaches. */
{
  const ids = new Set(LESSONS.map((l) => l.id));
  if (ids.size !== LESSONS.length) problems.push('two lessons share an id, so the map cannot tell them apart');
  for (const l of LESSONS) {
    if (!Array.isArray(l.requires)) { problems.push(`${l.id} has no requires list, so the map cannot place it`); continue; }
    for (const r of l.requires) {
      if (!ids.has(r)) problems.push(`${l.id} requires "${r}", which is not a lesson`);
      if (r === l.id) problems.push(`${l.id} requires itself`);
    }
  }
  const roots = LESSONS.filter((l) => (l.requires || []).length === 0);
  if (!roots.length) problems.push('no lesson is open at the start: every lesson requires another, so there is nothing to play');

  const colour = new Map();
  const circles = [];
  const visit = (l, trail) => {
    const c = colour.get(l.id);
    if (c === 2) return;
    if (c === 1) { circles.push([...trail, l.id].join(' -> ')); return; }
    colour.set(l.id, 1);
    for (const r of l.requires || []) {
      const m = LESSONS.find((x) => x.id === r);
      if (m) visit(m, [...trail, l.id]);
    }
    colour.set(l.id, 2);
  };
  for (const l of LESSONS) visit(l, []);
  if (circles.length) problems.push(`the path goes in a circle: ${circles[0]} — no lesson in it could ever open`);

  const reached = new Set();
  const walk = (l) => {
    if (reached.has(l.id)) return;
    reached.add(l.id);
    for (const m of LESSONS) if ((m.requires || []).includes(l.id)) walk(m);
  };
  for (const l of roots) walk(l);
  const stranded = LESSONS.filter((l) => !reached.has(l.id));
  if (stranded.length) problems.push(`no route reaches ${stranded.map((l) => l.id).join(', ')}, so a learner can never open ${stranded.length === 1 ? 'it' : 'them'}`);

  const depth = (l, guard = new Set()) => {
    const reqs = (l.requires || []).filter((r) => ids.has(r) && r !== l.id);
    if (!reqs.length || guard.has(l.id)) return 0;
    guard.add(l.id);
    return 1 + Math.max(...reqs.map((r) => depth(LESSONS.find((x) => x.id === r), guard)));
  };
  checks.push(`the path: ${LESSONS.length} stops, ${roots.length} open at the start, every stop reachable, ${Math.max(...LESSONS.map((l) => depth(l))) + 1} rows deep`);

  /* The map has three columns, and a pack stands in the column its lesson's row
     has left free (js/app.js, `mapLayout`). A fourth stop in a row would be
     slipped out of the path — a shape rather than a place — so the course is what
     fails, not the drawing. */
  const rowLoad = new Map<number, number>();
  const load = (d) => { rowLoad.set(d, (rowLoad.get(d) || 0) + 1); };
  for (const l of LESSONS) load(depth(l));
  for (const p of PACKS) {
    const home = LESSONS.find((l) => l.id === p.opensWith);
    if (home) load(depth(home));
  }
  const crowded = [...rowLoad].filter(([, n]) => n > 3);
  for (const [d, n] of crowded) {
    problems.push(`row ${d} of the map holds ${n} stops (the lessons there plus the packs hanging off them): a row has three columns, so a pack would be drawn off the path`);
  }
  checks.push(`the map's rows hold the packs: ${PACKS.length} packs, at most ${Math.max(...rowLoad.values())} stops in a row of three columns`);
}

for (const c of checks) console.log(`ok   ${c}`);
if (problems.length) {
  console.error('\nFAILED');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nOK — every mechanical rule passes.');
