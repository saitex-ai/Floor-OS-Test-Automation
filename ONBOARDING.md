# Onboarding — floorOS QA Automation

You're picking up ownership of one floorOS module's automated tests. This
framework is built so you only ever touch your own module's files —
`tests/regression/<module>/`, `src/pages/<module>/`, `src/locators/<module>/`,
`src/fixtures/<module>.fixtures.ts` — never anyone else's.

## 0. Framework structure

```
pw-hybrid-framework/
├── src/
│   ├── config/             → env.ts (TEST_ENV=local|dev switch), modules.ts (module registry)
│   ├── locators/<module>/  → *.locators.ts — raw Locator properties only, no actions
│   ├── pages/<module>/     → *.page.ts — methods/flows built on top of a screen's locators
│   ├── fixtures/           → <module>.fixtures.ts — wires page objects into Playwright's test()
│   ├── api/                → base.api-client.ts — for modules that hit their backend directly
│   └── data/               → data-reader.ts — loads JSON for data-driven tests
├── test-cases/<module>/    → *.md — human-readable test-case docs, one per ClickUp user story
├── tests/regression/<module>/         → auth.setup.ts (logs in once, caches session) + *.spec.ts
├── playwright.config.ts    → builds a "<module>-setup" + "<module>" project pair per module
└── CODEOWNERS              → one QA per module
```

One module = one vertical slice through every folder above. For CRM,
that's `test-cases/crm/`, `src/locators/crm/`, `src/pages/crm/`,
`src/fixtures/crm.fixtures.ts`, `tests/regression/crm/` — no other module ever
touches these, enforced by `CODEOWNERS`.

How a request flows, top to bottom, for any spec you run:

1. **`src/config/env.ts`** reads `TEST_ENV` and builds the right
   `shellBaseUrl` + credentials for the module being run.
2. **`tests/regression/<module>/auth.setup.ts`** logs in once via `ShellLoginPage`,
   saves the session to `.auth/<module>.json`.
3. **`playwright.config.ts`** wires that saved session into the
   `<module>` project, so every spec starts already authenticated.
4. **`src/locators/<module>/<screen>.locators.ts`** defines _what_
   elements exist on a screen.
5. **`src/pages/<module>/<screen>.page.ts`** defines _what you can do_
   with them (`fillProfile()`, `save()`, `expectSavedSuccessfully()`),
   using `this.locators`.
6. **`src/fixtures/<module>.fixtures.ts`** exposes those page objects as
   fixtures (`createCustomerPage`, `contactListPage`, etc.).
7. **`tests/regression/<module>/*.spec.ts`** imports `test`/`expect` from that
   fixtures file and calls page methods only — never a raw locator.

Everything above the module folders (`playwright.config.ts`,
`src/config/`) is shared infrastructure nobody needs to touch to add a
new test.

## 1. Prerequisites

- Node.js (whatever version the team's using — check `.node-version` in
  the floorOS repo if unsure)
- The [floorOS](https://github.com/floorOS/floorOS) repo cloned, with its
  local dev stack runnable (`./scripts/bootstrap.sh`, `make install`,
  `tilt up` — see that repo's own `docs/handbook/00-quickstart.md`)

## 2. Clone and install

```bash
git clone https://github.com/saitex-ai/Floor-OS-Test-Automation.git pw-hybrid-framework
cd pw-hybrid-framework
npm install
npx playwright install --with-deps
```

## 3. Configure your module

```bash
cp .env.example .env
```

Open `.env` and fill in **only your module's** row: `<PREFIX>_USER_LOCAL`
/ `<PREFIX>_PASSWORD_LOCAL` (e.g. `CRM_USER_LOCAL` / `CRM_PASSWORD_LOCAL`
for CRM, `MILL_USER_LOCAL` / `MILL_PASSWORD_LOCAL` for Fabric Mill, ...).
Ask your lead for the seeded Keycloak test-user credentials for your
module. Leave every other module's rows blank — the framework only reads
the one you run.

`LOCAL_APP_SHELL_URL` defaults to `http://localhost:3100`, which is
correct once you have `tilt up` running locally.

## 4. Run your module's tests

```bash
tilt up                    # in the floorOS repo — start the local stack first
npm run test:<your-module> # e.g. npm run test:crm, npm run test:mill, ...
```

First run should authenticate once (via `tests/regression/<module>/auth.setup.ts`)
and then run your module's specs. If `<your-module>` isn't in
`package.json`'s scripts yet, use `npx playwright test --project=<your-module>`
— see `src/config/modules.ts` for the full list of registered modules.

## 5. Add your own test cases

Every screen's Page Object is split in two — never put a locator and a
method in the same file:

1. Document the case in `test-cases/<your-module>/<story>.md` (see
   `test-cases/crm/create-customer.md` for the format — one file per user
   story, each row linking back to its ClickUp task).
2. Add the screen's element locators to
   `src/locators/<your-module>/<screen>.locators.ts` — a
   `<Screen>Locators` class with only `readonly Locator` properties
   (confirmed against the real running app, not guessed from the
   ClickUp text), plus any parameterized "find me the element matching
   this argument" lookups (e.g. `columnHeader(name)`) since those still
   just locate. Nothing here clicks, fills, or asserts.
3. Add the screen's flows/actions/assertions to
   `src/pages/<your-module>/<screen>.page.ts` — a `<Screen>Page` class
   extending `BasePage`, holding a single `readonly locators:
<Screen>Locators` plus methods built on top of it (`fillProfile()`,
   `save()`, `expectSavedSuccessfully()`, ...). Use `gotoAuthenticated()`
   (not `goto()`) for your entry point, so the cached shell login
   actually applies (see the comment on that method). See
   `src/locators/crm/create-customer.locators.ts` +
   `src/pages/crm/create-customer.page.ts` for the reference pair.
4. Automate the case as a `test()` in `tests/regression/<your-module>/*.spec.ts`,
   calling page methods only — never a raw locator or
   `page.getByRole(...)` directly in the spec.
5. Wire new page objects into `src/fixtures/<your-module>.fixtures.ts`.
6. Claim your rows in [`CODEOWNERS`](./CODEOWNERS) — every row currently
   points at `@sathishnagarajanQAlead` as a stand-in; replace your
   module's rows with your own GitHub handle.

Full details, including the local → dev promotion flow, are in the
[README](./README.md).

## Questions

Ping Sathish Nagarajan ([@sathishnagarajanQAlead](https://github.com/sathishnagarajanQAlead)).
