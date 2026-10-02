/* The offline copy of the game.
 *
 * Two jobs: keep the shell — this app's own files, this origin, GET only — so a
 * reload with no network still opens it, and keep everything
 * `assets/manifest.json` names, so a card that adds a sprite adds it to the
 * manifest and never to this file. The list below is the shell, not the
 * content, and the game's content is the manifest's business.
 *
 * Rules it keeps: only this origin, only GET, no network from here. A file this
 * list holds goes into the list in the same commit that adds it, and a change
 * to a file in it bumps CACHE in the same commit.
 */
/* The cache-name ladder. Read off the branches rather than guessed — measured
   with `git show origin/<branch>:sw.js | grep '^const CACHE'` on the rebase this
   name was kept through: the frozen `v1` tag, and so the name the deleted app
   served, is `learn-chess-v14`, and `main` stands at `learn-chess-v22`. This
   branch keeps `v23`: nobody holds it — read off every branch, local and remote —
   and nothing on any branch is above it.
   The name has to be its own because the shell is served cache-first: the fetch
   handler answers every same-origin GET from the cache and keeps what it
   fetches, so a device that has played before holds the course and the screen this
   branch rewrites — `src/data/lessons.js` and `src/scenes/path.js` — and re-fetches
   neither without a new worker, so it keeps walking the forking path with the wheel
   gesture back to front. `scripts/verify-shell.ts` fails a
   name at or below `v14` for the same reason: reusing a name a device already
   holds leaves the old app in its browser. */
const CACHE = 'learn-chess-v26';

/* The shell: the files the app needs to boot and to draw its first frame. Two
 * rules, and scripts/verify-shell.ts now holds the list to both of them, because
 * this list went stale once and the cost was a broken offline game:
 *
 *   - **It names the screen the game opens on** (`src/main.js`'s `DEFAULT_SCENE`,
 *     `src/scenes/path.js` today), and
 *   - **it is closed under that screen's own imports** — a file here whose import
 *     is not here fails offline at the point it is loaded, and the router reports
 *     that as "there is no screen called …", which is the wrong bug named
 *     confidently.
 *
 * A screen the router imports on demand, and that the game does not open on, is
 * not one of these: `src/scenes/lesson.js`, `src/scenes/kit.js` and
 * `src/scenes/board-fixture.js` are fetched when they are opened and kept from
 * then on, so a start with no network does not need them. docs/SYSTEM.md §4 says
 * what that costs and where it is written down. */
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/main.js',
  'src/data/lessons.js',
  'src/map/banner.js',
  'src/map/edges.js',
  'src/map/marker.js',
  'src/map/road.js',
  'src/map/route.js',
  'src/map/terrain.js',
  'src/path/layout.js',
  'src/path/progress.js',
  'src/path/sheet.js',
  'src/path/stop.js',
  'src/scenes/path.js',
  'src/ui/assets.js',
  'src/ui/button.js',
  'src/ui/chip.js',
  'src/ui/panel.js',
  'src/ui/theme.js',
  'vendor/pixi/pixi.min.mjs',
];

/* The content: every shipped asset, named by the manifest and by nothing else. */
const CONTENT = 'assets/manifest.json';

/* The manifest's list, in either shape it may take — a top-level array or
 * `{ "assets": [...] }` — with each entry a path or an object carrying one.
 * Anything absolute or reaching upwards is dropped: this worker caches this
 * origin's own files and nothing else. */
async function contentFiles() {
  const response = await fetch(CONTENT, { cache: 'no-cache' });
  if (!response.ok) return [];
  const body = await response.json();
  const list = Array.isArray(body) ? body : body.assets;
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => (typeof entry === 'string' ? entry : entry?.path))
    .filter((path) => typeof path === 'string' && path && !/^[a-z]+:/i.test(path) && !path.includes('..'));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);

    /* Content is best-effort and named when it fails: a typo in a sprite's path
     * must not cost a child the whole game, and it must not pass unnoticed
     * either. Before the manifest exists — which is today — this is one 404 and
     * the shell still installs. */
    const files = await contentFiles().catch(() => []);
    const failed = [];
    await Promise.all(files.map((path) => cache.add(path).catch(() => failed.push(path))));
    if (failed.length) console.warn('not cached, and named in assets/manifest.json:', failed.join(', '));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((response) => {
      /* Only a real answer is worth keeping: a 404 cached as a hit would stay
       * wrong for as long as the cache lives. */
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(async () => {
      /* Offline, only a navigation has somewhere to fall back to. An image or a
       * module that is not cached is a failed request, not a page. */
      if (event.request.mode === 'navigate') return (await caches.match('index.html')) ?? Response.error();
      return Response.error();
    })),
  );
});
