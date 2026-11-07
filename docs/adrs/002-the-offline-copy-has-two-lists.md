# 002 - The offline copy has two lists

## Context

`sw.js` precaches what the game needs to open with the network off. Two kinds of file have to be kept
there, and they change at different rates: the files the game needs to boot and draw its first frame,
and the content — sprites, audio, fonts — which a change to a lesson or a board position never touches.

The list went stale once, and it cost the offline game. It still named the shell's old
`placeholder.js`, deleted when the real screens landed, and named none of the files the game opens on.
A visitor who loaded the game once held `index.html` and `src/main.js` and nothing else, and the next
load with no network answered "There is no screen called `path`".

## Decision

Two lists, each with one owner.

- **The shell**, `SHELL` in `sw.js`: the files that boot the game and draw its first frame. Two rules
  hold it, and `scripts/verify-shell.ts` enforces both — it names the screen the game opens on
  (`DEFAULT_SCENE`), and it is closed under that screen's imports. A change that adds a shell file adds
  it there and bumps `CACHE` in the same commit.
- **The content**, `assets/manifest.json`: every shipped asset with its size and hash. The worker
  fetches that file at install and precaches what it names, so a change that adds a sprite never
  touches `sw.js`.

`CACHE` is a name, not a date: it must be one no branch holds and above the `v14` floor, because a
visitor who last loaded the deleted app still holds a worker of the old name. Two branches that take
the same number merge with no conflict marker, so the value is compared across branches rather than
read.

## Consequences

- A screen the router imports on demand is not in `SHELL`. The path — the screen the game opens on — is
  there after one visit; a lesson or a fixture is there only if it has been opened once while online.
  Carrying the whole lesson chain, board, engine and kit on a first visit is a decision for a record,
  not a consequence of this rule.
- A stale list fails the shell check rather than the child's next offline load.
- The first load after a deploy is still the old worker's, because a cache-first worker answers from
  what it holds until the new one takes over. It converges on the next load, which is why the name
  changes rather than the worker's behaviour.
