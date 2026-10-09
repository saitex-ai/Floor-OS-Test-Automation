# Master Data — Attribute Value Master

The "Attribute Value Master" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/attribute-values`).
Defines preset values for item attributes (e.g. "100% Cotton" under the
"Composition" attribute) — each value is tied to a parent Attribute (which
itself is scoped to an Item Category, see Attribute Master's own file). This
is the one module of the three with a genuine Draft/Approved/Rejected/
Inactive approval workflow, plus a real permanent-delete action and a
working inline deactivate control — the richest of the three "Inventory Item
Management" screens. No automation or prior documentation existed for this
module before this file, so it uses the simple 4-column format.

| #     | Test case                                                                 | Steps                                                                                                                                                                                                                                    | Expected result                                                                                                                                                                                                                                                      |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                          | 1. Go to Attribute Value Master > "Add Value".<br>2. Click "Pick parent attribute", filter/search, and select an attribute (e.g. `IAM0000005 — Composition`).<br>3. Fill User Attribute Value Code and Description.<br>4. Click "Create". | Toast reading exactly `Attribute value <CODE> created.` appears (the generated Attribute Value Code is interpolated into the toast text itself — not a fixed string); dialog closes; new row shows the picked attribute, the entered code/description, and Status **"Approved"** (see Notes on why, not "Draft"). |
| TC:2  | Verify successful creation with only required fields                       | 1. Open "Add Value".<br>2. Pick a parent attribute and fill only User Attribute Value Code (leave Description blank).<br>3. Click "Create".                                                                                              | Save succeeds with the same dynamic "Attribute value &lt;CODE&gt; created." toast — confirms Description is genuinely optional.                                                                                                                                     |
| TC:3  | Verify successful edit of an existing value                                | 1. Search for a known value, click its row (opens "Edit Value" — no separate read-only view).<br>2. Change the Description.<br>3. Click "Save changes".                                                                                   | Toast reads exactly `Attribute value updated` — **note: no trailing period**, unlike the Create toast's dynamic message which does end in a period (confirmed live, a genuine inconsistency worth flagging).                                                       |
| TC:4  | Verify list search by code/description/attribute name                      | 1. Open the list.<br>2. Search by a known value's User Attribute Value Code, then by its Description, then by its parent Attribute Name.                                                                                                 | All three searches narrow the table correctly; placeholder documents the scope: "Search by code, description or attribute name…".                                                                                                                                  |
| TC:5  | Verify All / Draft / Approved / Inactive / Rejected tab filters            | 1. Open the list.<br>2. Click each of the five tabs in turn, noting the live count on each.                                                                                                                                               | Each tab filters to only values in that status; counts match rows shown (e.g. confirmed live: All 358, Draft 18, Approved 339, Inactive 1, Rejected 0 at time of writing — expect these to drift).                                                                 |
| TC:6  | Verify the "Masters needing review" panel surfaces Draft items for approval | 1. Open the list (land on the "All" tab).<br>2. Observe the "Masters needing review" region above the table.                                                                                                                              | A region headed "Masters needing review N" lists Draft attribute values awaiting approval, each showing its code/description/parent-attribute, who raised it and when, plus three inline actions: "Review", "Reject", "Make active". A "+N more — see the Draft tab." footer appears when the list exceeds what's shown inline. |
| TC:7  | Verify "Review" on a Draft item opens the same Edit dialog with extra approval actions | 1. In "Masters needing review", click "Review" on any Draft item.<br>2. Inspect the dialog's buttons.<br>3. Click "Cancel" to close without changing anything.                                                                            | The same "Edit Value" dialog opens (Attribute Code locked, other fields editable) but with **two extra buttons not present on an Approved record's Edit dialog**: "Reject" and "Approve & make active", alongside the normal "Cancel"/"Save changes"/"Delete &lt;code&gt;". Clicking "Cancel" closes with no change. |
| TC:8  | Verify the inline per-row "Change record status" control can deactivate a value | 1. Create (or find) an Approved value.<br>2. Click its Status badge/button in the list (title "Change record status").<br>3. Choose "Change to Inactive" from the menu.<br>4. Confirm in the resulting dialog ("Set to Inactive").          | A menu opens with a single option "Change to Inactive"; choosing it opens a confirmation `alertdialog` "Change record status?" / "This record will be set to Inactive."; confirming shows toast `Attribute value status updated.` and the row's Status becomes "Inactive". This is the only confirmed working deactivate path in this module (the Edit dialog's own "Active" checkbox is always checked-and-disabled and never used for this). |
| TC:9  | Verify permanent Delete and its confirmation                               | 1. Open any value's Edit dialog.<br>2. Click the "Delete &lt;code&gt;" button (top-left of the dialog).<br>3. Read the confirmation dialog, then confirm.                                                                                  | An `alertdialog` titled "Delete &lt;code&gt;?" appears with body text "This permanently deletes &lt;code&gt;. This action cannot be undone." and Cancel/Delete buttons. Confirming closes everything and shows toast `Attribute value deleted.` — the row is gone from the list, including from the "Draft" or "Approved" tab it was on. **Use only on throwaway test data** — this is a real, irreversible delete, not a soft deactivate. |
| TC:10 | Verify validation when both required fields are left blank                 | 1. Open "Add Value".<br>2. Leave Attribute Code unpicked and User Attribute Value Code empty.<br>3. Click "Create".                                                                                                                        | Save is blocked; inline "Required" appears under both "Pick parent attribute" (which also gets `[invalid]`) and User Attribute Value Code simultaneously; Description's absence never blocks save; no toast, dialog stays open.                                    |
| TC:11 | Verify duplicate User Attribute Value Code under the **same** parent Attribute is blocked | 1. Create a value with a given User Attribute Value Code under parent Attribute A.<br>2. Attempt to create a second value with the **exact same code** under the **same** parent Attribute A.<br>3. Click "Create".                        | Second save is blocked with toast `Could not create the value` — no inline field-level error; dialog stays open with the entered data intact.                                                                                                                       |
| TC:12 | Verify User Attribute Value Code is force-uppercased and capped at 20 characters (edge) | 1. Open "Add Value", pick any parent attribute.<br>2. Type a 200-character **lowercase** string into User Attribute Value Code.<br>3. Read the field's actual value, then save.                                                           | The field accepts at most **20 characters** (confirmed via `inputValue()` after typing 200 — length came back 20) **and the saved code is upper-cased** — e.g. typing `tcavedge951255...` round-tripped through the create toast as `TCAVEDGE951255`. No inline warning is shown for either the length cap or the case change — both are silent. |
| TC:13 | Verify special/unicode characters in Description (edge)                    | 1. Open "Add Value", pick a parent attribute and fill a valid code.<br>2. Enter a Description containing symbols, HTML-like text and unicode (e.g. `Test & <script>alert(1)</script> "quote" 日本語`).<br>3. Click "Create".               | The full string is accepted with no client-side restriction and the create succeeds; confirm it renders safely (escaped, not executed) on the list/edit view.                                                                                                       |
| TC:14 | Verify Attribute Code (parent attribute) becomes locked after creation (edge/trap) | 1. Open an existing value's Edit dialog.<br>2. Inspect the "Pick parent attribute" field and button.                                                                                                                                       | Both are `[disabled]` — the parent Attribute chosen at creation can never be changed afterward, confirmed live. Same lock pattern as Attribute Master's own Item Category field and Product Service Master's Item Category field (see those files) — a consistent cross-module "parent reference is permanent" rule. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`,
logged in as `alice`/Admin) and throwaway records prefixed `TC-Attr(Val)-...`
— all were deleted via the real Delete flow (TC:9) before finishing this
pass, so no test data was left behind. This module had **zero** existing
documentation or automation in this repo before this file.

- **Dialog-based CRUD, same as Attribute Master** — "Add Value" / clicking a
  row open modal dialogs ("Add Value" / "Edit Value") with no URL change;
  `page.url()` stays on `/master-data/inventory-item-management/attribute-values`
  throughout.
- **List**: heading "Attribute Value Master", **five** tabs (All/Draft/
  Approved/Inactive/Rejected — richer than any other Inventory Item
  Management screen), search ("Search by code, description or attribute
  name…"), the usual Filters/Refresh/Export CSV/Toggle cell filters/
  Configure columns/Best-fit columns/3 layout modes, plus **two buttons not
  seen on the other two modules**: "Upload attribute values" (bulk import —
  not explored in this pass) and "Add Value". Table columns: Attribute Value
  Code, Attribute Code (rendered as `<ID> — <Attribute Name>`), User
  Attribute Value Code, Description, Item Category, Category Description,
  Stock Type, Stock Type Description, Modified ID, Modified Date, Status.
  The **Status cell is itself a clickable `button`** (title "Change record
  status") that opens a small menu — this is the one module of the three
  where the list's Status column is interactive, not just a read-only badge.
- **"Masters needing review" panel**, confirmed live: appears above the
  table whenever Draft items exist, each with Review/Reject/Make active
  inline actions — this is almost certainly the same "Master Data Approval
  Required" mechanism flagged as a to-do in Company Master's own notes
  (`test-cases/master-data/company-master/company-master-testcases.md`).
  Confirmed here, concretely: clicking "Review" opens the normal Edit Value
  dialog but with two extra buttons, "Reject" and "Approve & make active",
  appended after the standard Cancel/Save changes/Delete — the approval
  workflow is embedded directly in the edit surface, not a separate screen.
- **Create form fields, exactly as marked live with `*`**: Attribute Value
  Code (disabled, shows literal placeholder text `< NEW >` before save —
  note this differs from Attribute Master's "Auto-generated" placeholder
  text, yet another per-screen wording inconsistency), Attribute Code\* (a
  "Pick parent attribute" textbox + button opening a picker dialog — grid of
  the **28** real attributes from Attribute Master, columns Attribute ID/
  Name/Active/Data Type/Desc Flag/Item Category/Category Description/
  Required — confirms this module genuinely references live Attribute Master
  data, not a cached copy: attributes created earlier in this same session
  via Attribute Master's own test pass showed up here immediately), User
  Attribute Value Code\* (textbox, placeholder "D004"), Description
  (textbox, optional, placeholder "100% Cotton"), Status (checkbox, always
  checked **and disabled** — same non-interactive pattern as Attribute
  Master's and Product Service Master's own Active checkboxes).
- **Surprising, confirmed-live finding: new values created by an Admin user
  (`alice`) save directly as "Approved", not "Draft".** Every value created
  in this session's exploration landed on Status "Approved" immediately,
  while the pre-existing "Masters needing review" Draft items were all
  "raised by seed" or by a named non-admin user (`sathish.nagarajan`). This
  strongly suggests the Draft/Approval gate only applies to certain
  roles/users (or is tied to the "Master Data Approval Required" company
  switch noted in Company Master's file) and that Admin creates bypass it —
  **not verified end-to-end with a second, lower-privilege account in this
  session** (no such credentials were available); flagged here for whoever
  picks up the approval-workflow angle next, same as Company Master's own
  note asks.
- **Exact toast text, confirmed live — and genuinely inconsistent within
  this one module:**
  - Create: `Attribute value <CODE> created.` (dynamic — the actual
    generated code, e.g. `TCAV793145`, is interpolated into the toast text,
    unlike every other create toast seen across this whole Master Data area,
    which use a fixed string). Has a trailing period.
  - Edit/Save: `Attribute value updated` — fixed string, **no trailing
    period**.
  - Delete: `Attribute value deleted.` — trailing period.
  - Inline status change: `Attribute value status updated.` — trailing
    period.
- **Real permanent Delete confirmed live**, via a full round trip (create →
  search → open → Delete → confirm alertdialog → verify gone from search).
  This is the only one of the three modules in this pass with a genuine
  delete action — Attribute Master and Product Service Master have no
  Delete button anywhere.
- **Real working inline deactivate confirmed live**, via a full round trip
  (create → click Status "Approved" button → menu "Change to Inactive" →
  confirm alertdialog "Change record status?" "This record will be set to
  Inactive." / "Set to Inactive" → toast → row shows "Inactive" → clean up
  via Delete). This is the only one of the three modules where deactivation
  actually works through the UI at all — both Attribute Master and Product
  Service Master have an always-disabled "Active" checkbox and no other
  mechanism (see those files' own "no deactivate path" findings).
- **Duplicate handling confirmed live**: same User Attribute Value Code under
  the same parent Attribute is blocked with toast `Could not create the
  value` (yet another distinct wording from Attribute Master's "Failed to
  create attribute." and Product Service Master's "Could not create the
  service" — three different phrasings for conceptually the same failure
  across three screens in the same nav group, worth flagging to the team as
  a consistency gap). Not tested in this pass: whether the same code is
  allowed under a *different* parent attribute (very likely yes, by analogy
  with Attribute Master's own per-category scoping — worth a quick follow-up
  check before assuming).
- **User Attribute Value Code is force-uppercased and capped at 20
  characters**, confirmed live (see TC:12) — a materially different cap from
  Attribute Master's Attribute Name (200 chars, no case change) and Product
  Service Master's Description (200 chars, no case change). Do not assume a
  shared 200-char convention across this nav group without checking per
  field.
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen.
- **Not covered in this pass**: "Upload attribute values" bulk-import flow,
  "Reject" and "Approve & make active" actually being exercised (only
  inspected, not clicked, to avoid mutating real seed/production-like Draft
  data — see TC:7), Filters rule-builder, Export CSV content, Configure/
  Best-fit columns, the 3 layout modes, and whether a non-Draft value's Edit
  dialog can ever show a "Reject"/"Approve" pair (only confirmed for Draft).
