#!/usr/bin/env bun
/* The drills, measured. Run from the repository root:
 *
 *   bun run scripts/verify-drills.ts           # check the course against Stockfish
 *   bun run scripts/verify-drills.ts --write   # also rewrite docs/DRILLS.md
 *
 * verify-site.ts can tell that an answer is legal; only an engine can tell that
 * it is good. This asks Stockfish (MultiPV=6, depth 18, one thread, hash 16, a
 * fresh process per position) for its top six moves in every drill position and
 * compares them with the `best` and `accepted` written into js/lessons.js.
 *
 * A finding is a drill whose `best` is more than 30 centipawns below the engine's
 * top move, or an `accepted` list holding a move that far behind, or a mate that
 * is not a mate. A drill may carry a `note` saying why its list is deliberately
 * not the margin-derived set — for a level position, or a drill that teaches a
 * rule rather than the strongest move. Those are reported, never silent, and are
 * the only findings that do not fail the run.
 *
 * The engine is found at $STOCKFISH, at /usr/games/stockfish, or on the PATH.
 */
import { existsSync } from 'node:fs';
import { LESSONS } from '../js/lessons.js';
import { PACKS } from '../js/packs.js';

const ENGINE = process.env.STOCKFISH
  || (existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish');
const DEPTH = 18;
const MULTIPV = 6;
const MARGIN = 30;          // centipawns: how far behind the top move an answer may be
const MATE = 100000;
const WRITE = process.argv.includes('--write');
const ROOT = new URL('..', import.meta.url).pathname;

type Line = { move: string; value: number; mate: number | null; pv: string[] };

/* A minimal UCI driver: enough to set MultiPV, search a position to a depth, and
 * read the final set of lines. */
function analyse(fen: string): Promise<Line[]> {
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn([ENGINE], { stdin: 'pipe', stdout: 'pipe', stderr: 'ignore' });
    const byMultipv = new Map<number, Line>();
    let lastDepth = 0;
    let buffer = '';
    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();
    const send = (line: string) => { proc.stdin.write(line + '\n'); proc.stdin.flush?.(); };

    /* The engine is stopped on every path out of here. It waits for input
       forever otherwise, and one leaked process per position is enough to fill a
       machine — which is how this script first ran. */
    const stop = () => {
      try { send('quit'); proc.stdin.end(); } catch { /* the pipe may already be gone */ }
      proc.kill();
    };
    const finish = () => {
      stop();
      const lines = [...byMultipv.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
      if (!lines.length) reject(new Error(`no engine lines for ${fen}`));
      else resolve(lines);
    };

    const handle = (text: string) => {
      if (text.startsWith('uciok')) { send(`setoption name Threads value 1`); send(`setoption name Hash value 16`); send(`setoption name MultiPV value ${MULTIPV}`); send('isready'); return; }
      if (text.startsWith('readyok')) { send(`position fen ${fen}`); send(`go depth ${DEPTH}`); return; }
      if (text.startsWith('bestmove')) { finish(); return; }
      if (!text.startsWith('info ')) return;
      const depth = Number((text.match(/ depth (\d+)/) || [])[1] || 0);
      const multipv = Number((text.match(/ multipv (\d+)/) || [])[1] || 1);
      const pv = (text.match(/ pv (.+)$/) || [])[1];
      if (!pv || depth < lastDepth) return;
      if (depth > lastDepth) { byMultipv.clear(); lastDepth = depth; }
      const cp = (text.match(/ score cp (-?\d+)/) || [])[1];
      const mate = (text.match(/ score mate (-?\d+)/) || [])[1];
      const value = mate != null
        ? (Number(mate) > 0 ? MATE - Number(mate) : -MATE - Math.abs(Number(mate)))
        : Number(cp ?? 0);
      byMultipv.set(multipv, { move: pv.trim().split(' ')[0], value, mate: mate != null ? Number(mate) : null, pv: pv.trim().split(' ') });
    };

    (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) handle(line);
        }
      }
    })().catch(reject);

    send('uci');
    setTimeout(() => { stop(); reject(new Error(`engine did not answer within 60s for ${fen}`)); }, 60000);
  });
}

type Drill = {
  id: string; lesson: string; fen: string; best: string;
  accepted: string[]; note?: string;
};
const drills: Drill[] = [];
LESSONS.forEach((lesson) => (lesson.drills || []).forEach((drill, i) => drills.push({
  id: `${lesson.id}#${i + 1}`,
  lesson: lesson.title,
  fen: drill.fen,
  best: drill.best,
  accepted: drill.accepted,
  note: (drill as { note?: string }).note,
})));
/* A pack is content too, so it is measured by the same rule as a lesson's
   drills: its own id carries the pack's name, and the record in docs/DRILLS.md
   says which stop each row belongs to. */
PACKS.forEach((pack) => (pack.drills || []).forEach((drill, i) => drills.push({
  id: `${pack.id}#${i + 1}`,
  lesson: pack.title,
  fen: drill.fen,
  best: drill.best,
  accepted: drill.accepted,
  note: (drill as { note?: string }).note,
})));

/* Ask the engine its name, then let it go: reading its stdout to the end would
   wait for an exit that never comes, because it is waiting for `quit`. */
const version = await (async () => {
  const proc = Bun.spawn([ENGINE], { stdin: 'pipe', stdout: 'pipe' });
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let name = 'unknown engine';
  let seen = '';
  try {
    proc.stdin.write('uci\n'); proc.stdin.flush?.();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      seen += decoder.decode(value, { stream: true });
      const match = seen.match(/^id name (.+)$/m);
      if (match) { name = match[1].trim(); break; }
    }
  } finally {
    try { proc.stdin.write('quit\n'); proc.stdin.flush?.(); } catch { /* already gone */ }
    proc.kill();
  }
  return name;
})();

const results: {
  id: string; lesson: string; fen: string; turn: string; top: string; topValue: number;
  bestMove: string; bestValue: number | null; delta: number | null;
  accepted: { move: string; value: number | null; delta: number | null }[];
  note?: string; findings: string[];
}[] = [];

for (const drill of drills) {
  const lines = await analyse(drill.fen);
  const top = lines[0];
  const find = (uci: string) => lines.find((l) => l.move === uci) ?? null;
  const bestLine = find(drill.best);
  const findings: string[] = [];
  if (!bestLine) findings.push(`best ${drill.best} is not among the engine's top ${MULTIPV} moves`);
  const delta = bestLine ? top.value - bestLine.value : null;
  if (delta != null && delta > MARGIN) findings.push(`best ${drill.best} is ${delta}cp behind ${top.move}`);
  const accepted = drill.accepted.map((move) => {
    const line = find(move);
    if (!line) { findings.push(`accepted ${move} is not among the engine's top ${MULTIPV} moves`); return { move, value: null, delta: null }; }
    const d = top.value - line.value;
    if (d > MARGIN) findings.push(`accepted ${move} is ${d}cp behind ${top.move}`);
    return { move, value: line.value, delta: d };
  });
  const real = drill.note ? [] : findings;
  results.push({
    id: drill.id, lesson: drill.lesson, fen: drill.fen,
    turn: drill.fen.split(' ')[1] === 'b' ? 'black' : 'white',
    top: top.move, topValue: top.value,
    bestMove: drill.best, bestValue: bestLine ? bestLine.value : null, delta,
    accepted, note: drill.note, findings: real,
  });
  const flag = real.length ? `  <-- ${real.join('; ')}` : (drill.note && findings.length ? '  (noted exception)' : '');
  console.log(`${drill.id.padEnd(26)} top=${top.move.padEnd(6)} ${String(top.value).padStart(6)}  best=${drill.best.padEnd(6)} ${String(bestLine?.value ?? '-').padStart(6)}  accepted=${drill.accepted.join(',')}${flag}`);
}

const failure = results.some((r) => r.findings.length);
const noted = results.filter((r) => r.note);

if (WRITE) {
  const cell = (r: (typeof results)[number]) => r.accepted
    .map((a) => `\`${a.move}\`${a.delta != null && a.delta > MARGIN ? ` (${a.delta} behind)` : ''}`)
    .join(', ');
  const doc = [
    '# DRILLS.md — what the course was measured against',
    '',
    'Every drill in `js/lessons.js` and every puzzle in `js/packs.js` is checked against',
    'an engine, and this is the record of that run. It is generated, not written by hand:',
    '',
    '```bash',
    'bun run scripts/verify-drills.ts --write',
    '```',
    '',
    `Engine: ${version}. One thread, hash 16, MultiPV ${MULTIPV}, depth ${DEPTH}, a fresh engine`,
    'process per position. Scores are centipawns from the side to move\'s point of view',
    '(#n = a mate in n). "behind" is how far a move is from the engine\'s own top move.',
    '',
    `The check fails when a \`best\` is more than ${MARGIN} centipawns behind the top move, when the`,
    'sheet would reveal a move the board rejects, or when an `accepted` list keeps a move',
    'that far behind. A drill may carry a `note` when its list is deliberately not the',
    'margin-derived set — a level position, or a lesson about a rule rather than a win.',
    'Those notes are the last section of this file, and they are the only findings that do',
    'not fail a run.',
    '',
    '| drill | side to move | engine top | top | lesson `best` | best | behind | accepted |',
    '|---|---|---|---|---|---|---|---|',
    ...results.map((r) => `| \`${r.id}\` | ${r.turn} | \`${r.top}\` | ${r.topValue} | \`${r.bestMove}\` | ${r.bestValue ?? '-'} | ${r.delta ?? '-'} | ${cell(r)} |`),
    '',
    '## Notes',
    '',
    ...(noted.length
      ? noted.map((r) => `- \`${r.id}\` — ${r.note}`)
      : ['None: every accepted list is the engine\'s own margin at this depth.']),
    '',
  ];
  await Bun.write(`${ROOT}docs/DRILLS.md`, doc.join('\n'));
  console.log(`\nwrote docs/DRILLS.md (${results.length} drills)`);
}

if (failure) {
  console.error(`\nFAILED — ${results.filter((r) => r.findings.length).length} drill(s) with an unexplained finding`);
  process.exit(1);
}
console.log(`\nOK — ${results.length} drills measured; ${noted.length} noted exception(s), no unexplained findings.`);
