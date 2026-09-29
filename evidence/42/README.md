# Evidence — the path (issue #42)

Screenshots of the map a child walks, taken from the branch's own tree while
`~/tmp/pw/path-check.ts` ran against it. Every image is a browser screenshot at
`deviceScaleFactor: 2`, so a `360x640` name is a 360x640 **viewport** in a 720x1280 file.

The check that took them:

```
cd ~/tmp/pw
bun serve-learn-chess.ts <a worktree of the branch> 8793   # in one shell
TREE=<that worktree> BASE=http://127.0.0.1:8793/ bun path-check.ts
```

It reported `55/55 checks passed — the path is the map the course describes.`, with the
record seeded through `localStorage` for each state, and every tap a real pointer event
rather than a call into the page.

| file | the state it shows |
|---|---|
| `fresh-360x640.png` | nothing solved yet: one open stop wearing its number, Pip standing on it with the ring and "you are here", the rest locked with the lesson that opens each one written underneath |
| `locked-sheet-360x640.png` | a tap on a locked stop: the sheet names the lesson that opens it, and offers the button that walks there |
| `half-walked-360x640.png` | the first lesson finished: its tick and four stars, the fork's two branches open, the merge behind them still locked, Pip moved down, the walked leg solid and the rest dotted |
| `walked-390x640.png` | the whole course finished: every stop ticked, `Rank: King`, `44 first-try` and `44 solved` |
| `half-walked-900x1000.png` | the same half-walked path on a wide window: the map is a 520px column with margins rather than a stretched phone |

What the images do **not** show, and what was checked instead of looking: the map
scrolls (a drag and a wheel, clamped, with the page itself never scrolling), the 6px
tap/drag threshold, the star row matching each stop's real puzzle count, the header
never being tapped through, and `#status` carrying the tapped stop's sentence — all
assertions in `path-check.ts`, not something an eye can confirm from a still.
