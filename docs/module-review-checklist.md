# Module PR review checklist

For reviewing a teammate's module scripts (page objects, locators,
fixtures, specs) before merge. Grounded in this repo's actual conventions
— see [README.md](../README.md) for the full rationale behind each of
these; this file is just the pass/fail list to run down during review.

## 1. Scope & ownership

- [ ] Touches only that module's own files: `tests/<tier>/<module>/`,
      `src/pages/<module>/`, `src/locators/<module>/`,
      `src/fixtures/<module>.fixtures.ts`.
- [ ] Any change outside that boundary (`base.page.ts`,
      `playwright.config.ts`, `src/config/`, `src/fixtures/auth-setup.ts`,
      CI workflows) is called out explicitly — those are shared and need
      whole-team review, not a single-module rubber stamp.
- [ ] A new screen adds a matching **pair**: one locators file, one page
      file — never just one of the two.

## 2. Locators vs. pages split

- [ ] `src/locators/<module>/<screen>.locators.ts` holds only
      `readonly Locator` properties (plus simple parameterized finders
      like `columnHeader(name)`). No `.click()`, `.fill()`, or
      `expect()` in this file.
- [ ] `src/pages/<module>/<screen>.page.ts` holds the flows/actions/
      assertions built on `this.locators` — this is where interaction
      logic belongs, including "try the two possible shapes of this
      popup" type branching.
- [ ] Locators were confirmed against the real running app, not guessed —
      watch for leftover `TODO(... QA): replace with a locator specific
      to this module's landing view...` stubs on a screen that's
      supposedly done.
- [ ] Locators prefer role/label-based queries (`getByRole`, `getByLabel`)
      over brittle CSS/XPath, and are scoped tightly enough to avoid
      strict-mode violations (e.g. scope to a banner/section when the
      same accessible name appears elsewhere on the page).
- [ ] Specs never call `page.getByRole(...)` or any raw locator directly —
      only page-object methods.

## 3. Auth & navigation

- [ ] Every module entry point uses `gotoAuthenticated()`, not `goto()` —
      the only exception is the one dedicated login test built on
      `ShellLoginPage`.
- [ ] Regression/sanity/smoke specs reuse the cached session from the
      `<module>-setup` project; no ad hoc per-test login/logout.
- [ ] If a test genuinely needs a fresh, unauthenticated context, it uses
      `test.use({ storageState: { cookies: [], origins: [] } })` —
      **not** `storageState: undefined`, which silently falls back to the
      project's cached session instead of clearing it (confirmed bug,
      see `tests/smoke/crm/smoke-recent.spec.ts`).

## 4. Fixtures

- [ ] Every new page object is wired into that module's
      `src/fixtures/<module>.fixtures.ts`.
- [ ] Specs import `test`/`expect` from the module's fixtures file, not
      straight from `@playwright/test` — unless the spec deliberately
      needs the raw `{ page }` fixture (e.g. a login test).
- [ ] No fixture references another module's page objects.

## 5. Assertions & timing

- [ ] Assertions target durable end state (a saved record, a modal, a
      list row), not transient UI like a save toast that can disappear
      before the assertion runs.
- [ ] No arbitrary `page.waitForTimeout()` — waits are expressed as
      auto-retrying assertions (`expect(locator).toBeVisible()`,
      `.waitFor()`) instead.
- [ ] Any non-default timeout on an assertion has a comment explaining
      why (e.g. a documented cold-start/lazy-load path), rather than a
      bare magic number.

## 6. Test data

- [ ] Created records use unique values per run (e.g. a `Date.now()`
      suffix on names/emails) so reruns don't collide with leftover data
      from a previous run.
- [ ] Data-driven cases load through `readData<T>()` +
      `src/data/<module>/*.json`, not literal arrays hardcoded in the
      spec.

## 7. Suite placement

- [ ] **Smoke** stays minimal — only "is anything badly broken" checks.
      Resist the urge to add real coverage here.
- [ ] **Sanity** has at most one happy-path test per distinct capability,
      deliberately deduplicated.
- [ ] **Regression** keeps one test per test case even where two cases
      are word-for-word identical (traceability to ClickUp, not DRY).
- [ ] New specs landed in the tier folder that actually matches their
      intent.

## 8. Reporting

- [ ] `test.beforeEach` sets `allure.epic()` / `allure.feature()` /
      `allure.owner()`.
- [ ] ClickUp-backed regression cases carry an `allure.tms(url, label)`
      call.

## 9. Environment & secrets

- [ ] No hardcoded URLs/credentials in specs or page objects — everything
      goes through `MODULES` / `moduleCredentials()` / env vars.
- [ ] `.env` changes only touch that module's own `<PREFIX>_*` vars.

## 10. Before requesting review

- [ ] `npm run lint`, `npm run typecheck`, `npm run format` all pass.
- [ ] The changed/new tests were actually run locally (`npm run
      test:<module>`) — green in CI/typecheck isn't a substitute for
      having watched them pass against a real app.
