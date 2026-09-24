#!/usr/bin/env bun
/* The rules that can be checked mechanically. Run from the repository root:
 *
 *   bun run scripts/verify-site.ts
 *
 * It answers four questions: does every file the page asks for exist, is there
 * any third-party request, does every lesson drill contain a position that is
 * legal and playable, and does the shell carry the markup the app needs. It
 * cannot tell you whether a drill's answer is the best move — that was checked
 * against Stockfish when the drill was written, and has to be re-checked by
 * hand (or by Stockfish) if a position changes.
 */
import { parseFen, legalMoves } from '../js/engine.js';
import { LESSONS } from '../js/lessons.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems: string[] = [];
const checks: string[] = [];
const read = (p: string) => Bun.file(`${ROOT}${p}`).text();
const exists = async (p: string) => await Bun.file(`${ROOT}${p}`).exists();

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
const sources = ['index.html', 'js/app.js', 'js/engine.js', 'js/lessons.js'];
for (const file of sources) {
  if (!(await exists(file))) continue;
  const text = await read(file);
  const offenders = [...text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]);
  const real = offenders.filter((o) => !o.includes('aivara.se') && !o.includes('w3.org'));
  if (real.length) problems.push(`${file} makes a third-party request: ${[...new Set(real)].join(', ')}`);
}
checks.push(`${sources.length} source files checked for third-party requests`);

/* 3. fonts and their licences ship with the app */
for (const f of ['assets/fonts/inter-latin.woff2', 'assets/fonts/space-grotesk-latin.woff2',
  'assets/fonts/OFL-Inter.txt', 'assets/fonts/OFL-SpaceGrotesk.txt']) {
  if (!(await exists(f))) problems.push(`missing font asset: ${f}`);
}
checks.push('fonts and their licences are present');

/* 4. the course: every drill is legal, playable, and its answers are real moves */
let drills = 0;
for (const lesson of LESSONS) {
  if (!lesson.id || !lesson.title || !lesson.goal) problems.push(`lesson without id/title/goal: ${lesson.title}`);
  if (!Array.isArray(lesson.body) || lesson.body.length < 2) problems.push(`lesson ${lesson.id} has no body text`);
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
    const legal = new Set(moves.map((m: any) => `${'abcdefgh'[m.from % 8]}${Math.floor(m.from / 8) + 1}${'abcdefgh'[m.to % 8]}${Math.floor(m.to / 8) + 1}${m.promotion ?? ''}`));
    if (!Array.isArray(drill.accepted) || !drill.accepted.length) problems.push(`${where}: no accepted move`);
    if (!drill.best) problems.push(`${where}: no best move recorded`);
    for (const uci of [...(drill.accepted ?? []), drill.best].filter(Boolean)) {
      if (!legal.has(String(uci).toLowerCase())) problems.push(`${where}: ${uci} is not a legal move in this position`);
    }
  });
}
checks.push(`${LESSONS.length} lessons, ${drills} drills — every FEN legal and every answer a legal move`);
if (LESSONS.length !== 8) problems.push(`expected 8 lessons, found ${LESSONS.length}`);
if (drills !== 24) problems.push(`expected 24 drills, found ${drills}`);

/* 5. the shell carries what the app needs */
if (!/name="viewport"/.test(html)) problems.push('index.html has no viewport meta tag');
if (!/<noscript>/.test(html)) problems.push('index.html has no noscript fallback');
if (!/<script type="module" src="js\/app\.js">/.test(html)) problems.push('index.html does not load js/app.js as a module');
checks.push('shell markup: viewport, noscript fallback, module entry point');

for (const c of checks) console.log(`ok   ${c}`);
if (problems.length) {
  console.error('\nFAILED');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nOK — every mechanical rule passes.');
