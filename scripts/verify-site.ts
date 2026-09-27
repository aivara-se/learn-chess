#!/usr/bin/env bun
/* The rules that can be checked mechanically. Run from the repository root:
 *
 *   bun run scripts/verify-site.ts
 *
 * It answers five questions: does every file the page asks for exist, is there
 * any third-party request, is the offline file list complete, does the course
 * hold together (positions legal, answers legal, one idea per drill, copy inside
 * its budgets), and does the shell carry the markup the app needs.
 *
 * It cannot tell you whether a drill's answer is the best move or whether the
 * accepted list is the right width — scripts/verify-drills.ts asks Stockfish
 * that, and docs/DRILLS.md is the record.
 */
import { parseFen, legalMoves } from '../js/engine.js';
import { LESSONS } from '../js/lessons.js';

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
for (const lesson of LESSONS) {
  if (!lesson.id || !lesson.title || !lesson.goal) problems.push(`lesson without id/title/goal: ${lesson.title}`);
  if (ids.has(lesson.id)) problems.push(`two lessons share the id ${lesson.id}`);
  ids.add(lesson.id);
  if (!Array.isArray(lesson.body) || lesson.body.length < 2) problems.push(`lesson ${lesson.id} has no body text`);
  if ((lesson.title ?? '').length > BUDGET.title) problems.push(`lesson ${lesson.id}: title is ${lesson.title.length} chars (budget ${BUDGET.title})`);
  if ((lesson.goal ?? '').length > BUDGET.goal) problems.push(`lesson ${lesson.id}: goal is ${lesson.goal.length} chars (budget ${BUDGET.goal})`);
  if (lesson.diagramCaption && lesson.diagramCaption.length > BUDGET.caption) problems.push(`lesson ${lesson.id}: caption is ${lesson.diagramCaption.length} chars (budget ${BUDGET.caption})`);
  (lesson.body ?? []).forEach((para: string, i: number) => {
    longest.body = Math.max(longest.body, para.length);
    if (para.length > BUDGET.body) problems.push(`lesson ${lesson.id}: paragraph ${i + 1} is ${para.length} chars (budget ${BUDGET.body})`);
  });
  if (!lesson.diagram) problems.push(`lesson ${lesson.id} has no diagram position`);
  else {
    try { parseFen(lesson.diagram); } catch { problems.push(`lesson ${lesson.id} has an unparseable diagram FEN`); }
  }
  const list = lesson.drills ?? [];
  if (!list.length) problems.push(`lesson ${lesson.id} has no drills`);
  list.forEach((drill: any, i: number) => {
    drills++;
    const where = `${lesson.id} drill ${i + 1}`;
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
checks.push(`${LESSONS.length} lessons, ${drills} puzzles — every FEN legal and every answer a legal move`);
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

for (const c of checks) console.log(`ok   ${c}`);
if (problems.length) {
  console.error('\nFAILED');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nOK — every mechanical rule passes.');
