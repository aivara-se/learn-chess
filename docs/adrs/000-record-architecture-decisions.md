# 000 - Record Architecture Decisions

## Context

This repository's documents say what the game is and how it is served, and the course is data that
grows a stop at a time. A choice that is expensive to reverse — a dependency, the shape of the course
data, a screen that is dropped — needs a home a later reader can find, and a status that does not
depend on someone remembering it.

## Decision

One significant decision per file in `docs/adrs`, as Markdown. A decision is **Accepted** when its
file is merged into `main`, and **In Review** while its pull request is open. An accepted record is
not edited: a decision that contradicts it is a new record that names the clause it overrides, and the
old file stays as the account of what was believed then.

A record is written before the code that depends on it, and it says what the choice costs, not only
what it buys.

## Consequences

- The why behind a choice is searchable and outlives the person who made it.
- A reader can tell which decisions are live and which are history.
- A decision that inverts costs a new file rather than a rewrite.
