# pw-hybrid-framework

QA automation framework for **floorOS**, organized so **one QA owns one
module** (CRM, Fabric Mill, Costing, ...) end to end, runs it against
**local first**, then promotes the same tests to **dev** with one flag —
no code changes between environments.

## Why it's shaped this way

floorOS is a shell + remotes micro-frontend: `app-shell` owns auth and
routing, and every module (`app-crm`, `app-mill`, ...) is mounted under it
at its own path. That has two consequences for this framework:

1. **There's one target, not N** — every test drives `app-shell`'s
   `baseURL` and navigates into `/crm`, `/mill`, etc. Nothing is
   pointed at a module's standalone dev port.
2. **Auth happens once** — each module logs in as its own seeded test
   user (Keycloak), caches the session, and every spec in that module
   reuses it. No spec re-logs-in.

Modules are otherwise fully isolated: `tests/regression/<module>/`,
`src/pages/<module>/`, `src/locators/<module>/`,
`src/fixtures/<module>.fixtures.ts`. A QA working on CRM never has a
reason to open a file under `mill/`, and two QAs never collide in the
same file — enforced by [CODEOWNERS](./CODEOWNERS).

Each module's Page Object is itself split in two, so a screen's element
locators and its behavior never live in the same file:

- **`src/locators/<module>/<screen>.locators.ts`** — a `<Screen>Locators`
  class holding only `readonly Locator` properties (plus parameterized
  "find me the element matching this argument" lookups, since those
  still just locate, e.g. `columnHeader(name)`). Nothing here clicks,
  fills, or asserts.
- **`src/pages/<module>/<screen>.page.ts`** — a `<Screen>Page` class
  holding a single `readonly locators: <Screen>Locators` plus every
  flow/action/assertion built on top of it (`fillProfile()`, `save()`,
  `expectSavedSuccessfully()`, ...). Anything that actually performs an
  interaction (even a small one, like trying two possible popup shapes)
  belongs here, not in the Locators class.

Specs then only ever call page methods — `await createCustomerPage.save()` —
never reach into a raw `page.getByRole(...)` themselves. See
`src/locators/crm/create-customer.locators.ts` +
`src/pages/crm/create-customer.page.ts` for the reference pair.

## Stack

- **Playwright Test** (`@playwright/test`) — runner, assertions, browser
  contexts, parallelism, retries, HTML reporting.
- **TypeScript**, strict mode.
- **dotenv** for environment config (`.env` + `.env.local` / `.env.dev` overrides).
- **ESLint + Prettier**.

## Structure

```
pw-hybrid-framework/
├── playwright.config.ts        # builds a "<module>-setup" + "<module>" project pair per module
├── CODEOWNERS                  # one QA per module
├── src/
│   ├── config/
│   │   ├── modules.ts           # THE module registry — id, route, env-var prefix
│   │   └── env.ts                # TEST_ENV switch (local|dev), shell URL, per-module creds
│   ├── locators/
│   │   ├── shell/shell-login.locators.ts   # raw Keycloak/pre-auth-gate locators
│   │   ├── crm/crm.locators.ts
│   │   ├── mill/mill.locators.ts
│   │   └── <module>/<screen>.locators.ts   # one file per screen, locators only
│   ├── pages/
│   │   ├── base.page.ts          # shared page behavior
│   │   ├── shell/shell-login.page.ts   # Keycloak login (shell-owned, shared by every module)
│   │   ├── crm/crm.page.ts
│   │   ├── mill/mill.page.ts
│   │   └── <module>/<screen>.page.ts   # one file per screen, methods only
│   ├── api/
│   │   └── base.api-client.ts    # thin wrapper over Playwright's APIRequestContext
│   ├── fixtures/
│   │   ├── auth-setup.ts         # shared login-and-save-storage-state helper
│   │   ├── crm.fixtures.ts       # exposes only `crmPage` — scoped to CRM
│   │   └── <module>.fixtures.ts  # one per module, never shared across modules
│   ├── data/
│   │   └── data-reader.ts        # data-driven test-case loader
│   └── utils/logger.ts
└── tests/
    ├── regression/                 # each module's full test-case coverage
    │   ├── crm/
    │   │   ├── auth.setup.ts       # logs in as the CRM test user, caches session
    │   │   └── crm.spec.ts
    │   ├── mill/
    │   │   ├── auth.setup.ts
    │   │   └── mill.spec.ts
    │   └── <module>/...            # costing, planning, techpack, master-data, admin, copilot
    └── sanity/                     # a lighter smoke-test subset per module
        ├── crm/                    # reuses regression/crm's auth.setup.ts login
        └── <module>/...            # mill, costing, planning, techpack, master-data
```

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env
```

In `.env`, fill in `LOCAL_APP_SHELL_URL` (defaults to `http://localhost:3100`,
the shell's local Vite port from `tilt up` in the floorOS repo) and — for
**your module only** — its `<PREFIX>_USER_LOCAL` / `<PREFIX>_PASSWORD_LOCAL`.
Leave every other module's vars blank; the framework only reads the module
you run. Fill in the `_DEV` variants (and `DEV_APP_SHELL_URL`) once you're
ready to promote to dev.

## Running tests

Local (default — `TEST_ENV=local`), one module:

```bash
npm run test:crm
npm run test:mill
```

Same tests against dev — nothing else changes:

```bash
npm run test:crm:dev
npm run test:mill:dev
```

Everything, one environment:

```bash
npm run test:local     # all 8 modules against local
npm run test:dev       # all 8 modules against dev
```

Other useful flags (compose with any of the above via `--`):

```bash
npm run test:crm -- --headed
npm run test:debug
npm run report
```

> `TEST_ENV=dev npm run test:crm` (inline env var) assumes a POSIX shell
> (macOS/Linux/CI). The `test:*:dev` npm scripts already do this for you.

### Running spec files in a specific order

By default, `fullyParallel`/multiple workers means spec files don't
start in any guaranteed order. CRM's spec files are named with numeric
prefixes (`01-create-customer.spec.ts`, `02-customer-creation-screen.spec.ts`,
... `12-contact-creation-screen.spec.ts`) so that when you force a single
worker, they run strictly one after another in that exact sequence:

```bash
npm run test:crm:ordered       # local, single worker, files run 01 -> 12 in order
npm run test:crm:ordered:dev   # same, against dev
```

This is `--workers=1` under the hood, so the whole run is single-threaded
— much slower than the default parallel run — use it only when the order
itself matters (e.g. demoing the suite end to end), not for everyday
development. If you add a new CRM spec file and it needs a place in this
sequence, give it the next number (or renumber, if it needs to run
earlier) — `crm.spec.ts` (unnumbered) intentionally sorts after all of
them and always runs last.

## Smoke, sanity, and regression suites

Three tiers per module, narrowest to broadest:

- **`tests/smoke/<module>/`** — the fastest, smallest check: is anything
  badly broken. For CRM: real login, create a Customer, create a
  Contact — nothing more; every other module currently has just the
  module-loads check, same as its regression suite, until real coverage
  is built out. Project name `smoke-<module>`.
- **`tests/sanity/<module>/`** — a broader targeted subset, still not full
  coverage. For CRM: one happy-path test per distinct capability
  (create/activate/deactivate/edit/list-loads, etc.) — deliberately
  deduplicated, unlike the regression suite, which keeps a separate test
  per ClickUp subtask even where two are word-for-word identical.
  Project name `sanity-<module>`.
- **`tests/regression/<module>/`** — the full test-case suite.

All three reuse the same `<module>-setup` login project, so there's no
extra auth setup to write for a new suite — just add spec files under
the right folder and they'll run.

```bash
npm run test:smoke:crm         # local
npm run test:smoke:crm:dev     # dev
npm run test:smoke             # every module's smoke suite, local
npm run test:smoke:dev         # every module's smoke suite, dev

npm run test:sanity:crm        # local
npm run test:sanity:crm:dev    # dev
npm run test:sanity            # every module's sanity suite, local
npm run test:sanity:dev        # every module's sanity suite, dev
```

Smoke is wired up for all 8 modules (see `smokeProjects` in
`playwright.config.ts`). Sanity is currently wired up for `crm`, `mill`,
`costing`, `planning`, `techpack`, and `master-data` (see
`SANITY_MODULE_IDS` in `playwright.config.ts`) — add `admin`/`copilot`
there too whenever those QAs want sanity coverage.

## The local → dev workflow

1. `tilt up` the floorOS stack locally (see the floorOS repo's quickstart).
2. Run `npm run test:<your-module>` until it's green locally.
3. Fill in that module's `_DEV` credentials, get `DEV_APP_SHELL_URL` from
   your lead, and run `npm run test:<your-module>:dev` — same spec files,
   same page objects, only the target and login changed.
4. Nothing to edit to promote: the switch is `TEST_ENV`, driven entirely
   by which npm script you run.

## Onboarding a new module's QA

The module already exists in `src/config/modules.ts` (all 8 current
floorOS frontends are pre-wired) if you're just picking up ownership:

1. Add your credentials to `.env` under your module's prefix.
2. Your module already has a matching pair of smoke-test stubs:
   `src/locators/<module>/<module>.locators.ts` (one `heading` locator)
   and `src/pages/<module>/<module>.page.ts` (`expectLoaded()` just
   checks that heading renders). As you cover more of your module's
   screens, add one new pair per screen — e.g. for a "Create Order"
   screen, add `src/locators/<module>/create-order.locators.ts` (every
   element the screen needs, confirmed against the real running app, not
   guessed) and `src/pages/<module>/create-order.page.ts` (a
   `CreateOrderPage` class holding `readonly locators` plus the
   flows/actions/assertions built on it — see
   `src/locators/crm/create-customer.locators.ts` +
   `src/pages/crm/create-customer.page.ts` for the reference pair).
3. Write specs in `tests/regression/<module>/`, importing `test`/`expect` from
   `src/fixtures/<module>.fixtures.ts`. Specs call page methods only —
   never a raw locator or `page.getByRole(...)` directly.
4. Wire each new page object into `src/fixtures/<module>.fixtures.ts`.
5. Claim your rows in [CODEOWNERS](./CODEOWNERS).

If floorOS ships a genuinely new frontend later, add one entry to
`MODULES` in `src/config/modules.ts`, then repeat steps 1-5 above for it —
`playwright.config.ts` and `package.json` need a matching project/script
pair (copy an existing module's two lines in each).

## Adding an API client

Module tests are UI-first (through the shell), but if a module needs to
hit its backend service directly, add `src/api/<module>.api-client.ts`
extending `BaseApiClient`, wire it into that module's fixtures file, and
consume it from a spec in `tests/regression/<module>/`.

## Adding data-driven cases

Add rows to a JSON file (e.g. `src/data/crm/create-lead.data.json`), type
them, load with `readData<T>()` from `src/data/data-reader.ts`, and loop
over them in the spec to generate one Playwright test per row.

## Extended reporting (Allure)

Every run also collects [Allure](https://allurereport.org) results
(`allure-results/`, gitignored) via `allure-playwright` — richer than
Playwright's own HTML report: tests grouped by Epic/Feature (see the
`allure.epic()`/`allure.feature()`/`allure.owner()` calls in
`tests/regression/crm/01-create-customer.spec.ts`), a `tms` link on each test straight
back to its ClickUp task, `test.step()` breakdowns, retries, and history
across runs.

```bash
npm run report:allure:generate   # build allure-report/ (static site) from the last run's results
npm run report:allure:open       # serve the already-generated allure-report/ and open it in the browser (blocking — Ctrl+C to stop); run report:allure:generate first
```

This uses [Allure 3](https://allurereport.org/blog/allure-report-3/) (the
`allure` npm package — pure Node, no Java required). When adding
ClickUp-backed test cases in a new module, follow the same pattern: an
`allure.tms(url, label)` call per test, `epic`/`feature`/`owner` in a
`test.beforeEach`.

## CI: run the full suite and email a summary

`.github/workflows/run-tests-and-notify.yml` runs `npx playwright test`
against dev (same as `npm run test:dev`), publishes the resulting Allure
report to GitHub Pages, and emails a pass/fail summary with a link to
it. It's **manual-trigger only** for now (`workflow_dispatch`) — run it
from the repo's Actions tab, "Run tests and notify" → "Run workflow".
Add a `push`/`schedule` trigger to the workflow file once the team wants
this automatic.

It needs these repo secrets/variables (Settings → Secrets and variables
→ Actions):

| Name                                          | Type                | Notes                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY`                              | Secret              | From [resend.com](https://resend.com)'s dashboard. Without this, the email step logs a message and skips — the run/report still complete.                                                                                                  |
| `<PREFIX>_USER_DEV` / `<PREFIX>_PASSWORD_DEV` | Secret              | Per module, same prefixes as `.env` (`CRM_USER_DEV`, `MILL_USER_DEV`, ...). A module with no secrets set here just fails its own `auth.setup.ts` — an honest signal that module has no dev coverage configured yet, not a broken workflow. |
| `DEV_APP_SHELL_URL`                           | Variable            | Same value as `.env`'s `DEV_APP_SHELL_URL`.                                                                                                                                                                                                |
| `NOTIFY_EMAILS`                               | Variable            | Comma-separated recipient list.                                                                                                                                                                                                            |
| `NOTIFY_FROM_EMAIL`                           | Variable (optional) | Defaults to Resend's shared `onboarding@resend.dev` sender, which works immediately but is rate-limited and clearly not your own domain. Verify a real sending domain in Resend and set this once you're past initial testing.             |

CRM's `_DEV` secrets and the two variables above are already set on this
repo as of 2026-09-18 — only `RESEND_API_KEY` is still needed to make
the email step actually send (everything else in the workflow runs
without it).

## Lint / format

```bash
npm run lint
npm run format
npm run typecheck
```
