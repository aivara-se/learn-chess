#!/usr/bin/env bun
/* The course's rules — the data a machine can check. Run from the repository root:
 *
 *   bun run scripts/verify-site.ts
 *
 * It answers four questions about this tree, and nothing else:
 *
 *   1. does the course hold together — every position a real one, every answer a
 *      move the board takes, one idea per drill, the copy inside its budgets;
 *   2. is `requires` a path a learner can walk — a name that is a stop, no
 *      circle, no stop that no route reaches, and a shape a row of the map can
 *      draw without dropping a stop;
 *   3. is every course total counted from the course rather than written down;
 *   4. is the map's art what `assets/manifest.json` says it is, is every file the
 *      map draws in that record, and does the whole list stay inside its budget.
 *
 * **Rule 4 is new with the card that asked for it, and it had to be written rather
 * than pointed at.** That card said the check "already does this for the old
 * assets"; no file in this tree had ever read the manifest's `bytes` or `sha256`.
 * `scripts/verify-shell.ts` asserts that `sw.js` *names* `assets/manifest.json`, and
 * `tests/board.test.ts` checks the paths `src/board/art.js` uses — neither reads the
 * record itself. So the record is checked here for every entry, in both directions,
 * and the map's own files are held to it on top of that. Rule 4 is also where the
 * "no third-party request" rule reaches the art: `verify-shell.ts` keeps it for the
 * shell's own sources, because an `<img>` of an SVG in this repository is this
 * origin's request and only a reference outside it is somebody else's.
 *
 * The shell's own rules — one module, no third-party request, the offline list,
 * the vendored library, `.nojekyll` — are `scripts/verify-shell.ts`. That file is
 * about the frame; this one is about the course inside it and the art under it, and
 * the split is what lets the shell's check stay useful while the course is ported
 * into it. The markup rules v1's copy of this file carried (the app bar's lines,
 * the row of buttons under the board) were rules about `js/app.js`, which no longer
 * exists:
 * they belong to whatever screen draws that chrome, and that card's check.
 *
 * It cannot tell you whether a drill's answer is the best move, or whether an
 * `accepted` list is the right width — scripts/verify-drills.ts asks Stockfish
 * that, and docs/DRILLS.md is the record.
 */
import { createHash } from 'node:crypto';
import { parseFen, legalMoves } from '../src/engine/engine.js';
import { LESSONS, PACKS } from '../src/data/lessons.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems: string[] = [];
const checks: string[] = [];
const read = (p: string) => Bun.file(`${ROOT}${p}`).text();
const exists = async (p: string) => await Bun.file(`${ROOT}${p}`).exists();
const glob = async (pattern: string) =>
  (await Array.fromAsync(new Bun.Glob(pattern).scan(ROOT))).sort();

/* 1. the course: every drill is legal, playable, and its answers are real moves */
let drills = 0;
/* The copy is written for a nine-year-old, and short. These budgets are the
   measurable half of that rule; how it reads is a human's job. */
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

/* 2. the path of lessons is a graph a learner can walk. The map is drawn from
 * `requires` in src/data/lessons.js, so a broken graph is a broken picture: a stop
 * that names nothing, a circle, or a stop no route reaches. The drawing itself is
 * the path card's; what the drawing needs of the data is what is checked here. */
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
  const circles: string[] = [];
  const visit = (l: any, trail: string[]) => {
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

  const reached = new Set<string>();
  const walk = (l: any) => {
    if (reached.has(l.id)) return;
    reached.add(l.id);
    for (const m of LESSONS) if ((m.requires || []).includes(l.id)) walk(m);
  };
  for (const l of roots) walk(l);
  const stranded = LESSONS.filter((l) => !reached.has(l.id));
  if (stranded.length) problems.push(`no route reaches ${stranded.map((l) => l.id).join(', ')}, so a learner can never open ${stranded.length === 1 ? 'it' : 'them'}`);

  const depth = (l: any, guard = new Set<string>()): number => {
    const reqs = (l.requires || []).filter((r: string) => ids.has(r) && r !== l.id);
    if (!reqs.length || guard.has(l.id)) return 0;
    guard.add(l.id);
    return 1 + Math.max(...reqs.map((r: string) => depth(LESSONS.find((x) => x.id === r), guard)));
  };
  checks.push(`the path: ${LESSONS.length} stops, ${roots.length} open at the start, every stop reachable, ${Math.max(...LESSONS.map((l) => depth(l))) + 1} rows deep`);

  /* The map has three columns, and a pack stands in the column its lesson's row
     has left free. A fourth stop in a row would be slipped out of the path — a
     shape rather than a place — so the course is what fails, not the drawing. */
  const rowLoad = new Map<number, number>();
  const load = (d: number) => { rowLoad.set(d, (rowLoad.get(d) || 0) + 1); };
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

/* 3. no course total is written into a file: they are counted from the course.
 * The numbers are read off the course data rather than named here, so the guard
 * moves with the course: add a puzzle and a screen that still writes the old total
 * down fails the same run. (`24` used to be in v1's line, which is how it went
 * blind — the total is 44 now, and the guard never noticed.) The files are the ones
 * a course total could be printed in — the data itself and the screens; the rules
 * engine is arithmetic and is not scanned. docs/PORT.md states these numbers on
 * purpose: it is the contract, and every figure in it can be re-derived. */
{
  const course = [...LESSONS, ...PACKS] as any[];
  const puzzles = course.reduce((n, s) => n + ((s.drills ?? []) as unknown[]).length, 0);
  const totals = new Set([puzzles, LESSONS.length, PACKS.length]);
  const files = [...new Set([
    'index.html',
    'src/data/lessons.js',
    ...(await glob('src/board/**/*.js')),
    ...(await glob('src/path/**/*.js')),
    ...(await glob('src/ui/**/*.js')),
    ...(await glob('src/scenes/**/*.js')),
  ])];
  for (const file of files) {
    if (!(await exists(file))) continue;
    const text = await read(file);
    const written = [...text.matchAll(/\b(of|=)\s*(\d+)\b|\b(\d+)\s*(puzzles|drills|stars|lessons|stops|detours)\b/gi)]
      .filter((m) => totals.has(Number(m[2] ?? m[3])))
      .map((m) => m[0].trim());
    if (written.length) {
      problems.push(`${file} writes a course total down (${[...new Set(written)].join(', ')}): count it from src/data/lessons.js instead, never as a literal`);
    }
  }
  checks.push(`no course total is written into a file: ${puzzles} puzzles, ${LESSONS.length} stops and ${PACKS.length} packs are counted from the course`);
}

/* 4. the map's art: the manifest is the record, and the art has a budget. The map is
 * the only screen that draws `assets/map/**`, and `sw.js` precaches exactly what
 * `assets/manifest.json` lists — so the record has to match the bytes on disk, every
 * file the map asks for has to be in it, and the whole list has to stay small enough
 * for a child on a phone to pay for before the map opens. What is new here, and why,
 * is written at the top of this file. */
{
  const MANIFEST = 'assets/manifest.json';
  const ART = 'assets/map/';
  /* The card's budget for the map's art. It is a budget rather than a number because
     every file under it is fetched and cached before the map can draw anything. */
  const ART_BUDGET_KB = 500;
  /* A host named in a file is a third-party request unless it is a namespace: the SVG
     namespace is a name, and a browser does not fetch a name. */
  const NAMESPACES = ['w3.org'];
  const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

  let record: { assets?: { path?: string; bytes?: number; sha256?: string }[] } = {};
  try {
    record = JSON.parse(await read(MANIFEST));
  } catch (error) {
    problems.push(`${MANIFEST} does not parse, so nothing it records can be checked: ${(error as Error).message}`);
  }
  const listed = Array.isArray(record.assets) ? record.assets : [];
  if (!listed.length) problems.push(`${MANIFEST} lists no assets at all, so the worker precaches nothing but the shell`);
  const named = new Set<string>();
  for (const entry of listed) {
    const path = entry?.path;
    if (!path) { problems.push(`${MANIFEST} has an entry with no path`); continue; }
    if (named.has(path)) problems.push(`${MANIFEST} lists ${path} twice, so one file's size and hash are recorded as two`);
    named.add(path);
    const file = Bun.file(`${ROOT}${path}`);
    if (!(await file.exists())) { problems.push(`${MANIFEST} lists ${path}, which is not in the tree`); continue; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength !== entry.bytes) {
      problems.push(`${MANIFEST} records ${path} as ${entry.bytes} bytes; it is ${bytes.byteLength}`);
    }
    const hash = digest(bytes);
    if (hash !== entry.sha256) {
      problems.push(`${MANIFEST} records ${path} as hashing ${entry.sha256}; it hashes ${hash}`);
    }
  }

  /* The map's files, measured off the tree rather than off the record the runs above
     just checked: the record says what should be there, this says what is. */
  const files = await glob(`${ART}**/*`);
  const sizes = await Promise.all(files.map(async (file) => (await Bun.file(`${ROOT}${file}`).arrayBuffer()).byteLength));
  const total = sizes.reduce((sum, size) => sum + size, 0);
  for (const file of files) {
    if (!named.has(file)) {
      problems.push(`${file} is under ${ART} and not in ${MANIFEST}: the worker precaches the manifest's list, so the map would ask for a file it does not have`);
    }
  }
  if (total > ART_BUDGET_KB * 1024) {
    problems.push(`the map's art is ${Math.round(total / 1024)} KB over ${files.length} files, past the ${ART_BUDGET_KB} KB budget: all of it is precached before the map can open`);
  }

  /* No third-party request and no `<script>` from the art — the shipped files and the
     SVG sources beside the packs, because they are the same pictures in the form that
     could carry a reference at all. */
  const art = [...files, ...(await glob('assets/source/map/*.svg'))];
  for (const file of art) {
    const text = await read(file);
    if (/<script\b/i.test(text)) problems.push(`${file} carries a <script>: the art is pictures, and nothing in it runs`);
    const hosts = [...text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]);
    const real = hosts.filter((url) => !NAMESPACES.some((host) => url.includes(host)));
    if (real.length) problems.push(`${file} reaches off this origin (${[...new Set(real)].join(', ')}): an SVG drawn as an <img> is this origin's request unless it names another`);
  }

  /* What the map really asks for, read off `src/ui/assets.js` — the one place the
     map's sprite paths live. A file the manifest lists and no module names is a file
     every visitor downloads and nothing draws, and the count is worth printing. */
  const module = await read('src/ui/assets.js');
  const drawn = new Set([...module.matchAll(/'assets\/map\/[^']+'/g)].map((match) => match[0].slice(1, -1)));
  for (const path of drawn) {
    if (!named.has(path)) problems.push(`src/ui/assets.js names ${path}, which ${MANIFEST} does not list, so the worker would not have it offline`);
  }
  const largest = files.map((file, i) => ({ file, size: sizes[i] })).sort((a, b) => b.size - a.size)[0];
  checks.push(`the map's art: ${files.length} files, ${Math.round(total / 1024)} KB of a ${ART_BUDGET_KB} KB budget, ${drawn.size} of them named by src/ui/assets.js, largest ${largest.file} at ${largest.size} bytes`);
  checks.push(`the manifest matches the tree: ${listed.length} entries, every one a file that is here, at the size and hash it records`);
  checks.push(`the art makes no third-party request and carries no <script> (${art.length} shipped files and SVG sources read)`);
}

for (const c of checks) console.log(`ok   ${c}`);
if (problems.length) {
  console.error('\nFAILED');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nOK — every course rule passes.');
