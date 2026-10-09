# Master Data — Item Master

The "Item Master" screen under Master Data > Inventory Item Management
(`/master-data/inventory-item-management/item-master`, nav group collapsed
by default). The richest and most-referenced master in this nav group — an
Inventory Item ties together Item Class, Item Category (both from Item
Class Master), Unit of Measure, and (on other tabs) Attributes and Product
Services, with its own Draft/Approved/Inactive/Rejected approval workflow
echoing Customer Master's. No automation exists for this module yet, so
this file uses the simple 4-column format (no ClickUp/Automated/Verified
columns).

| #     | Test case                                                                      | Steps                                                                                                                                                                                                                 | Expected result                                                                                                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC:1  | Verify successful creation with all required + several optional fields filled   | 1. Go to Item Master > "New Item" (focus the "Create" button and press Enter to submit — do not `.click()` directly, see Notes re: the floating AI button trap).<br>2. On the General tab, pick an Item Class, pick an Item Category, pick Base/Sale/Purchase Unit, fill Alternate Code and Description.<br>3. Click "Create" (via focus+Enter). | Toast `Inventory item <CODE> created.` appears (e.g. `Inventory item CHEM0000010 created.` — the Item ID is interpolated and auto-generated, prefixed by the picked Item Category's code); redirected to the list; new row shows the entered Alternate Code/Description/Item Category/Stock Type/Base Unit and Status "Approved" (not "Draft" — see Notes). |
| TC:2  | Verify successful creation with only the 7 genuinely-required fields            | 1. Open "New Item".<br>2. Fill only Alternate Code, Description, pick Item Class, pick Item Category, pick Base/Sale/Purchase Unit — skip Stock Item, Capitalization, Lot Tracking, Last Purchase Cost, LCA Code, and every other tab. | Save succeeds with the same toast pattern as TC:1 — confirms Stock Item/Capitalization/Lot Tracking/Last Purchase Cost/LCA Code are genuinely optional. Note Stock Group may remain blank on the saved record if the picked Item Class itself has no Stock Group value (data-dependent, not a validation gap — see Notes). |
| TC:3  | Verify successful edit of an existing item                                     | 1. Open the list, search for a known Item ID, click its row (opens directly into Edit — no separate read-only detail view, URL `?edit=<ItemID>`).<br>2. Change the Description.<br>3. Click "Update" (focus+Enter, same trap as Create). | Toast `Inventory item updated.` appears; the list reflects the new Description. The "Update" button is visibly disabled/greyed until a real change is made (confirmed live) — a nice touch not seen on the other two Inventory Item Management screens. |
| TC:4  | Verify validation when all 7 required fields are left blank                    | 1. Open "New Item".<br>2. Leave every field empty.<br>3. Focus "Create" and press Enter.                                                                                                                             | Save is blocked; inline "is required" errors appear simultaneously under Alternate Code, Description, Item Class, Item Category, Base Unit, Sale Unit, and Purchase Unit; **and** a toast summarizing all seven at once: `Please fix the highlighted fields:` followed by a bulleted list of the same seven messages. No navigation. |
| TC:5  | Verify Stock Group, Stock Type, Custom Code, HS Code asterisks that are NOT actually enforced — **surprising, confirmed live** | 1. Open "New Item".<br>2. Pick an Item Class whose record has no Stock Group value (e.g. `CHEM-WASH` in the picker, which shows a blank Stock Group Code column).<br>3. Fill the 7 genuinely-required fields only, leaving Stock Group blank (it auto-derives and cannot be typed into anyway) and leaving Custom Code/HS Code on their pre-filled default `00000000`.<br>4. Click Create. | Save succeeds even with Stock Group blank — confirmed live via a real create (`CHEM0000010`). Stock Group, Stock Type, Custom Code, and HS Code all carry a red `*` in the UI but are not in the required-fields toast list from TC:4 and do not block save; Custom Code/HS Code only "pass" because they already hold a non-empty default value (`00000000`), not because they're unenforced the way Stock Group genuinely is. |
| TC:6  | Verify the Item Category picker is scoped to the picked Item Class             | 1. Open "New Item".<br>2. Pick Item Class `CHEM-WASH`.<br>3. Click the Item Category picker.                                                                                                                          | The "Select Item Category" dialog shows only categories belonging to the picked Item Class — confirmed live: picking `CHEM-WASH` showed exactly 1 matching row (`CHEM — Chemical`), out of the item category master's full set. |
| TC:7  | Verify Attributes and Product Services tabs are gated behind Item Category     | 1. Open "New Item" without picking an Item Category yet.<br>2. Click the "Attributes" tab, then the "Product Services" tab.                                                                                            | Attributes tab shows only "Select an Item Category first to load attributes."; Product Services tab shows only "Select an Item Category on the General tab to load product services." — both are real cross-module references (to the Attribute master and to Product Service Value Master/Product Service Master respectively) that only populate after Item Category is picked on General. Not independently verified what either tab shows once populated — see Notes. |
| TC:8  | Verify the Supplier tab is gated until the item is first saved                 | 1. Open "New Item" (don't save yet).<br>2. Click the "Supplier" tab.<br>3. Save the item, then re-open it in Edit and click "Supplier" again.                                                                           | Before save: the tab shows only "Save the item first to manage suppliers." — same gating pattern as Customer Master's own "Brands" tab (see that module's file). Not independently verified what the tab shows once populated after save. |
| TC:9  | Verify the Subitem tab works independently on Create (not gated)              | 1. Open "New Item" (don't save yet).<br>2. Click the "Subitem" tab.                                                                                                                                                     | Unlike Supplier, the Subitem tab is usable immediately on Create — shows a Color/Size/Serial No/"Add" builder with an empty "No sub-items added yet." table; not gated behind an initial save. |
| TC:10 | Verify duplicate Alternate Code is blocked — **confirmed live, with a confusing/wrong error message (bug)** | 1. Create an item with a given Alternate Code.<br>2. Attempt to create a second item reusing the **exact same** Alternate Code (different Description, same or different Item Class/Category/Units).<br>3. Click Create for both. | First save succeeds (`Inventory item <CODE> created.`). **Second save is blocked, but with toast `This record was updated by someone else. Reload and try again.`** — an optimistic-concurrency/stale-record message that makes no sense for a brand-new Create (there is no existing record the user could have "reloaded"). Confirmed reproducible across two independent attempts with different fresh Alternate Code values. This is the wrong error message for a duplicate-key conflict and should be flagged to the team — a user hitting this on a genuine duplicate will be misled into retrying the exact same losing action. |
| TC:11 | Verify Cancel discards changes on create                                       | 1. Open "New Item" and fill in several fields.<br>2. Click "Cancel".                                                                                                                                                     | No record is created; user is returned to the Item Master list; the list's total count is unchanged.                                                                                                                       |
| TC:12 | Verify "Delete permanently" — real hard-delete, distinct from the other two Inventory Item Management screens | 1. Open an existing item's Edit screen.<br>2. Click "Delete permanently" (bottom-left, red).<br>3. Read the confirmation dialog, then confirm.                                                                           | A confirmation `alertdialog` appears: "Permanently delete this inventory item? This will permanently remove the item AND every attached sub-item, supplier, attribute, product service, image, file, and history record. A surviving audit snapshot is written. This cannot be undone — prefer Deactivate when in doubt." Confirming fires toast `Inventory item permanently deleted.` and the item is fully gone from the list (confirmed live via count round-trip). **Neither Item Class Master nor Product Service Value Master has any delete capability at all** — this is unique to Item Master. |
| TC:13 | Verify the confirmation dialog's own "prefer Deactivate" advice is **unactionable — confirmed bug** | 1. On an item's Edit screen, inspect the "Active flag" checkbox.<br>2. Attempt to click/uncheck it (before even opening the delete dialog).                                                                              | **The checkbox is always checked and genuinely disabled** (`disabled` DOM property `true`) — a real click attempt times out. This directly contradicts the delete-confirmation dialog's own text, which tells the user to "prefer Deactivate when in doubt" — there is no reachable way to actually deactivate an item anywhere in this UI, making that advice currently impossible to follow. Same underlying pattern as Item Class Master and Product Service Value Master's own disabled Active checkboxes, but more consequential here since the app explicitly steers users toward a non-existent affordance right before an irreversible action. |
| TC:14 | Verify the approval dashboard surfaces real Draft items (read-only observation, do not action real seeded data) | 1. Open the Item Master list without any search filter.                                                                                                                                                                 | A "Masters needing review" panel lists Draft items awaiting Master Approval (12 at time of writing, e.g. real seeded rows like `THMNT-6712`/`TH1446` raised by `seed-netyy`), each with Review/Reject/Make active actions, plus a Draft/Approved/Inactive status-tab model and a 5th tab behind "+1 more" (not confirmed by name, likely "Rejected" by analogy with Customer Master — see Notes). **Do not click Review/Reject/Make active on these pre-existing seeded rows** — they belong to shared dev data, not this test suite; exercise this workflow only against a fresh throwaway item if a positive/negative test of the approval flow itself is needed. |
| TC:15 | Verify Alternate Code and Description have no client-side max-length cap (edge, contrast with the other two Inventory Item Management masters) | 1. Open "New Item".<br>2. Type 100+ characters into Alternate Code and 300+ characters into Description.                                                                                                               | Both fields accept the full string with no truncation (confirmed live via `inputValue()` returning the full 100/300-character strings) — unlike Item Class Master's Prefix Code (10-char cap) and Description (200-char cap), or Product Service Value Master's Description (200-char cap). Not yet confirmed whether the backend itself enforces a cap on save (not tested to avoid another duplicate-style confusing failure). |
| TC:16 | Verify special/unicode characters in Alternate Code (edge)                     | 1. Open "New Item".<br>2. Enter an Alternate Code containing symbols, HTML-like text and unicode (e.g. `AC&<script>"日本語`) into the field.                                                                              | The full string is accepted into the field with no client-side character-set restriction (confirmed live via `inputValue()`); not independently confirmed whether a save with this value succeeds or how it renders on the list afterward. |
| TC:17 | Verify the floating AI launcher overlaps and intercepts the Create/Update button — **confirmed live trap, shared with Item Class Master** | 1. Open "New Item" (or Edit an existing item) at a standard desktop viewport (1400×1000 confirmed).<br>2. Attempt a plain `.click()` on "Create"/"Update".                                                             | The sticky bottom-right Cancel/Create(/Update) footer sits directly under the floating "Ask FloorOS AI" launcher button. A plain `.click()` times out; a `{ force: true }` click actually opens the AI launcher dialog instead of submitting the form (confirmed via `elementFromPoint` landing on `aria-label="Ask FloorOS AI"`). **Confirmed-working workaround**: `await button.focus(); await page.keyboard.press('Enter');`. See Item Class Master's file for the original discovery of this trap — it reproduces identically here, strongly suggesting it's a global app-shell overlay issue rather than anything module-specific. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`) and
throwaway records prefixed `TC-Item-...` — all of which were fully cleaned
up via the real "Delete permanently" flow by the end of this session (net
item count returned to its starting value of 654). This module (and the
whole "Inventory Item Management" nav group) had **zero** existing
documentation or automation in this repo before this session.

- **List**: heading "Item Master" (`level=1`), subheading
  "Inventory Item Management · 654 items · 654 active", status tabs All /
  Draft / Approved / Inactive / "+1 more" (a 5th tab not confirmed by name —
  clicking "+1 more" in this session didn't visibly expand a dropdown in
  the captured output; budget time to investigate its real interaction
  pattern, it's very likely "Rejected" by analogy with Customer Master's
  own Draft/Approved/Inactive/Rejected model), search ("Search by Item ID,
  Description, Alternate Code…"), a "New Item" button. Table columns: Item
  ID, Description, Alternate Code, Item Category, Stock Type, Base Unit,
  Status. A "Masters needing review" panel (Draft items + Review/Reject/
  Make active actions) sits above the table, same shape as Customer
  Master's own dashboard-style region — see TC:14, **not exercised against
  real seeded data this session** to avoid corrupting shared dev state.
- **Create is a full-page navigation**: `?addToItemMaster=true` (note this
  is a different query-param name from Item Class/Company/Customer
  Master's `?create=true` — don't assume a shared convention across Master
  Data screens). Edit is `?edit=<ItemID>`.
- **The General tab alone has 11 asterisked fields**, but only **7 are
  genuinely enforced** (confirmed via empty-submit's inline errors + the
  toast's own bulleted list): Alternate Code, Description (labelled "Item
  Description" in the toast), Item Class, Item Category, Base Unit, Sale
  Unit, Purchase Unit. The other 4 asterisked fields — Stock Group, Stock
  Type, Custom Code, HS Code — are not enforced the same way: Stock
  Group/Stock Type are disabled auto-derived display fields (populated from
  the picked Item Class, sometimes left blank if the source record itself
  has no value — see TC:5), while Custom Code/HS Code both come pre-filled
  with a literal default value (`00000000`, confirmed via `inputValue()`,
  not just a placeholder) so they never actually reach an empty state a
  user could trigger. See TC:4/TC:5 for the full breakdown.
- **General tab also has 11 content tabs alongside it**: General, Subitem,
  Attributes, Product Services, Packaging, Image, Wash, Fabric, Supplier,
  TDS File, MSDS File. This session explored General, Subitem, Attributes,
  Product Services, Packaging, and Supplier in some depth (see TC:7–TC:9);
  **Image, Wash, Fabric, TDS File, and MSDS File were not opened at all**
  this session — budget real time for these on any future pass, the task's
  own framing ("Item Master is likely the richest/most complex") undersells
  just how many tabs exist. The Packaging tab has its own two asterisked
  fields (Weight Unit, Volume Unit) that are plausibly only conditionally
  required (i.e. only if Weight/Volume are filled) — **not verified live,
  flagging as unconfirmed rather than assumed**.
- **Item Class and Item Category pickers are real, live, cross-referenced
  data from Item Class Master** (see that module's own file) — picking an
  Item Class correctly scopes the Item Category picker to only that class's
  associated categories (confirmed live, TC:6), and the generated Item ID's
  prefix is derived from the picked Item Category's code (e.g. picking
  category `CHEM` produced ID `CHEM0000010`).
- **Exact success/failure toast text, confirmed live**:
  - Create: `Inventory item <CODE> created.` (interpolated, e.g.
    `Inventory item CHEM0000010 created.` — don't match a static string).
  - Edit/Update: `Inventory item updated.`
  - Delete: `Inventory item permanently deleted.`
  - Empty-submit toast: `Please fix the highlighted fields:` followed by a
    bulleted list of the same per-field messages shown inline.
  - Duplicate Alternate Code: `This record was updated by someone else.
    Reload and try again.` — **confirmed-live bug, see TC:10**: this is a
    misleading optimistic-concurrency message for what is actually a
    duplicate-key conflict on a brand-new Create, not a real stale-record
    situation. Flag to the backend team; a user will be misled into
    reloading and retrying the exact same request, which will fail
    identically every time until they change the Alternate Code.
  - Item Class Master-style ID-generator collision bug (see that module's
    file) does **not** reproduce here — Item Master's ID sequence correctly
    advances even across failed attempts (observed gaps like
    `CHEM0000016` → `CHEM0000018`, confirming failed attempts still consume
    a sequence number, a generally-accepted and separate behavior from Item
    Class Master's actual collision bug).
- **Confirmed-live bug: the Active flag checkbox is always checked and
  permanently disabled** (`disabled` DOM property `true`) in both Create
  and Edit — identical pattern to Item Class Master and Product Service
  Value Master. See TC:13 for why this is especially notable here: the
  delete-confirmation dialog's own copy explicitly recommends deactivating
  instead, but that path is unreachable.
- **"Delete permanently" is unique to Item Master** among the three
  Inventory Item Management masters covered this session — neither Item
  Class Master nor Product Service Value Master has any delete capability.
  The confirmation dialog's copy is worth preserving verbatim in any
  automated assertion (see TC:12) since it's unusually detailed about
  cascade effects (sub-items, suppliers, attributes, product services,
  images, files, history).
- **No client-side max-length cap found on Alternate Code or Description**
  (tested 100/300-char strings, both accepted in full) — a genuine contrast
  with both sibling modules in this nav group, which do hard-cap at
  10/200 characters respectively. Not verified whether the backend itself
  enforces any cap on save.
- **Not covered in this pass**: Image/Wash/Fabric/TDS File/MSDS File tabs
  entirely; the Packaging tab's Weight/Volume fields' real
  conditional-requiredness; the Subitem builder's own validation (Color/
  Size/Serial No fields, whether any are required to add a row); the
  Supplier tab's real content once unlocked post-save; the Attributes and
  Product Services tabs' real content once an Item Category is picked
  (confirmed only that they're gated, not what they show once unlocked);
  the real name/behavior of the "+1 more" 5th status tab; and the
  Review/Reject/Make active approval actions (deliberately not exercised
  against real seeded Draft data this session — see TC:14).
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen (see
  `agent-notes/master-data-module.md`).
- **Two more findings confirmed only while building the real Playwright
  automation for this file (2026-10-08), not caught during the original
  manual exploration pass:**
  1. **Clicking Cancel with any unsaved field changes present opens an
     "Unsaved changes" confirmation** (`Stay` / `Discard`) instead of
     navigating away immediately — the original TC:11 exploration must
     have under-filled the form enough to not trigger this, or simply
     didn't notice it. Automation must click "Discard" when it appears.
  2. **The "Update" button's own accessible name is not a stable
     "Update"** — while disabled (no change made yet since opening Edit),
     its real accessible name is "No changes to save." (a tooltip-style
     title overriding the visible "Update" text for a11y purposes), only
     reporting as "Update" once a real change enables it. A locator
     matching only `name: 'Update'` intermittently fails to find the
     button immediately after opening Edit. Also confirmed: like Item
     Class Master's "Save changes", **Update does not navigate back to the
     list** after a successful save — a caller must re-navigate rather
     than assume it's already on the list.
