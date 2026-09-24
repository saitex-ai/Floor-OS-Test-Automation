# agent-notes

A knowledge base for whichever Claude Code session is working on this repo next — built so a
new session can pick up mid-stream instead of re-discovering everything through trial and error.
This is agent-facing, not human-facing; it complements (doesn't replace) the repo's own
`README.md`/`ONBOARDING.md` and the `test-cases/` docs, which are the source of truth for the
framework's own conventions and for what's actually being tested.

## Files here

- **`progress.md`** — status tracker. What's done, what's in progress, what's blocked and why,
  the very next thing to do. Read this first, every session.
- **`environment-notes.md`** — dev vs. local behavior differences, known instabilities on each,
  where credentials live, and why the shared timeouts are tuned the way they are. Read before
  running any test — several real bugs earlier came from not knowing this up front.
- **`techpack-module.md`** — a deep dive on how the Techpack module actually works: the full
  user flow (List → Create [Classic/AI Mode] → canvas review → finalize), UI structure that isn't
  obvious from a first glance, and real backend behavior (API routes, WebSocket protocol) found
  by inspecting the running app. Only relevant if you're working on Techpack.
- **`master-data-module.md`** — real route/field confirmations for the top-level Master Data
  module (started 2026-09-24, Departments only so far). Only relevant if you're working on Master
  Data.

## How to keep this useful

This folder only earns its keep if it stays current. When you:

- **Finish or unblock a feature area** — update `progress.md`'s status table and remove it from
  "blocked."
- **Hit a new environment quirk** (a timeout that needs adjusting, a new failure mode, a service
  that's down) — add it to `environment-notes.md` with the date and how you confirmed it, not a
  guess.
- **Learn something new about how the app behaves** that took real investigation (not just
  reading the code) — add it to the relevant module file, or create a new one following the same
  pattern for a different module.
- **Contradict something already written here** — fix it in place rather than leaving stale
  information for the next session to trip over. Note the date you changed it if the old
  assumption might still be relevant context (e.g. "as of <date> X was true; as of <date> that
  changed because Y").

Write for a reader who has zero memory of this conversation but full ability to read code and run
commands — explain _why_, not just _what_, and give evidence (a confirmed error message, a real
HTTP status, a screenshot's content) rather than a hunch.
