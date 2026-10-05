# Techpack — Canvas Multi-User Presence

- **User Story:** As a Techpack user viewing a techpack's canvas, I want to see who else is
  currently viewing the same canvas, so I know if a teammate might be reviewing or editing the
  same record at the same time.
- **Test-case set:** not yet created in ClickUp (no ClickUp task exists for this story at time of
  writing — the "ClickUp" column below is left blank rather than filled with placeholder links).
- **Automated in:** [`tests/regression/techpack/05-multi-user-presence.spec.ts`](../../tests/regression/techpack/05-multi-user-presence.spec.ts)
- **Page object:** [`src/pages/techpack/canvas.page.ts`](../../src/pages/techpack/canvas.page.ts) (presence locators) +
  [`src/fixtures/multi-user.ts`](../../src/fixtures/multi-user.ts) (second-user login helper)

Per team direction, verified against both dev.flooros.app and the local `tilt up` stack — see
[`techpack-list.md`](./techpack-list.md) for the shared environment notes that apply here too.
**The live cursor (does another user's mouse position render as a visible, moving indicator) is
deliberately out of scope for this doc** — only presence (avatar badges showing who else is
viewing) is covered here; the cursor is a separate, still-open piece of work — see
`techpack-module.md`'s Multi-user presence section.

| #    | Test case                                                                                     | Steps                                                                                                                                 | Expected result                                                                                                                                                                                                                                                                                                                       | ClickUp | Automated | Verified (uat)                                 | Verified (dev) | Verified (local) |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------- | ---------------------------------------------- | -------------- | ---------------- |
| TC:1 | Verify a lone viewer sees their own identity and a zero-count presence indicator              | 1. Create a fresh techpack and open its canvas as Alice, alone.                                                                       | The toolbar shows "Signed in as Alice" (her own identity); the presence indicator's own accessible label reads "0 other participants, plus you" (the container itself is always present, just with a zero count).                                                                                                                     | —       | ✅        | ✅ pass (2026-09-29)                           | ✅ 2026-09-10  | ✅ 2026-09-10    |
| TC:2 | Verify a second user's presence shows correctly, bidirectionally, then clears when they leave | 1. Alice opens a fresh techpack's canvas.<br>2. Bob (a genuinely separate login) opens the same canvas URL.<br>3. Bob navigates away. | Once Bob joins: Alice's presence indicator reads "1 other participant" and contains an avatar labeled "Bob QCLead"; Bob's own view symmetrically shows Alice's avatar ("Alice Planner") alongside his own "Signed in as Bob" label. After Bob leaves: Alice's indicator reverts to "0 other participants", same as TC:1's solo state. | —       | ✅        | ✅ pass (2026-10-05) — bob now signs in on uat | ✅ 2026-09-10  | ✅ 2026-09-10    |

## Notes for whoever picks this up next

Written 2026-09-10, based on live two-user exploration on dev (real Alice + real Bob sessions,
not an accidentally-shared one — see the `storageState` gotcha below).

**The presence widget's DOM is clean and well-labeled — confirmed via a real outerHTML dump, not
guessed:**

```html
<div class="..." aria-label="1 other participant, plus you">
  <ul role="list" class="...">
    <li>
      <button type="button" aria-label="Bob QCLead" data-slot="tooltip-trigger">
        <span aria-hidden="true" class="... bg-orange-500 ...">BQ</span>
      </button>
      <span aria-label="In this section" class="..."></span>
      <!-- online-status dot -->
    </li>
  </ul>
  <div class="..." aria-label="Signed in as Alice">
    <span title="Alice Planner" aria-hidden="true" class="... bg-pink-500 ...">AP</span>
    <span>Alice</span>
  </div>
</div>
```

- **This session's own identity** is always shown via a `div[aria-label="Signed in as {FirstName}"]`
  — present even when viewing alone.
- **The "other participants" wrapping container is _always_ in the DOM, even when alone** — its
  own `aria-label` reads "0 other participants, plus you" in that case, not an absent element.
  **Correcting an earlier, wrong assumption from this session's own exploration**: an
  `ariaSnapshot()` dump of a solo session simply hadn't printed this particular generic wrapper
  when its count was zero, which looked like — but wasn't — the element being absent; a real test
  run against the live app proved it's there with count 0. So "is anyone else here" needs reading
  the leading number out of this container's own `aria-label` (`CanvasPage.otherParticipantsCount()`
  parses it), not a presence/absence check on the locator itself. Other viewers themselves are
  `<li>` items inside a `<ul role="list">` nested within that same container — those genuinely do
  only exist once someone else has actually joined.
- Each other-viewer's own avatar button carries an unambiguous `aria-label` of their full display
  name (e.g. "Bob QCLead") — reliable for a specific-person assertion, no substring/collision risk
  (unlike this app's cases elsewhere where accessible names collide with unrelated text).

**Building a genuinely separate second user's session took real debugging — the two gotchas
below are the reason this suite exists as automated tests, not a manual one-off check, and are
worth remembering for _any_ future multi-user Playwright test in this repo, not just this one:**

1. **A plain `browser.newContext()` silently inherits the current project's default
   `storageState`** (every module project sets `use: { storageState: authFile(id) }` in
   `playwright.config.ts`) — six consecutive manual attempts at this exact test "logged in as Bob"
   without ever erroring, yet the resulting session was still genuinely Alice throughout. Fixed by
   `src/fixtures/multi-user.ts`'s `loginAsUser()`, which explicitly passes
   `storageState: undefined` to get a truly clean context before logging in as a different user.
2. **After that login, a plain `page.goto(canvasUrl)` lands back on the "Welcome to FloorOS" gate
   — even with a valid session cookie** (see `BasePage.gotoAuthenticated()`'s own doc comment: a
   fresh top-level navigation always shows this gate first; clicking "Sign in" against an
   already-valid cookie completes silently, no form, but still takes a few seconds). Use
   `new CanvasPage(bobPage).gotoAuthenticated(canvasUrl)`, not a raw `goto()`, for any subsequent
   navigation as the second user.
3. **The OIDC callback lands on shell root first, then the SPA client-side-routes to the real
   target path — this redirect alone can take 15-18s**, not a couple of seconds (same finding
   independently documented for the Planning module's own login flow). Wait for the real target
   URL, not a fixed short timeout, before asserting anything.
4. **The second user's very first navigation in a fresh context also needs to clear the Techpack
   remote's own "Loading Techpacks…" bundle-load cold-start** (same as any other first-time
   navigation elsewhere in this repo) — `CanvasPage.expectLoaded()` with its existing 30s default
   (bump if needed) handles this; don't assume the canvas is ready just because the URL matches.

**Presence sync isn't instant — poll generously, and expect either direction to lag.** The first
real spec runs against local intermittently failed TC:2's join assertions with a plain 15s
`expect.poll()` timeout — but which side failed varied between runs (one run: Alice's view never
saw Bob join within 15s; a separate run: Bob's own view never saw Alice within 15s). Since it was
never both directions failing in the same run, and the identical flow was consistently reliable
on dev, this points to a local-specific propagation delay in the join broadcast (WebSocket
round-trip to both clients) rather than a structural one-directional bug in either client's
rendering. Fixed by widening every join/leave `expect.poll()` in TC:2 to a 45s timeout — actual
runs since then complete in ~20-25s on local, well under that ceiling, so the wider timeout is
headroom against a recurrence, not evidence it's regularly slow. If TC:2 starts flaking again,
don't just re-widen the timeout again without checking whether the underlying join broadcast
itself has slowed down.

**Scope boundary, deliberate**: this doc only covers presence (avatar badges appearing/
disappearing). The live cursor itself — whether another user's mouse position renders as a
visible, moving indicator — is intentionally not covered here; see `techpack-module.md`'s
Multi-user presence section for what's been tried and what's still unconfirmed. Also not
covered: what happens with 3+ simultaneous viewers (only ever tested with exactly two), and
whether presence updates have any noticeable lag under real network conditions (dev's own
slowness aside).

## Update 2026-09-25 — UAT added, not yet exercised

Per the user's direction, UAT is now the primary verification target; added a "Verified (uat)"
column above (not yet run — this doc's area wasn't touched during this session's exploration
pass, which focused on the List/Create/Canvas/BOM areas instead). **Bob's UAT credentials haven't
been confirmed yet** — only `alice` was verified working on uat this session (see
the Techpack QA's environment notes); before TC:2 can run on uat, confirm `bob` (the
same org-wide seeded-account convention used on dev/local) actually works there too, the same way
this session confirmed alice's.

## Update 2026-09-29 — TC:1 run for real (pass); TC:2 confirmed genuinely blocked on uat

Ran TC:1 live against uat as part of broadening this session's Techpack regression coverage — a
clean pass, no changes needed. Before attempting TC:2, checked the open question from the note
above directly: a standalone login attempt with `bob` against `uat.flooros.app` did
**not** reach an authenticated state (no "Open user menu" button appeared; session stayed on the
unauthenticated shell root) — confirmed via a real login attempt, not assumed. So TC:2 is not run
this session, but for a genuinely different reason than "not yet gotten to it": **uat currently
has no working `bob` account under the dev/local seeded-account convention**, an infrastructure
gap, not an app bug. `.env`'s `BOM_USER_UAT`/`TECHPACK_USER_UAT` only define `alice` for uat,
consistent with this. Revisit once a second real uat account (any user, not necessarily named
"bob") is available to log in as.

## Update 2026-10-05 — bob works on uat; TC:2 passes

`bob` (Bob QCLead, role Qc-lead) now signs in on uat — confirmed with a real login. With
`TECHPACK_SECOND_USER_UAT` / `TECHPACK_SECOND_PASSWORD_UAT` set in `.env`, TC:2 runs on uat and
passes: alice sees bob's avatar join, bob sees alice's, and alice's indicator clears when he leaves.
