# BOM module — how it actually works

First written 2026-09-25; **rewritten 2026-10-08** after building the full UAT regression suite
(`tests/regression/bom/01..05-*.spec.ts`, 76 cases — see `test-cases/bom/*.md` for the per-case
ledger). Two kinds of source: live runs against `uat.flooros.app` (and dev where noted), and the
`flooros` app monorepo (`/Users/rk/workspace/flooros`). **Read the UI from the branch UAT is
actually built from — `origin/build/uat` — not `develop` or a feature branch.** As of 2026-10-08,
`build/uat` is from 2026-10-01; a "BOM on the immersive template" redesign (`7508e895a`,
2026-10-07) exists only on `feat/new-techpack` and will change the detail page's layout/toolbar
when it lands — re-explore then. "Confirmed live" = seen on uat; "per the code" = read from
`build/uat` source.

## What BOM is, and how it relates to Techpack

BOM ("Bill of Materials") is a **real, separate, fully-built top-level app** — it has its own App
Launcher tile ("BOM" / "Manage bills of materials and component breakdowns"), its own top-level
route (`/bom`), and its own list/detail UI — not a tab or sub-section inside the Techpack canvas.
**But it is not a separate microservice or remote.** It used to be (`svc-bom` + presumably its own
`app-bom` frontend), and was merged into `svc-techpack`/`frontends/app-techpack` on **2026-05-21**
(`flooros` commit `f728eddfc`, "Moved BOM into techpack microservices (#19)"). Concretely:

- Frontend: `frontends/app-techpack/src/features/bom/` — exposed via Module Federation as a
  second export (`./BomRoot`, alongside the Techpack app's own `./Root`) so app-shell can mount
  `/bom` directly at `RemoteMount remote="app-techpack" exposed="BomRoot"`
  (`frontends/app-shell/src/routes/bom.tsx`). app-techpack's own internal router also defines
  `/bom`/`/bom/$` for when it's mounted standalone.
- Backend: `services/svc-techpack/src/features/bom/` — no `services/svc-bom` exists anymore. Every
  BOM route is a Fastify plugin under the shared `/bom-techpack/...` prefix (preserved verbatim
  from the old `svc-bom` service so old frontend callers kept working — see
  `routes/bom-health.ts`, whose healthcheck still literally returns `service: 'svc-bom'`).
- Same Postgres database as Techpack (`svc_techpack`) — see schema below.

**A BOM belongs to a specific Techpack.** Every BOM row is keyed by `(techpackCode, bomRevNo)` —
`techpackCode` + the _techpack's own_ `revNo` is a foreign key into `techpacks`, and `bomRevNo` is
the BOM's **own**, independent revision counter (first BOM for a techpack = **rev 0**, not rev 1 —
see "Lifecycle" below). Route shape: list `/bom`, detail `/bom/:techpackCode/:bomRevNo`.

**A BOM can only be created for an Approved techpack.** `CreateBomDialog`'s techpack picker is
restricted to Approved techpacks via `GET /bom-techpack/available-techpacks`; the create endpoint
itself (`POST /bom-techpack`) independently 422s with `TECHPACK_NOT_APPROVED` if you somehow target
one that isn't — confirmed both in the route code and live (the "Create BOM techpack" dialog's own
copy: "Choose an **approved** techpack to seed the new BOM with customer, style, fabric and product
details.").

**Auto-BOM: approving a Techpack now automatically kicks off a BOM build** — a newer backend
feature (`flooros` commit `3108df31d`, "build the BOM automatically on techpack approval", behind
an `AUTOBOM_ENABLED` kill switch). It resolves each AI-extracted BOM line against master data with
a score-floor + margin-over-runner-up match; ambiguous lines are "parked" for manual review instead
of guessed. **Confirmed live on uat**: an existing BOM record's detail page showed a real banner,
`"Auto-BOM matched 1 of 14 materials. 13 materials need you to pick them."`, alongside `"B.O.M
Items 0"` / `"No items in this BOM"` in the actual items table — i.e. even a "matched" line doesn't
automatically become a confirmed BOM Item; it still needs the parked/matched lines to be reviewed
and accepted before they count as real items. (Update 2026-10-08: the matched/parked lines are resolved from the banner itself — it expands
inline, each parked material offers "Use this" per candidate and "Search item master…". The
auto-BOM worker **skips a techpack with no AI-extracted BOM lines**, so approving a
Classic-form techpack creates no BOM — it lands in the New BOM picker instead. That's what the
regression suite relies on to build its own BOMs; an auto-BOM header shows "Created by: N/A".)

## UI as confirmed live on uat (2026-10-08, `build/uat` 2026-10-01)

**List (`/bom`)** — heading "Bill of Materials"; tabs All / Open / Approved only (no Draft, no
Cancelled tab). 21 default columns (Techpack Code … Wash Name); Configure columns has no toggle
for Techpack Code (always shown) and three hidden-by-default extras (BOM Effective Date, Season
Description, Status ID). Toolbar Export CSV → `bom-list.csv`; ticking rows shows "N item(s)
selected" (the "1" and "item selected" are separate elements) with Export → `bom-export.csv`.
Vertical split = compact record list ("N records") + a preview of the selected BOM; Horizontal
split = full grid + the preview underneath. **The tab badges load separately from the rows** —
read them only after All matches the footer total and Open/Approved are non-zero
(`BomListPage.waitForTabCounts()`). Fully translated to Vietnamese ("Định mức nguyên phụ liệu").

**Create BOM** — "New BOM" → "Create BOM techpack" dialog. The code field ("< NEW >") opens
"Pick a techpack (N)": a **table** (click a row to pick; no options/radios), only Approved
techpacks **with no BOM yet**, footer "Showing 1-4 of 4" / "Showing 0 of 0" (a "no match"
placeholder row still renders — count only rows with a TP code cell). **The footer renders before
the table**, and header text is upper-cased by CSS (read `textContent`, not `innerText`). Escape
closes the picker _and_ the dialog behind it — use the picker's own Close. Picking seeds
Customer/Season/Style/Fabric/Wash/Product Type and shows "Techpack <code> ready."; Create BOM
sends exactly `{ techpackCode }`, toasts "BOM created for <code>" and lands on `/bom/<code>/0`.
The detail page's "B.O.M Code" field opens the same picker as a BOM switcher ("Pick a techpack
to open its BOM.").

**Detail (`/bom/:code/:rev`)** — header fields are label/value pairs (read the line after
"Customer:" etc. — `BomDetailPage.headerField()`); "B.O.M Rev No." opens "Revisions <code>" (rev
rows show DRAFT for Open, VALIDATED for Approved; the row text runs together, "rev 1DRAFT").

**Items** — "Add line" → "Add Inventory Item" (MDM picker, already-added items hidden, fuzzy
search). "Add Selected (N)" only renders once something is ticked. One item (click its code) →
"Confirm item" → "Add line"; several → "Add N items" review (Remove per row) → "Add N lines".
No success toast for adds. Lines are grouped under category header rows ("Fabric 2 lines",
upper-cased by CSS — match by role name). **Description / UOM / alternate-code edits need a
reason and are staged** ("1 change pending" → "Save 1 change" → toast "Saved 1 line edit(s)."; or
Cancel → "Discard staged edits"); UOM/alt-code use an "Edit BOM line" dialog whose "Stage edit"
stays disabled until a reason is typed. Remark and every checkbox save immediately, no reason.
**An edited line shows an "Edited" provenance badge in its code cell** — match the code as a
prefix. Split-type mutex = Item-level / Inseam / Waist / GMT size set (unticking the active one
falls back to Item-level); **Destination split and BPO split sit alongside, not in the mutex**.
"Show barcode" is only enabled on a GMT size set line. "Pick country" turns Destination split on
and opens "Select a country". UOM is a Radix select (click → option), not a native `<select>`.
Delete → "Delete line" confirm → toast "Deleted <id>.". Split Details / Thread Items open dialogs
("Split details", "Thread items"); Thread Items is disabled on an Approved BOM.

**Lifecycle buttons** depend on status, line count and revision: an Open BOM with ≥1 line shows
**"Costing Approve" on rev 0** and **"Validate & Lock" on rev ≥1** (this is why a dev finding on
2026-09-25 — "Validate & Lock only renders once a BOM has items" — looked rev-independent: that
BOM was on rev 2). Approved → Reopen (reason 10–200 chars, toast "BOM unlocked. Cost sheets may
need recosting."), Mark complete ("BOM Completed" confirm; header checkbox "Mark (not)
completed"), Create Revision (copies items, **stays on the current rev** and offers "Open
latest"), Create Costing Request (wash types + quantity — **never submit it from tests**, it
raises a real request in Costing's queue). Approve / Costing Approve / complete / revise show
**no toast**. **No Cancel BOM and no Lock/Unlock button exist in the UI** (the API has both).
A readiness banner ("2 rows missing Supplier", "1 destination split missing a country") says rows
"can be approved", but missing-supplier lines block Costing Approve in practice (seen on dev).

## Lifecycle (API) — per the state-machine code, `services/svc-techpack/src/features/bom/domain/lifecycle.ts`

Persisted `status_id` is one of only 3 values: **`Open`, `Approved`, `Cancelled`** — plus a
separate `is_completed` boolean. The UI/domain layer projects these two into 4 conceptual states:

```
DRAFT (Open, not completed)
  --approve / costing-approve-->  APPROVED (Approved, not completed)
APPROVED --reopen-->  DRAFT
APPROVED <--complete / uncomplete-->  COMPLETED (Approved, completed)
APPROVED or COMPLETED --cancel-->  CANCELLED   (terminal)
```

Illegal transitions throw a real `409 LIFECYCLE_BLOCKED`, not a silent no-op. Actions, confirmed
via the real routes + the UI's own confirm-dialog copy:

- **Approve ("Validate & Lock")** — `POST /bom-techpack/:code/:rev/approve`. Runs real
  server-side validation first — see "Approve readiness" below; any blocker present means this is
  refused, not just discouraged in the UI.
- **Costing Approve** — `POST .../costing-approve`, **rev-0 only** (gated in code, not just a UI
  suggestion — this is why BOM revisions starting at 0 instead of 1 matters, see "Recent changes"
  below).
- **Reopen** — `POST .../reopen`, body `{ reason }`, **required, 1-200 chars, trimmed, non-empty**
  (400 if missing/blank/too long — real server-side validation, not just a UI placeholder hint).
  Also blocked (`409 LIFECYCLE_BLOCKED` or a more specific 409) if: this isn't the latest
  revision, a sibling revision is already Open, the BOM is currently locked, a downstream cost
  sheet is open against it, or a NeedSheet is using it — 5 distinct real guard conditions worth
  their own test cases.
- **Complete / Uncomplete** — `POST .../complete`, body `{ isCompleted: boolean }`.
- **Cancel** — `POST .../cancel`, terminal (no route back from Cancelled).
- **Create Revision** — `POST /bom-techpack/:code/revision` (from the latest rev) or
  `.../from-new-techpack-revision` — copies items + splits forward.
- **Copy BOM** — `POST .../:code/:rev/copy`, body `{ sourceTechpackCode, sourceBomRevNo }`
  (copies both header-adjacent data and items); a separate `.../copy-items` copies items only.
- **Lock / Unlock / Take over** — `POST .../lock` (body `{ force?: boolean }` — plain lock without
  `force` gets a real `409 BOM_LOCKED_BY_OTHER` if someone else already holds it; `force: true` is
  the "Take over BOM lock" UI action), `DELETE .../lock` to unlock (`409` if held by someone
  else). Backed by its own `bom_lock_screen` table — a genuinely separate lock/edit-session
  concept from the Open/Approved/Cancelled status.

**Approve readiness blockers** (`domain/readiness.ts` — what the pre-approve checklist actually
checks, each one a real, independently testable business rule): `missingBaseUnit`, `missingVendor`,
`invalidSplits`, `deactivatedItems`, `duplicateItemColor` (2+ active splits sharing
inventoryId+colorCode+sizeId+inseamWaist — **not** enforced by a DB unique index, so this is a
real app-level check worth a dedicated test), `zeroQtySplits` (an active split with
`standard_cons <= 0`), `pendingItemMaster` (a line still waiting on an MDM item-master record).
Any non-empty list blocks Approve — `GET .../approve-readiness` powers the UI's own checklist, so
this is inspectable directly, not just inferred from a failed Approve attempt.

## BOM Items (API) — add/edit/delete, `bom-items.routes.ts`, gated `bom:write`

- `POST /bom-techpack/:code/:rev/items` — **Add item**. Required per the real Zod schema
  (`.strict()`, extra fields rejected outright): `inventoryId` (1-40 chars), **`baseUnit`
  (1-20 chars, genuinely required server-side — even though the UI may pre-fill/default it from
  master data, the server itself won't accept a missing one)**. Optional: `itemDescription`
  (≤400), `vendorCode` (≤20), `vendorName` (≤200), `alternateCode` (≤80), `itemCategoryCode`
  (≤40), 6 split-type booleans (`isItemLvlSplit`, `isInseamSplit`, `isWaistSplit`,
  `isGMTSizeSet`/`isGmtSizeSet`, `isBPOSplit`/`isBpoSplit`, `isDestinationSplit`), `remark`.
- `POST /bom-techpack/:code/:rev/items/:inventoryId` — **Update item** (yes, `POST` not `PATCH` —
  a legacy-preserved convention, confirm this is really what the UI calls before assuming a REST
  verb). Adds `zeroCost` (boolean — see "Customer Supplied" below), `isShowBarcode`,
  `listCountryId`, `isBookingAdvance`, and a **`reason`, required ≤200 chars whenever any field
  other than `remark` changes** — enforced in the handler itself, not by the Zod schema, so this
  needs a real functional test (change a tracked field with no reason → expect a real rejection),
  not just a schema-level check.
- `DELETE .../items/:inventoryId` — cascades to that item's splits and thread-replacements.
- **Real, independently-verifiable business rules (per the route file's own header comments, all
  worth dedicated test cases)**: a `423 BOM_LOCKED` if someone else holds the edit lock; a `422
COSTSHEET_APPROVED` if a downstream cost sheet has already been approved against this BOM; a
  `409 LIFECYCLE_BLOCKED` unless the BOM is currently Open (can't mutate items on an Approved/
  Completed/Cancelled BOM); the 6 split-type booleans are a real **mutex** — only one can be true
  at a time; a THD (thread) item specifically **cannot** enable destination split; a BPO split
  can't be re-enabled once a `need_sheet_id` already exists on that line; un-ticking "booking
  advance" is **admin-only**; both update and delete require a real `If-Match` header, and a
  mismatch is a genuine `412 CONCURRENCY_CONFLICT` — this app has real optimistic-concurrency
  control on BOM items, not last-write-wins.
- **`section` (Fabric/Trim/Label/Care/Packaging/Other) no longer exists on a BOM line** — the
  column/field was dropped 2026-08-13 (`flooros` commit `13a30e94a`, migration
  `1800000072000_drop_bom_techpack_detail_section.sql`). Classification is now purely
  `item_category_code`-driven. Don't write test data or assertions expecting a "section" field.
- **"Customer Supplied" / `zeroCost` — a newer field (added 2026-08-11, commit `159544975`)**:
  ticking it prices that BOM line at $0.00 on the downstream cost sheet while still tracking real
  quantity. There's a buyer-level registry (`bom_customer_supplied_item`, keyed
  `customer_code + inventory_id`) that auto-defaults future BOMs for the same buyer+item —
  precedence (per the commit): an explicit registry entry wins, then "carried forward if it's the
  same buyer as before," then defaults to false. Worth a dedicated test on the precedence order,
  not just the toggle itself.
- **Split-item consumption** (`bom-splits.routes.ts`, the `Split Details` tab) — now derived from
  **customer consumption percentages** (changed 2026-08-05, commit `422cd937e`; was a different
  derivation before). Split saves now show a real confirmation toast (previously silent — fixed
  same window, commit `29896aeb1`). Split types, per the DB check constraint:
  `Item / Waist / Inseam / GMT / BPO / Destination` — matches the 6 add-item mutex booleans above.
- **Duplicate item guard**: a real DB unique index now backs "one BOM line per item"
  (`(factory_id, brand_id, techpack_code, bom_rev_no, inventory_id)` — added alongside the
  auto-BOM feature, 2026-08-21, previously only an app-level convention). Also a broader unique
  index added later, `1800000086000_uniq_bom_detail_techpack_inventory.sql` — confirm exact scope
  live before writing a uniqueness test, the migration name suggests it may be broader than the
  original per-BOM index.

## Permissions (Keycloak realm roles, confirmed by reading `keycloak/floorOS-dev-realm.json`)

- **App-access gate**: `app.bom` ("grants the BOM app") — maps to the launcher tile's own
  `requiredPermission: "app:bom:access"`.
- **Capability roles** (all composite over `bom.read`): `bom.read`, `bom.write` (items/splits/
  threads/copy), `bom.create` (parity with the legacy `ALLOWED_CREATE_ROLES = {planner,
supervisor}` — **no admin bypass in code**, worth confirming an Admin account still needs this
  role explicitly rather than assuming Admin-always-wins), `bom.approve`, `bom.costing-approve`,
  `bom.complete`, `bom.lock`, `bom.revise`.
- **Real job roles people actually get assigned**:
  - `job.planner` — "Builds and locks BOMs; reads techpacks. Deliberately NOT given `price.read`,
    so BOM vendor-price masking applies." Composite:
    `[app.bom, app.techpacks, bom.read, bom.write, bom.create, bom.lock, techpack.read]` — **no
    `bom.approve`**: a planner can build a BOM but not approve it, a real, testable
    separation-of-duties rule.
  - `job.bom-approver` — "Approves, costing-approves, completes and revises BOMs. No
    write/create — approval is a separate seat from authoring." Composite: `[app.bom, bom.read,
bom.approve, bom.costing-approve, bom.complete, bom.revise]` — **no `bom.write`/`bom.create`**:
    the inverse separation from `job.planner`, also directly testable (log in as this role, confirm
    Add line/Edit item are blocked but Approve isn't).
  - A view-only oversight role composites `bom.read` across Costing/Techpacks/BOM/Master Data/
    Orders alongside `price.read` — `price.read`'s own description explicitly names "BOM vendor
    price" as one of the margin-revealing values it's meant to mask from everyone else.
- **Known, code-documented permission gap — worth a real test, not just a note**: BOM's **read**
  routes (`bom-list`, `bom-lookup`, `bom-resolve`, `bom-render`) are currently
  **authenticate-only** — `bom.read` is the intended gate but isn't enforced server-side on those
  four route modules yet (flagged both in `frontends/.../bom-route.tsx` and in the `bom.read`
  Keycloak role's own description; those routes are on
  `scripts/screen-permission-coverage-allowlist.txt`, an explicit acknowledged-gap list). Practical
  effect: **any authenticated user can currently read BOM data regardless of whether they hold
  `bom.read`** — writes/lifecycle actions ARE properly gated. A test logging in as a role with
  `app.bom` but no `bom.*` capability roles, confirming read works but write/approve are blocked,
  would directly confirm this gap (and should be re-run periodically — it's explicitly flagged as
  temporary/being tightened, see the 2026-08-02 commit batch under "Recent changes").
  No exact equivalent test exists yet for Techpack itself — this file's own permission section
  should get the same treatment once/if `job.planner`'s `techpack.read`-only (no write?) scoping
  is explored the same way.

## DB schema highlights (`services/svc-techpack/migrations/1745000000000_bom_tables.sql`, 30 tables)

Only the parts that translate directly into testable rules — full column lists aren't reproduced
here, re-read the migration directly if a specific field's exact type/nullability is needed:

- `bom_techpack_header` — PK `(factory_id, brand_id, techpack_code, bom_rev_no)`; FK
  `(techpack_code, rev_no) → techpacks`; `status_id CHECK IN ('Open','Approved','Cancelled')`;
  customer/season/style/fabric/wash/product fields are **denormalized and server-populated from
  MDM** at BOM-create time, not client-editable directly (matches the Create dialog's own "seed
  from techpack" framing above).
- `bom_techpack_detail` (the line items) — UNIQUE `(factory_id, brand_id, techpack_code,
bom_rev_no, inventory_id)`; `provenance CHECK IN ('AUTO','EDITED','MANUAL')` — a real,
  assertable field distinguishing an auto-BOM-matched line from a human-added/edited one, worth
  using directly in a test rather than inferring provenance from UI state.
- `bom_techpack_split_item` — UNIQUE `(factory_id, brand_id, techpack_code, bom_rev_no,
inventory_id, sub_item_id, inseam_waist, type)`; `type CHECK IN ('Item','Waist','Inseam','GMT',
'BPO','Destination')`.
- `bom_snapshot` — an immutable approval snapshot, UNIQUE `(..., snapshot_version)`,
  `reason CHECK IN ('approve','costing-approve')` — confirms Approve/Costing-Approve each take
  their own permanent snapshot, useful for an audit-trail test.
- `bom_item_audit` — durable per-field change log (old/new value, reason, changed_by) — the
  server side of the "reason required on item update" rule above; a good place to assert against
  directly if the UI doesn't surface history cleanly.
- `bom_extraction_job` — `status CHECK IN ('parsing','extracting','validating','asking',
'persisting','done','failed')` — the auto-BOM job's own state machine, separate from the BOM
  record's own Open/Approved/Cancelled status.
- `bom_customer_supplied_item` — the "Customer Supplied"/`zeroCost` registry, keyed
  `customer_code + inventory_id` (see above).

## Recent behavior-changing commits (`flooros` repo) — what to specifically re-verify

Newest first (2026-09-25 → 10-01 additions at the top); only the ones that change a route, a required field, validation, or a visible
control (full detail/evidence lives in the session's own subagent report, not reproduced here):

- **2026-09-29 `73078465b`** / **2026-09-25 `facbe3f95`** — people shown by name (else email,
  else N/A), never a raw id (ClickUp z941abwgw0) — list TC:16 guards it.
- **2026-09-25 `6db0d4854`** — `status_name` stored on create/revise (ClickUp z941abwgtw) —
  create TC:8 guards it.
- **2026-09-29 `d25181cc2`** — every BOM UI string through Lingui, Vietnamese catalog completed.
- **2026-09-07 `e2d853c64`** — the Techpack list _embedded_ inside CRM's Biz Docs tab was silently
  swallowing toast notifications (a failed create-revision looked identical to success) — retest
  create-revision error handling specifically from that embedded context, not just the standalone
  Techpack module.
- **2026-09-06 `42820070e`** / **2026-09-04 `8fdf89699`** — the same embedded/customer-scoped
  Techpack list used to leak other customers' data through the filter panel's `customerCode`
  attribute, export, and match-count/filter-value dropdowns even though the grid itself was
  correctly scoped — both fixed, but worth a direct re-test from an embedded/customer-locked
  context specifically (not reproducible from the standalone `/techpacks` list this session
  worked from).
- **2026-08-21 `2c5298995`** — the auto-BOM review panel was silently dropping a second material
  that shared an `alternateCode`+articleRef with another (now grouped by
  `alternateCode + articleRef + content` instead) — worth a test with two genuinely
  same-article-ref, different-content materials.
- **2026-08-21 `2001ccea2`** — new auto-BOM review panel (parked/mapped lines); "Re-run AI
  extract" removed (see "BOM detail" above).
- **2026-08-21 `3108df31d`** — auto-BOM-on-approval (see "What BOM is" above); also added the
  `(techpack_code, bom_rev_no, inventory_id)` DB unique index.
- **2026-08-13 `13a30e94a`** — `section` field dropped from BOM lines (see "BOM Items" above).
- **2026-08-11 `159544975`** — `zeroCost`/"Customer Supplied" added (see "BOM Items" above).
- **2026-08-05 `422cd937e`** — split-item consumption now derives from customer percentages.
- **2026-08-05 `29896aeb1`** — split-item save now shows a real success toast (was silent).
- **2026-08-05 `9342f1d6a`/`d401586a3`** — multi-select filter values + a "match count" footer
  added to the BOM list's filter drawer.
- **2026-08-04 `bc60f11f3`** — **BOM revisions now start at 0, not 1** (breaking numbering change
  — this is _why_ Costing Approve is gated to `bomRevNo === 0`; any fixture/test data assuming
  "first BOM = Rev 1" is wrong now).
- **2026-08-02, tagged `CU-86exg82pe`** (several commits) — progressively added `bom:read` gating
  to most (not all — see "Permissions" above) BOM GET routes.

## Known bugs / open questions (2026-10-08)

- **THD line can be destination-split** (items TC:15) — ticking Destination split on THD0000001
  saves silently (no "Not Allowed" alert), sticks after refresh, ticked alongside Item-level;
  banner "1 destination split missing a country". Reproduced on **uat and dev**. Per the code the
  frontend checks `stockType` for the THD rule but the country cell uses `itemCategoryCode`.
- **Older revision still offers Reopen** (lifecycle TC:20) — with rev 1 Open, reopening rev 0 is
  refused, but 4 of 5 runs said "This BOM was updated by someone else. Refresh and retry." (412
  CONCURRENCY_CONFLICT) — nobody else edited it; once it said "This version is out of date.
  Please reload the latest revision."
- **Older revision still offers Create Revision** (lifecycle TC:21) — refused with "A new revision
  can only be created from an Approved BOM." (422 NOT_APPROVED) although that revision _is_
  Approved (the real reason: the latest revision is still Open).
- **Revisions don't carry the header Remark forward** — rev 1 made by Create Revision has an
  empty Remark (the test-data tag only shows on rev 0). Not asserted; noted only.
- **Open question for the user:** bob (Qc-lead) can create BOMs, add/edit lines and open Create
  Costing Request; only Costing Approve / Reopen / Mark complete / Create Revision are disabled for
  him. Intended? Not tested until confirmed.

## How the regression suite gets its data (and why)

UAT's existing BOMs belong to other people's testing (Costing's "QA-AUTO — created by QA …"
records, multi-revision TP202610-000051, etc.) — **never mutate a BOM you didn't create.**
`tests/regression/bom/support/disposable-bom.ts` builds one per file through the real UI: Classic
techpack (random master data) → approve on its canvas → New BOM. Every techpack it creates
carries **"QA-AUTO — BOM regression test data (pw-hybrid-framework). Safe to delete."** in its
Description (shown as Remark on the techpack and BOM lists) so they can be deleted from the
backend later — the user asked for this explicitly. A full suite run creates ~5–6 techpack+BOM
pairs (more if a default-mode file has a failure: a fresh worker rebuilds its BOM). Seed lines
use MDM codes present on **both** uat and dev (FAB0000002, THD0000001, LBL0000001, TAG0000002,
LIN0000002, PKT0000001/2, TAG0000001, LBL0000002, CPT0000001) — dev has no ZIP0000004 /
BUT0000002. On dev some of those items have no supplier, which blocks Costing Approve, so the
lifecycle file can't fully run on dev as-is.

Pre-tag leftovers from 2026-10-08 (untagged, all created by this suite's development, safe to
delete): BOM TP202610-000063 (rev 0 and 1) and TP202610-000081; approved techpacks with no BOM
TP202610-000064 / 000065 / 000066 / 000067 / 000069.
