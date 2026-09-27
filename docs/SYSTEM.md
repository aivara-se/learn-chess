# SYSTEM.md — how this app is served

Everything is static. The repository *is* the app: the committed files are the published files.

| | |
|---|---|
| Host | GitHub Pages (`aivara-se/learn-chess`) |
| Source | branch `main`, folder `/` (root) |
| Build | none |
| TLS | GitHub-managed certificate |
| Backend | none — no server, no database, no API, no analytics |
| Storage | the visitor's `localStorage`, for their progress only |
| Offline | `sw.js` keeps the app's own files in the browser's cache, cache-first, this origin and GET requests only |
| Installing | `manifest.webmanifest` plus the PNG icons in `assets/`, so a home screen shows the mark rather than a screenshot |
| Share card | `assets/share-card.png`, 1200×630, named in the page's `og:image` |
| DNS | the domain owner (Cloudflare), only if a subdomain is pointed at it |

## 1. Enable Pages

Repository → **Settings → Pages** → *Deploy from a branch* → `main`, folder `/ (root)` → Save.

Via API, if the agent has admin on the repository:

```bash
gh api -X POST repos/aivara-se/learn-chess/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Until a subdomain is pointed here, the app is reachable at <https://aivara-se.github.io/learn-chess/> — that address works on a public repository with no DNS change at all, and it is enough to hand the link to anyone.

## 2. A subdomain, if wanted

The bot sites each have their own record (`mama`, `meme`, `mimi`, `momo` → `aivara-se.github.io`, DNS only). A subdomain for this app is the owner's decision and one more record of the same shape — for example `learn` → `aivara-se.github.io`, proxy **off**. The `CNAME` file goes in
**last**, after the record resolves, exactly as in the bot sites' `docs/SYSTEM.md`: claiming a
domain in the repository while DNS still points elsewhere publishes a canonical address that does not answer.

## 3. Verifying a deploy

```bash
# Pages enabled and pointed where you expect
gh api repos/aivara-se/learn-chess/pages --jq '{url: .html_url, cname: .cname, https: .https_enforced}'

# last build: 'built' is the success value (~30s-2min after a push)
gh api repos/aivara-se/learn-chess/pages/builds/latest --jq '{status, error, duration, created_at}'

# it serves, and serves this app
curl -sI https://aivara-se.github.io/learn-chess/ | head -1
curl -s  https://aivara-se.github.io/learn-chess/ | grep -o '<title>[^<]*</title>'
curl -sI https://aivara-se.github.io/learn-chess/js/engine.js | head -1   # 200, and text/javascript
curl -sI https://aivara-se.github.io/learn-chess/sw.js | head -1          # 200, text/javascript
curl -sI https://aivara-se.github.io/learn-chess/manifest.webmanifest | head -1
curl -sI https://aivara-se.github.io/learn-chess/assets/share-card.png | head -1
```

```bash
# the mechanical rules: files present, offline list complete, markup, course budgets
bun run scripts/verify-site.ts
```

Then what a script cannot see: open it on a phone at ~360px, play a lesson drill and a game move, and read the rendered page — a screenshot, not the source. `js/` is served as file content, so a wrong MIME type or a path error shows up here and nowhere else.

Two things to know about the offline worker and the share card, both consequences of a static host:

- **`sw.js` is a cache, so it can serve what it holds.** The cache name is versioned
  (`learn-chess-v1`): a change to a cached file ships with a new name in the same commit, or a
  returning visitor keeps the old file. `scripts/verify-site.ts` fails a file that is served but
  missing from the worker's list. To check it by hand: load the app once, set the network off, and
  reload — the lessons must still be there.
- **`og:image` is an absolute URL**, because some services that read it will not resolve a relative
  one. It names the published address, so pointing a subdomain here means changing that one line in
  `index.html` in the same change that adds the record.

## 4. What cannot be done from a static host

Nothing on this app needs it, but so the boundary is written down: no server-side secrets, no private data, and nothing that must not be public. Pages has no staging environment — a merge to `main` is a deploy, so a change reaches the audience the moment it lands.

The service worker is not a server and does not make one possible: it only ever stores this app's own
files for this visitor, and it refuses any request that is not a GET on this origin. Nothing about a
visitor leaves their browser, and a file can only be cached by being served first.
