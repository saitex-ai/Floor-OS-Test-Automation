# BOM — Permissions

- **User Story:** As a BOM admin, I want BOM lifecycle actions limited to the roles allowed to take them, so a non-approver can read a BOM but not approve, reopen or revise it.
- **Test-case set:** not yet created in ClickUp.
- **Automated in:** [`tests/regression/bom/05-bom-permissions.spec.ts`](../../tests/regression/bom/05-bom-permissions.spec.ts) — 4 cases, all real `test()` blocks.
- **Page objects:** [`bom-detail.page.ts`](../../src/pages/bom/bom-detail.page.ts) / [`bom-items.page.ts`](../../src/pages/bom/bom-items.page.ts) + their locators (fixtures `bomDetailPage`, `bomItemsPage`)
- **Latest run:** uat, 2026-10-08, as `alice` — **4/4 pass**.

Alice (admin) builds one disposable BOM and drives it Open → Approved; the second user (`BOM_SECOND_USER_<ENV>`, a Qc-lead such as `bob`, in its own isolated browser context) looks at the same BOM in each state. Each case compares bob's control against Alice's on the same screen. Skips when no second user is configured.

**Test data:** every techpack and BOM this suite creates carries "QA-AUTO — BOM regression test data (pw-hybrid-framework). Safe to delete." in its Description (shown as **Remark** in the techpack and BOM lists), so it can be found and deleted from the backend later. See `tests/regression/bom/support/disposable-bom.ts`.

| #    | Test case                                                                                  | Steps                                                                                | Expected result                                                                   | ClickUp | Automated | Verified (uat)       | Verified (dev) | Verified (local) |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------- | --------- | -------------------- | -------------- | ---------------- |
| TC:1 | Verify a non-admin (Qc-lead) user can open the BOM list                                    | 1. Log in as the second user (bob, Qc-lead) and open /bom.<br>2. Search for the BOM. | The list loads, signed in as bob; the BOM is listed.                              | —       | ✅        | ✅ pass (2026-10-08) | 🔲 not run     | 🔲 not run       |
| TC:2 | Verify a non-admin user can open a BOM and read its header and items                       | 1. As bob, open the BOM.                                                             | Header (code, Open) and its 2 lines are shown.                                    | —       | ✅        | ✅ pass (2026-10-08) | 🔲 not run     | 🔲 not run       |
| TC:3 | Verify a non-admin user cannot "Costing Approve" a BOM the admin can                       | 1. As alice, open the rev 0 BOM with items.<br>2. As bob, open the same BOM.         | alice: Costing Approve enabled. bob: disabled.                                    | —       | ✅        | ✅ pass (2026-10-08) | 🔲 not run     | 🔲 not run       |
| TC:4 | Verify a non-admin user cannot Reopen, Mark complete or Create Revision on an Approved BOM | 1. As alice, Costing Approve it.<br>2. As bob, open it.                              | alice: Reopen / Mark complete / Create Revision enabled. bob: all three disabled. | —       | ✅        | ✅ pass (2026-10-08) | 🔲 not run     | 🔲 not run       |

## Notes

- **Open question for the user (not graded):** bob (Qc-lead) _can_ create BOMs, add/edit lines and open "Create Costing Request" — only the approve/reopen/complete/revise actions are blocked for him. Confirm whether Qc-lead is meant to have BOM write access before adding cases for it.
