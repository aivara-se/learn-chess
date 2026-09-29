#!/usr/bin/env bun
/* The shell's rules, the ones a machine can check with no browser and no
 * network. Run from the repository root:
 *
 *   bun run scripts/verify-shell.ts
 *
 * It answers seven questions: does the page name one module and nothing else,
 * does every file it points at exist, is the manifest this site's, does the shell
 * ask anything of a third party, is the offline worker complete and is its cache
 * name free, is the vendored library the version the repository says it is, and
 * is the publish frame — `.nojekyll` — in place.
 *
 * What it cannot see: whether a frame is drawn, whether the canvas is crisp,
 * whether the app opens with the network off, and whether it looks like a game.
 * Those are the browser check in docs/SYSTEM.md and a pair of eyes, and no
 * script here replaces either.
 *
 * #38 owns the *project's* site verifier (`scripts/verify-site.ts`: the course's
 * data, its graph, its copy budgets), which is a separate file on purpose —
 * this one is about the shell and stays useful without a course in the tree.
 */
import { createHash } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname;
const problems: string[] = [];
const checks: string[] = [];
const notes: string[] = [];
const read = (path: string) => Bun.file(`${ROOT}${path}`).text();
const exists = async (path: string) => await Bun.file(`${ROOT}${path}`).exists();

/* The app's own addresses, kept from the old site check: an absolute URL to one
 * of these is this site talking about itself, not a third-party request. */
const OWN_HOSTS = ['aivara.se', 'aivara-se.github.io', 'w3.org'];

/* `assets/**` is the assets card's (#6) and lands separately: the page names the
 * favicon, the two rendered icons and the apple-touch-icon, and the manifest
 * names the icons it installs with. While one of those files is absent it is a
 * *todo* printed on every run, not a failure — it is another card's file, and a
 * red shell check for work that is in flight is a check people learn to ignore.
 * The todo goes away the run after the file lands, so the gap is visible in CI
 * without being a blocked build. Anything else the page points at must be here. */
const OTHER_CARD_OWNS = 'assets/';

/* 1. the page names one module, and every reference in it resolves */
const html = await read('index.html');
const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
if (scripts.length !== 1 || !/type="module"/.test(scripts[0] ?? '') || !/src="src\/main\.js"/.test(scripts[0] ?? '')) {
  problems.push(`index.html must load exactly one script — src/main.js as a module — and it loads ${scripts.length}: ${scripts.join(' | ')}`);
}
if (/<script\b[^>]*>[^<]/.test(html)) problems.push('index.html carries inline script; the game is modules or it is not');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const pending: string[] = [];
for (const ref of refs) {
  const offsite = /^(https?:)?\/\//.test(ref);
  if (offsite || ref.startsWith('data:')) {
    const host = new URL(ref, 'https://aivara-se.github.io/').host;
    if (!OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`))) {
      problems.push(`index.html references something off this site: ${ref}`);
    }
    continue;
  }
  if (await exists(ref)) continue;
  if (ref.startsWith(OTHER_CARD_OWNS)) pending.push(ref);
  else problems.push(`index.html points at a file that is not here: ${ref}`);
}
checks.push(`index.html loads one module (src/main.js) and its ${refs.length} references are this site's`);

/* 2. the manifest is the app's identity: it parses, it stays on this site, and
 * the icons it names are the ones a home screen installs with. Those icons are
 * read when the browser installs the app rather than when it loads the page, so
 * they are reported here rather than dropped with the page's own links. */
let manifest: { start_url?: string; scope?: string; icons?: { src?: string }[] };
try {
  manifest = JSON.parse(await read('manifest.webmanifest'));
} catch (error) {
  problems.push(`manifest.webmanifest does not parse: ${(error as Error).message}`);
  manifest = {};
}
for (const field of ['start_url', 'scope'] as const) {
  const value = manifest[field];
  if (typeof value !== 'string') problems.push(`manifest.webmanifest has no ${field}`);
  else if (/^(https?:)?\/\//.test(value)) {
    problems.push(`manifest.webmanifest points ${field} off this site (${value}), so the app would install outside it`);
  }
}
const icons = (manifest.icons ?? []).map((icon) => icon.src).filter((src): src is string => !!src);
for (const icon of icons) if (!(await exists(icon))) pending.push(icon);
checks.push(`the manifest parses, stays on this site, and names ${icons.length} icons`);

/* 3. no third-party request, anywhere in the shell's own sources */
/* Every source file under `src/`, not a list of the ones that exist today: a
 * fixed list stops covering exactly the file added next, and the promise this
 * check exists to keep — the app reaches nothing off its own origin — would stop
 * being checked where the code is newest. The list did miss `src/board/**`. */
const sources = ['index.html', 'sw.js', 'manifest.webmanifest'];
for (const file of await Array.fromAsync(new Bun.Glob('src/**/*.js').scan(ROOT))) {
  sources.push(file);
}
for (const file of sources) {
  const text = await read(file);
  const offenders = [...text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]);
  const real = offenders.filter((url) => !OWN_HOSTS.some((host) => url.includes(host)));
  if (real.length) problems.push(`${file} makes a third-party request: ${[...new Set(real)].join(', ')}`);
}
checks.push(`${sources.length} shell sources carry no third-party request (vendor/ is pinned and hashed below)`);

/* 4. the offline worker: complete for the shell, and a cache name nobody holds */
const sw = await read('sw.js');
const cache = sw.match(/const CACHE = '([^']+)'/)?.[1];
/* v14 is the last name `main` ever served (`v1:sw.js`), and what it held was the
 * old app: reusing it would leave a returning visitor's worker serving files
 * that no longer exist. The floor is the reason the ladder is written down. */
const NAME_FLOOR = 15;
if (!cache || !/^learn-chess-v(\d+)$/.test(cache)) problems.push('sw.js has no cache name of the form learn-chess-vN');
else if (Number(cache.split('-v')[1]) < NAME_FLOOR) {
  problems.push(`sw.js caches as ${cache}: below v${NAME_FLOOR} a returning visitor's worker already holds a cache of that name, with the deleted app in it`);
}
const listed = [...sw.matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]);
const SHELL_FLOOR = ['index.html', 'manifest.webmanifest', 'src/main.js'];
for (const need of SHELL_FLOOR) {
  if (!listed.includes(need)) problems.push(`sw.js does not cache ${need}, so the shell is not offline without it`);
}
for (const file of listed) {
  if (file === './') continue;
  if (!(await exists(file))) problems.push(`sw.js caches a file that is not here: ${file}`);
}
const contentAssets = listed.filter((file) => file.startsWith('assets/'));
if (contentAssets.length) {
  problems.push(`sw.js names content in its own list (${contentAssets.join(', ')}): the shipped assets come from assets/manifest.json, so a card adding one never edits this file`);
}
if (!sw.includes("'assets/manifest.json'")) {
  problems.push('sw.js does not read assets/manifest.json, so the content it caches is whatever was true the day it was written');
}
checks.push(`the offline worker caches ${listed.length} shell files, reads the asset manifest, and caches as ${cache}`);

/* 5. the vendored library is the version, and the file, the repository says */
const vendorFiles = ['vendor/pixi/pixi.min.mjs', 'vendor/pixi/LICENSE', 'vendor/README.md'];
const missing = [];
for (const file of vendorFiles) if (!(await exists(file))) missing.push(file);
if (missing.length) {
  problems.push(`the library is not in the repository: ${missing.join(', ')} missing`);
} else {
  const recorded = await read('vendor/README.md');
  const version = recorded.match(/\*\*(\d+\.\d+\.\d+)\*\*/)?.[1];
  const build = await read('vendor/pixi/pixi.min.mjs');
  if (!version) problems.push("vendor/README.md does not record the library's version");
  else if (!build.includes(`"${version}"`)) {
    problems.push(`vendor/README.md says the library is ${version}, and the build does not contain that version string`);
  }
  const sha = createHash('sha256').update(build).digest('hex');
  if (!recorded.includes(sha)) problems.push(`vendor/pixi/pixi.min.mjs hashes ${sha}, which is not the sha256 vendor/README.md records`);
  const licence = await read('vendor/pixi/LICENSE');
  if (!/MIT License/.test(licence)) problems.push("vendor/pixi/LICENSE is not the library's MIT licence");
  const source = recorded.match(/https:\/\/registry\.npmjs\.org\/[^)\s]*\.tgz/)?.[0];
  if (!source) problems.push('vendor/README.md does not say where the build came from');
  else if (!source.endsWith(`-${version}.tgz`)) {
    problems.push(`vendor/README.md points at ${source}, which is not the tarball for ${version}`);
  }
  checks.push(`vendor/ holds pixi.js ${version}, its MIT licence and its source, and the file hashes as recorded`);
}

/* 6. there is no central list of screens: the route is the file name */
if (await exists('src/scenes/index.js')) {
  problems.push('src/scenes/index.js exists: a registry of screens is a file every screen has to edit, and the route is already the file name');
}
const main = await read('src/main.js');
if (!/import\(\s*`\.\/scenes\/\$\{/.test(main)) {
  problems.push('src/main.js does not import a scene by name, so a screen cannot be added without editing it');
}
if (/from '\.\/scenes\//.test(main) || /import\(\s*'\.\/scenes\/[a-z-]+\.js'\s*\)/.test(main)) {
  problems.push('src/main.js imports a screen directly: screens are reached by their route, not by name in the shell');
}
checks.push('the route is the file name: no src/scenes/index.js, no scene imported by the shell itself');

/* 7. the publish frame: Jekyll is off, because Jekyll drops vendor/ */
if (!(await exists('.nojekyll'))) {
  problems.push('there is no .nojekyll: GitHub Pages runs Jekyll without it, Jekyll drops any folder called vendor/, and the published site would 404 its own library');
} else {
  checks.push('.nojekyll is in place, so Pages publishes vendor/ instead of dropping it');
}

if (pending.length) {
  notes.push(`named by the page or the manifest and not in the tree yet — assets/** is the assets card's: ${[...new Set(pending)].join(', ')}`);
}
for (const note of notes) console.log(`todo ${note}`);
for (const check of checks) console.log(`ok   ${check}`);
if (problems.length) {
  console.error('\nFAILED');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nOK — every shell rule passes.');
