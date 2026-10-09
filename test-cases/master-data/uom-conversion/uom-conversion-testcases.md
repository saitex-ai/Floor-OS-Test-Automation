# Master Data — UoM Conversion

The "UoM Conversion Master" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/uom-conversions`). The
"Inventory Item Management" nav group is collapsed by default — direct
`page.goto()` to the route works fine once authenticated, no need to expand
the group first. Holds From-UoM → To-UoM conversion factor pairs (e.g.
KG → LBS = 2.204620) used elsewhere for inventory/BOM unit conversions. No
automation or documentation existed for this module before this file; every
row below was confirmed directly against `https://dev.flooros.app` (session
`.auth/master-data.json`, user Alice Planner/Admin) using real throwaway
conversion pairs (`BOX→CARTON`, `KG→OZ`) created, edited, and deactivated
live — this is a genuine CRUD screen (contrast with Inventory Item History's
own file in this same nav group, which is not a full CRUD screen).

| #     | Test case                                                                                      | Steps                                                                                                                                                                                                                                                                                              | Expected result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify UoM Conversion list screen layout                                                       | 1. Navigate to Master Data > Inventory Item Management > UoM Conversion.                                                                                                                                                                                                                           | Heading "UoM Conversion Master" loads. Tabs All/Active/Inactive each show a live count. Table columns: From Unit, From Unit Description, To Unit, Conversion Factor, CH Item, Round Up, Status (note: **no "To Unit Description" column**, only From Unit gets a description column). A "New UoM Conversion" button, search box, Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit columns and 3 layout-mode toggles are present.                                                                                                                                                                  |
| TC:2  | Verify successful creation with all fields filled                                              | 1. Click "New UoM Conversion".<br>2. Click "Pick from unit", search and select a From UoM (e.g. BOX).<br>3. Click "Pick to unit", search and select a different To UoM (e.g. CARTON).<br>4. Enter a Conversion Factor (e.g. 24).<br>5. Check "Chemical Item" and "Round Up".<br>6. Click "Create". | Toast reads exactly "UoM conversion created." The dialog closes and a new row appears with From Unit BOX, To Unit CARTON, Conversion Factor `24.000000`, CH Item "Yes", Round Up "Yes", Status "Active".                                                                                                                                                                                                                                                                                                                                                                                                                   |
| TC:3  | Verify successful creation with only required fields                                           | 1. Click "New UoM Conversion".<br>2. Pick a From UoM and a different To UoM.<br>3. Enter a Conversion Factor.<br>4. Leave Active checked (default), Chemical Item and Round Up unchecked.<br>5. Click "Create".                                                                                    | Save succeeds with toast "UoM conversion created."; the new row shows CH Item "No", Round Up "No", Status "Active" — confirms Chemical Item/Round Up are genuinely optional and default unchecked, Active genuinely defaults checked.                                                                                                                                                                                                                                                                                                                                                                                      |
| TC:4  | Verify validation when all required fields are left blank                                      | 1. Click "New UoM Conversion".<br>2. Leave From UoM, To UoM, and Conversion Factor all empty.<br>3. Click "Create".                                                                                                                                                                                | Save is blocked; inline "Required" errors appear under From UoM, To UoM, and Conversion Factor simultaneously — no toast, no navigation, dialog stays open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| TC:5  | Verify From UoM and To UoM must be different                                                   | 1. Click "New UoM Conversion".<br>2. Pick the **same** unit (e.g. BOX) for both "Pick from unit" and "Pick to unit".<br>3. Enter any valid Conversion Factor.                                                                                                                                      | **The "Create" button itself becomes `disabled`** (confirmed via `isDisabled()`, not just inert-on-click) and an inline error "From UoM and To UoM must be different." appears — this is the only validation on this form that disables the submit button instead of just blocking on click.                                                                                                                                                                                                                                                                                                                               |
| TC:6  | Verify negative and zero Conversion Factor are rejected                                        | 1. Click "New UoM Conversion".<br>2. Pick a valid, different From/To UoM pair.<br>3. Enter Conversion Factor `-5`, then separately try `0`.                                                                                                                                                        | For both values, an inline error "Must be greater than 0" appears live (as soon as the field is blurred/changed, before Create is even clicked); clicking "Create" re-validates and blocks the save — no toast, dialog stays open. Note: unlike TC:5, the "Create" button itself is **not** `disabled` here, it just blocks on click.                                                                                                                                                                                                                                                                                      |
| TC:7  | Verify non-numeric text in Conversion Factor — edge case, surprising error text                | 1. Click "New UoM Conversion".<br>2. Pick a valid, different From/To UoM pair.<br>3. Type `abc` into the Conversion Factor field.<br>4. Click "Create".                                                                                                                                            | **Confirmed live, genuinely surprising:** the textbox accepts the literal string `abc` with no client-side character restriction, but Create is blocked with the same inline message used for negative/zero values — "Must be greater than 0" — not a more accurate "must be a number" message. Misleading error text for this specific input.                                                                                                                                                                                                                                                                             |
| TC:8  | Verify duplicate From/To UoM pair is rejected with a specific message                          | 1. Create a conversion for a given From/To pair (e.g. BOX → CARTON) — succeeds.<br>2. Repeat "New UoM Conversion" with the **exact same** From UoM and To UoM (any Conversion Factor).<br>3. Click "Create".                                                                                       | Save is blocked with toast **"A conversion already exists for this From/To UoM pair."** — a specific, well-worded duplicate-key message (contrast with Company Master's and UoM Master's own generic "Failed to create ..." toasts on duplicate-key — this screen does it better). Dialog stays open with entered data intact.                                                                                                                                                                                                                                                                                             |
| TC:9  | Verify editing an existing conversion — From/To UoM are locked                                 | 1. Click an existing conversion row to open "Edit UoM Conversion".<br>2. Observe the From UoM / To UoM fields.<br>3. Change the Conversion Factor and/or the Active/Chemical Item/Round Up checkboxes.<br>4. Click "Save changes".                                                                 | **Confirmed live:** "Pick from unit" and "Pick to unit" (both the textbox and the button) render `disabled` in Edit — the From/To pair is immutable once created, only Conversion Factor, Active, Chemical Item, and Round Up can be changed. Toast reads exactly "UoM conversion updated."; the list reflects the new values.                                                                                                                                                                                                                                                                                             |
| TC:10 | Verify Cancel on create discards changes                                                       | 1. Click "New UoM Conversion".<br>2. Pick a From UoM, a To UoM, and enter a Conversion Factor.<br>3. Click "Cancel" instead of "Create".                                                                                                                                                           | No record is created; the dialog closes; confirmed live by searching for that From/To pair afterward — zero matching rows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| TC:11 | Verify deactivating and reactivating a conversion — no dedicated button, unlike Company Master | 1. Open an existing conversion's Edit dialog.<br>2. Uncheck the "Active" checkbox and click "Save changes".<br>3. Re-open the same row, re-check "Active", and click "Save changes" again.                                                                                                         | Step 2: toast "UoM conversion updated."; the row's Status flips to "Inactive" and the Inactive tab's count increases by one. Step 3: toast "UoM conversion updated." again; Status flips back to "Active" and Active tab's count is restored. **Unlike Company Master, there is no separate "Deactivate" quick-action button anywhere on this screen** — lifecycle is controlled purely by the in-form Active checkbox, and reactivating genuinely works (no equivalent of Company Master's reactivation bug was found). No row-level delete or context-menu action exists either — right-clicking a row produces no menu. |
| TC:12 | Verify list search by From/To UoM code                                                         | 1. On the list, type an existing To-UoM code (e.g. "CARTON") into the search box (placeholder "Search by from/to UoM code…").                                                                                                                                                                      | The grid narrows to only the row(s) whose From Unit or To Unit code matches, within ~1-2 seconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| TC:13 | Verify "Pick unit" lookup is a searchable, paginated grid, not a simple dropdown               | 1. Click "New UoM Conversion".<br>2. Click "Pick from unit" (or "Pick to unit").                                                                                                                                                                                                                   | A "Select Unit" dialog opens (title "Select Unit(83)" — the live count of all UoMs in the system, confirmed to include throwaway `PW0xx`-coded UoMs from other sessions, so this is genuinely live-sourced, not cached). It has a "Search by code or name…" box, per-column filter row, and pagination ("Showing 1-50 of 83", Next/Previous/First/Last page) — selecting a row immediately closes the lookup and populates the field; no explicit "OK"/"Select" button is needed.                                                                                                                                          |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`) and
throwaway conversion pairs `BOX→CARTON` and `KG→OZ` — this module had **zero**
existing documentation or automation in this repo before this file.

- **This is a genuine, full CRUD screen** — unlike its sibling Inventory Item
  History (also under Inventory Item Management, see that module's own
  file), which is not. Don't assume every screen in this nav group shares
  one shape.
- **List**: heading "UoM Conversion Master", tabs All/Active/Inactive (each
  with a live count — 16/16/0 at the start of this session), columns From
  Unit, From Unit Description, To Unit, Conversion Factor, CH Item, Round
  Up, Status. **Asymmetric column set, confirmed live**: there is a "From
  Unit Description" column but no equivalent "To Unit Description" column —
  worth flagging as a possible gap/inconsistency to the team, not something
  to "fix" by assuming a missing column in test assertions.
- **Create form fields**, exactly as marked live with `*`: From UoM\*
  (lookup via "Pick from unit" button → "Select Unit" dialog), To UoM\*
  (same via "Pick to unit"), Conversion Factor\* (numeric textbox,
  placeholder "1000"), Active (checkbox, defaults checked), Chemical Item
  (checkbox, defaults unchecked), Round Up (checkbox, defaults unchecked).
  All three starred fields are genuinely required — confirmed via real
  inline "Required" errors on empty submit (TC:4).
- **Two different validation UX patterns on the same form, confirmed live**:
  From UoM == To UoM **disables the Create button itself** (`disabled`
  attribute, not just an inert click), while negative/zero/non-numeric
  Conversion Factor leaves Create clickable but blocks the save on click
  with an inline message. Worth being precise about which assertion style
  (`toBeDisabled()` vs. click-then-assert-dialog-still-open) each case
  needs — they are not interchangeable here.
- **Exact strings confirmed live:**
  - Create success: `UoM conversion created.`
  - Edit/Save success: `UoM conversion updated.`
  - From == To inline error: `From UoM and To UoM must be different.`
  - Negative/zero/non-numeric Conversion Factor inline error: `Must be
greater than 0` (no trailing period, confirmed by reading the
    rendered `<paragraph>` text directly — same text is shown for literal
    non-numeric input like `abc`, which is misleading since the real
    problem there is "not a number", not "not greater than 0").
  - Duplicate From/To pair toast: `A conversion already exists for this
From/To UoM pair.` — this is a notably more specific message than
    Company Master's or UoM Master's own generic "Failed to create ..."
    duplicate-key toasts (see those modules' files); worth citing as the
    better-UX example if this ever comes up in a consistency review.
  - List search placeholder: `Search by from/to UoM code…`.
  - "Select Unit" lookup dialog title includes a live count, e.g. `Select
Unit(83)`; its own search placeholder is `Search by code or name…`.
- **Edit locks the From/To pair**: confirmed live via the rendered ARIA
  snapshot — both "Pick from unit" and "Pick to unit" (textbox AND trigger
  button) carry `[disabled]` in the Edit dialog. Only Conversion Factor,
  Active, Chemical Item, and Round Up are editable post-creation. If the
  From/To pair needs to change, the only path is deactivate-and-recreate,
  not edit-in-place — not explicitly surfaced in the UI as guidance, but
  confirmed to be the only working path.
- **Lifecycle is via the in-form "Active" checkbox only** — there is no
  dedicated "Deactivate" quick-action button (contrast with Company
  Master's own top-of-form Deactivate button, which has a confirmed
  reactivation bug documented in that module's file). This screen's
  reactivate-by-rechecking-Active path was round-tripped live
  (deactivate → observe Inactive → reactivate → observe Active again) with
  no equivalent bug found. No row-level delete or right-click context menu
  exists either — confirmed by right-clicking a row and observing no
  `menu` role appears.
- **Locator trap, confirmed live**: the From/To pickers each render **two**
  elements with the identical accessible name "Pick from unit" (a disabled-
  looking `textbox` that just displays the picked value, and the actual
  trigger `button`) — distinguish by role (`getByRole('textbox', ...)` vs.
  `getByRole('button', ...)`), not by name alone, same general shape as the
  combobox-name-collision trap documented in
  `agent-notes/master-data-module.md` for other Master Data screens.
- **Conversion Factor is stored/displayed with 6 decimal places**
  regardless of how many digits were typed — e.g. entering `35.27` renders
  back as `35.270000` on the list; entering `24` renders as `24.000000`.
  Worth using this exact padded format in any assertion against the list
  grid rather than the raw typed value.
- **Data prerequisite for re-running TC:8 (duplicate pair)**: needs any
  already-used From/To pair, or create one fresh (as in TC:2) and
  immediately retry it with the same pair.
- **Cleanup note**: the throwaway `BOX→CARTON` conversion created during
  this session was left in place but set back to **Active** with
  Conversion Factor `48` (not its original `24`, since TC:9's edit test
  changed it) and Round Up unchecked; the throwaway `KG→OZ` conversion
  (factor `35.27`) was left **Inactive** (deactivated as cleanup, since
  this screen has no hard-delete path at all — confirmed, no delete
  button/menu anywhere). Whoever picks this up next may want to actually
  remove these from dev data if a cleanup pass ever becomes possible, but
  as of this session there is no UI-driven way to permanently remove a
  UoM Conversion record — only deactivate.
- **Not covered in this pass**: the Filters rule-builder panel's full UI,
  Export CSV file content, Configure columns/Best-fit columns, the 3
  layout modes, and row-level checkboxes/bulk actions — same scope limit
  as other Master Data screens' own files.
