/* The app's own files, kept in a cache, so a reload with no network still works.
 *
 * The footer promises "no internet needed after it loads", and that was not true:
 * the browser's own cache is heuristic, GitHub Pages expires it after ten
 * minutes, and a reload offline came back as ERR_INTERNET_DISCONNECTED. This
 * file is what makes the promise true, and what lets the app be added to a home
 * screen and opened like an app rather than a page.
 *
 * Rules it keeps: only this origin, only GET, no network from here. Bump CACHE
 * when the files change, and add a new file to FILES in the same commit that
 * adds it — scripts/verify-site.ts checks that FILES covers the app and that
 * every file in it is really here; the bump is checked by reading it.
 */
/* The cache name ladder, since several pull requests change cached files at once.
   Read off the branches rather than guessed, and named by the pull request a reader
   can still open — measured with `git show origin/<branch>:sw.js | grep 'CACHE ='`:
   `main` is `v10` (the boss stops landed as `f18ca48`), #30 (`feat/detour-packs-2`)
   holds `v12`, and this branch, #29, takes `v13` — the next name nobody holds. It
   moved on from `v11` because the tree it names changed under review: a name that
   means two different sets of files is how a stale copy outlives the change, and a
   reviewer who loaded `v11` would keep the old `js/app.js` through a reload. Land
   the lower name first when both are approved — #30's `v12` before this `v13` — and
   the ladder stays monotonic, with the later branch paying only the rebase it
   needed anyway. */
const CACHE = 'learn-chess-v13';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'js/app.js',
  'js/badges.js',
  'js/daily.js',
  'js/engine.js',
  'js/lessons.js',
  'js/sound.js',
  'assets/favicon.svg',
  'assets/icon-180.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/share-card.png',
  'assets/fonts/inter-latin.woff2',
  'assets/fonts/space-grotesk-latin.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
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
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
      /* Only a real answer is worth keeping: a 404 cached as a hit would stay wrong
         for as long as the cache lives. */
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return res;
    }).catch(() => caches.match('index.html'))),
  );
});
