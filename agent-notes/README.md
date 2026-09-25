# agent-notes

A knowledge base for whichever Claude Code session is working on this repo next — built so a
new session can pick up mid-stream instead of re-discovering everything through trial and error.
This is agent-facing, not human-facing; it complements (doesn't replace) the repo's own
`README.md`/`ONBOARDING.md` and the `test-cases/` docs, which are the source of truth for the
framework's own conventions and for what's actually being tested.

## Files here

This branch/PR only ships one module note file — others (a `progress.md` status tracker,
`environment-notes.md`, and per-module deep dives for other modules) may exist on sibling
branches for Planning/Techpack work done in parallel; don't assume they're present here until
those land too. Only list a file below once it's actually committed on whatever branch you're
reading this from.

- **`master-data-module.md`** — real route/field confirmations for the top-level Master Data
  module (started 2026-09-24: Departments, Employees, Sites). Only relevant if you're working on
  Master Data.

## How to keep this useful

This folder only earns its keep if it stays current. When you:

- **Learn something new about how the app behaves** that took real investigation (not just
  reading the code) — add it to the relevant module file, or create a new one following the same
  pattern for a different module, and add it to the list above.
- **Contradict something already written here** — fix it in place rather than leaving stale
  information for the next session to trip over. Note the date you changed it if the old
  assumption might still be relevant context (e.g. "as of <date> X was true; as of <date> that
  changed because Y").

Write for a reader who has zero memory of this conversation but full ability to read code and run
commands — explain _why_, not just _what_, and give evidence (a confirmed error message, a real
HTTP status, a screenshot's content) rather than a hunch.
