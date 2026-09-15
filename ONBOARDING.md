# Onboarding — floorOS QA Automation

You're picking up ownership of one floorOS module's automated tests. This
framework is built so you only ever touch your own module's files —
`tests/<module>/`, `src/pages/<module>/`, `src/fixtures/<module>.fixtures.ts`
— never anyone else's.

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

First run should authenticate once (via `tests/<module>/auth.setup.ts`)
and then run your module's specs. If `<your-module>` isn't in
`package.json`'s scripts yet, use `npx playwright test --project=<your-module>`
— see `src/config/modules.ts` for the full list of registered modules.

## 5. Add your own test cases

1. Document the case in `test-cases/<your-module>/<story>.md` (see
   `test-cases/crm/create-customer.md` for the format — one file per user
   story, each row linking back to its ClickUp task).
2. Automate it as a `test()` in `tests/<your-module>/*.spec.ts`.
3. Add any locators/actions you need to
   `src/pages/<your-module>/<page>.page.ts` — extend `BasePage`, and use
   `gotoAuthenticated()` (not `goto()`) for your entry point, so the
   cached shell login actually applies (see the comment on that method).
4. Wire new page objects into `src/fixtures/<your-module>.fixtures.ts`.
5. Claim your rows in [`CODEOWNERS`](./CODEOWNERS) — every row currently
   points at `@sathishnagarajanQAlead` as a stand-in; replace your
   module's rows with your own GitHub handle.

Full details, including the local → dev promotion flow, are in the
[README](./README.md).

## Questions

Ask in [team channel — fill in] or ping [framework lead — fill in].
