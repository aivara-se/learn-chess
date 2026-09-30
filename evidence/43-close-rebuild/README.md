# Evidence for #43 — closing the rebuild

A throwaway branch: no site repository carries a screenshot directory, so the render
evidence for the pull request lives here rather than on `main`. Everything below was
produced on 2026-09-30 against `chore/close-the-rebuild`, served over HTTP from the
checkout (`python3 -m http.server`), with `playwright-core` driving the sandbox's
Chromium — and, for the two `-live-` runs, against `https://aivara-se.github.io/learn-chess/`.

| file | what it is |
|---|---|
| `path-360x640.png` | the game's first screen at 360×640, DPR 3 — the map, twelve stops and three packs, one open |
| `path-1280x800.png` | the same at 1280×800, DPR 2 |
| `lesson-end-360x640.png` | `#/lesson/1` walked end to end — the completion panel, four stars of four |
| `lesson-end-1280x800.png` | the same at 1280×800 |
| `offline-after-fix-360x640.png` | a reload with the network **off**, one online visit behind it and the browser's own HTTP cache cleared: the game is there |
| `pack-dead-end-360x640.png` | tapping the open `pin` detour pack: the status line reads “There is no screen called “pack”.” — filed as #59 |
| `browser-check-after.txt` | the browser check, every line, against the branch |
| `browser-check-live-before.txt` | the same check against the live site before the fix — the same offline failure, on the URL |
| `offline-before-and-after.txt` | the precache, listed both ways, with the failing request named |
| `machine-checks.txt` | `bun test`, `verify-shell`, `verify-site` and `verify-drills`, captured from the branch |

Reference a file from an issue or a pull request as
`https://github.com/aivara-se/learn-chess/blob/evidence/43-close-rebuild/evidence/43-close-rebuild/<file>?raw=true` —
GitHub's image upload endpoint wants a logged-in web session, which `gh` does not have.
