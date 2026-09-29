# vendor/ — the library, in the repository

The game ships one third-party file. It is **here** rather than fetched from a
CDN because the app promises that loading it makes no third-party request, and a
CDN is also a second thing that has to be up for the game to work offline. A
copy in the repository keeps both promises literally true.

## pixi.js 8.16.0 — `vendor/pixi/pixi.min.mjs`

| | |
|---|---|
| Version | `pixi.js` **8.16.0** (the production ESM build, `dist/pixi.min.mjs`) |
| Licence | **MIT** — the package's own `LICENSE`, beside it at `vendor/pixi/LICENSE` (Copyright © 2013-2023 Mathew Groves, Chad Engler) |
| Source | <https://registry.npmjs.org/pixi.js/-/pixi.js-8.16.0.tgz>, path `package/dist/pixi.min.mjs` |
| Tarball | 14 303 284 bytes, sha512 `gu2xw3sZGAn3cWBtk0HqTQT+v19YAfiaYXwUGgWoJl5NKz4cEZJUgWrwkmdfDszGyYBAGqOvJNbd2M9+vzLLMg==` — the integrity the registry publishes for 8.16.0, checked after download |
| File | 778 605 bytes, sha256 `2016ca8067a40753a4ca96b75ab7cbce46e6efad2a32d630cd7c3bcc37417ebb` |
| Project | <https://github.com/pixijs/pixijs> |

The file is unmodified. The version it claims is the version recorded here:
`bun run scripts/verify-shell.ts` reads the number in the table above, finds it
in the build, and re-hashes the file — so a swap, a patch or a hand-edit fails a
check rather than a player's browser.

## Updating it

1. Download the new tarball from the registry and check its `sha512` against the
   integrity the registry publishes for that version.
2. Replace `pixi.min.mjs` and `LICENSE`, and update every number in the table
   above — the check compares them, so a table that was not updated is a failure.
3. Bump `CACHE` in `sw.js` in the same commit: the file is in the offline list,
   and a change to a listed file ships with a new cache name or a returning
   visitor keeps the old one.
4. Play one lesson before and after. The library is the floor everything else
   stands on, and no check here renders a frame.
