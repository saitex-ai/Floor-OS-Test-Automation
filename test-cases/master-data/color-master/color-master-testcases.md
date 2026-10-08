# Master Data — Color Master

System Management > Color Master (`/master-data/system-management/colors`) manages color codes
referenced by inventory sub-items and Techpack details. This is the first test-case documentation
for this screen; nothing here was carried over from notes — every row below was confirmed
directly against `https://dev.flooros.app` (session: `.auth/master-data.json`, user
`alice`/Admin), including one real throwaway record (`TC-Color-<timestamp>`) created, edited,
deactivated and reactivated live.

| #     | Test case                                                               | Steps                                                                                                                                                            | Expected result                                                                                                                                                                                           |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify Color Master list screen layout                                 | 1. Navigate to Master Data > System Management > Color Master.                                                                                                  | "Color Master" heading and description load. Tabs All/Active/Inactive each show a live count. Table columns: Color ID, Color Code, Description, Item Category, Status. A "New Color" button, Search, Filters, Refresh, Upload, Export CSV and column-layout controls are all present. |
| TC:2  | Verify successful Color creation with all required fields              | 1. Click "New Color".<br>2. Enter a unique Color Code (e.g. `TC-Color-<timestamp>`).<br>3. Enter a Description.<br>4. Click "Pick item category", search, and select a category.<br>5. Click "Create". | Toast reads exactly "Color created." A new row appears with a system-generated Color ID (format like `CMC0000020`), the entered Description, selected Item Category, and Status "Active". **Confirmed live**: the Color Code is stored uppercased server-side (e.g. typed `TC-Color-123` is persisted as `TC-COLOR-123`) — the auto-generated Color ID, not the entered code, is the real primary key. |
| TC:3  | Verify editing an existing Color's Description                         | 1. Open an existing Color row.<br>2. Change the Description text.<br>3. Click "Save changes".                                                                   | Save succeeds; toast reads exactly "Color updated." The grid reflects the new Description immediately. Note: Color Code is disabled/locked in the Edit dialog — it cannot be changed after creation; Description and Item Category remain editable. |
| TC:4  | Verify Cancel on Edit discards unsaved changes                         | 1. Open an existing Color.<br>2. Change the Description.<br>3. Click "Cancel" (not Save).<br>4. Re-open the same Color.                                         | The dialog closes without saving. Re-opening shows the original, unedited Description — confirmed live by round-tripping the value.                                                                      |
| TC:5  | Verify searching the Color list by code                                | 1. Enter an existing Color Code fragment (e.g. a known code or the Color ID) into "Search by code, name…".                                                      | The grid narrows to just the matching row(s) within ~1-2 seconds.                                                                                                                                         |
| TC:6  | Verify deactivating a Color updates its status and the tab counts      | 1. Open an existing (throwaway) Color.<br>2. Click "Deactivate `<ColorID>`".                                                                                     | Toast reads exactly "Color deactivated." The row's Status flips to "Inactive", and the Active/Inactive tab counts update immediately — confirmed correct both right after the action and after a full page reload (contrast with Size Master, where the equivalent action does **not** update the list — see that module's notes). |
| TC:7  | Verify reactivating a deactivated Color                                | 1. Open a deactivated Color.<br>2. Re-check the "Status" checkbox.<br>3. Click "Save changes".                                                                  | Status flips back to "Active" and the tab counts update. Toast reads the same generic "Color updated." as any other edit — there's no distinct "Color activated." / "reactivated" message. |
| TC:8  | Verify Color Code is a genuinely required field                        | 1. Open "New Color".<br>2. Leave Color Code blank; fill Description and Item Category.<br>3. Click "Create".                                                    | Save is blocked. An inline "Required" message appears under Color Code.                                                                                                                                   |
| TC:9  | Verify Description is a genuinely required field                       | 1. Open "New Color".<br>2. Leave Description blank; fill Color Code and Item Category.<br>3. Click "Create".                                                    | Save is blocked. An inline "Required" message appears under Description.                                                                                                                                  |
| TC:10 | Verify Item Category is a genuinely required field                     | 1. Open "New Color".<br>2. Fill Color Code and Description; leave Item Category unset.<br>3. Click "Create".                                                    | Save is blocked. An inline "Required" message appears under Item Category and its lookup field is marked invalid.                                                                                        |
| TC:11 | Verify duplicate Color Code within the same Item Category is rejected  | 1. Create a Color with a given Code + Item Category (succeeds).<br>2. Repeat "New Color" with the exact same Code and Item Category.<br>3. Click "Create".      | Save is blocked. **Confirmed live**: the API returns `409 color_conflict` with message `color code "X" is already in use in category Y` — but the UI only shows a generic "Failed to create color." toast; the specific reason is never surfaced. |
| TC:12 | Verify Color Code and Description respect their max-length limits      | 1. Open "New Color".<br>2. Attempt to type more than 50 characters into Color Code, and more than 200 into Description.                                         | Both fields stop accepting further characters at their limit (`maxlength="50"` on Color Code, `maxlength="200"` on Description — confirmed via the rendered input attributes), rather than erroring after the fact. |

## Notes for whoever picks this up next

**Confirmed-live field requiredness**: Color Code, Description, and Item Category are all
genuinely required (TC:8-10) — confirmed by submitting with each one missing in turn and reading
the real inline "Required" error. The "Status" checkbox (labelled "Status", not "Active" — unlike
Size Master's identically-behaved checkbox, which is labelled "Active"; a small but real
per-screen naming inconsistency) defaults to checked and is not itself validated.

**Confirmed-live success/action toasts**: Create → `"Color created."`, Edit save →
`"Color updated."`, Deactivate → `"Color deactivated."` (all with trailing periods). Reactivating
via the Status checkbox reuses the generic `"Color updated."` toast rather than a distinct message.

**Real behavioral contrast with Size Master worth flagging**: Color Master's Deactivate flow
(TC:6) works correctly end-to-end — status, tab counts, and a reload all agree — which is the
*expected* shared-component behavior. Size Master's identical-looking Deactivate action does not
update its list/tabs at all (see `size-master-testcases.md` TC:11's bug note). Having confirmed
both independently, that's a real Size-Master-specific regression, not a platform-wide gap.

**Duplicate handling (TC:11)**: same generic-toast gap as Size Master and Unit of Measure — the
backend returns a specific, useful conflict message (naming the exact code and category), but the
UI only ever shows "Failed to create color." Worth raising once, with the team, as a shared
front-end gap across all three Master Data screens rather than three separate bugs.

**Observation, not a reproducible bug**: several pre-existing rows on the live list (e.g. Color
Codes "41842", "AG/#960") show a blank Item Category, even though the Create form enforces Item
Category as required (TC:10). Most likely legacy/imported data that predates this validation being
added — flagging for awareness, but it could not be reproduced through the current Create form
(every attempt to save without an Item Category was correctly blocked), so it is not filed as a
live bug the way Size Master's TC:11 is.

**Data prerequisite for re-running TC:11**: needs at least one existing Color Code value already
saved under a specific Item Category (or create one fresh in TC:2 and immediately retry it with
the same code + category).

**Not covered / not yet verified**: bulk "Upload" import, Export CSV content, the Filters
rule-builder panel, column configuration/resizing, and the three layout-mode toggles — same scope
limit as the other two Master Data screens documented this session.
