# CRM — Contacts tab in Customer Details screen (Sprint 2)

- **User Story:** [Contacts tab in Customer Details screen](https://app.clickup.com/t/z941abta54) — as a CRM
  user, I want to view and manage all Contacts linked to a Customer from
  within that Customer's Details screen, so that I can see who I deal
  with at that Customer and keep those associations current.
- **Test-case set:** [CRM - Sprint -2 -Contacts tab in Customer Details screen](https://app.clickup.com/t/z941abu03d)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/17-contacts-tab-customer-details.spec.ts`](../../tests/regression/crm/17-contacts-tab-customer-details.spec.ts)
- **Page object:** [`src/pages/crm/contacts-tab.page.ts`](../../src/pages/crm/contacts-tab.page.ts)

## Functional requirements (from the User Story)

- FR-1.1: The tab lists every Contact currently linked to the Customer,
  with enough identifying detail to distinguish between them.
- FR-1.2: The user can search and multi-select existing unlinked Contacts
  to associate with the Customer.
- FR-1.3: The user can unlink a Contact from the Customer without
  deleting the Contact record itself.
- FR-1.4: The user can initiate creation of a brand-new Contact
  pre-associated with this Customer.
- FR-1.5: Selecting a linked Contact navigates to that Contact's Details
  screen.
- FR-1.6: A linked Contact's active/inactive status reflects the
  Customer's own status where the two are governed together.
- FR-1.7: Every link, unlink, or creation action from this tab is
  recorded in the relevant audit history.

## Test cases

| #    | Test case                                                              | Steps                                                                                                                                                              | Expected result                                                                                                     | ClickUp                                      | Automated | Verified locally |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ---------------- |
| TC:1 | Verify default/empty state of Contacts tab when no contacts are linked | 1. Open a Customer with no linked Contacts.<br>2. Navigate to its Contacts tab.                                                                                    | Tab shows an empty state (no linked Contacts listed) plus entry points to link an existing or create a new Contact. | [link](https://app.clickup.com/t/z941abu03j) | ✅        | ❌ not yet run   |
| TC:2 | Verify searching, selecting, and linking existing contacts             | 1. Open the Contacts tab.<br>2. Click "Link Contact".<br>3. Search for and select one or more existing unlinked Contacts.<br>4. Confirm.                           | Selected Contacts appear in the tab's linked-Contacts list.                                                         | [link](https://app.clickup.com/t/z941abu03k) | ✅        | ❌ not yet run   |
| TC:3 | Verify unlinking a contact from Customer without deleting record       | 1. Open the Contacts tab for a Customer with a linked Contact.<br>2. Unlink that Contact and confirm.<br>3. Check the Contact still exists as a standalone record. | Contact no longer appears in the tab's list, but the Contact record itself still exists (findable elsewhere).       | [link](https://app.clickup.com/t/z941abu03n) | ✅        | ❌ not yet run   |
| TC:4 | Verify unlinking a contact from a customer                             | 1. Open the Contacts tab for a Customer with a linked Contact.<br>2. Unlink that Contact and confirm.                                                              | Contact no longer appears in the tab's linked-Contacts list.                                                        | [link](https://app.clickup.com/t/z941abu03p) | ✅        | ❌ not yet run   |
| TC:5 | Verify navigation to Contact Details from the linked contacts list     | 1. Open the Contacts tab for a Customer with a linked Contact.<br>2. Click that Contact's row.                                                                     | Navigates to that Contact's own Details screen.                                                                     | [link](https://app.clickup.com/t/z941abu03r) | ✅        | ❌ not yet run   |
| TC:6 | Verify status propagation (Active / Deactivate governance)             | 1. Open the Contacts tab for a Customer whose status is governed together with its Contacts.<br>2. Deactivate/activate the Customer.<br>3. Re-check the tab.       | Linked Contacts' active/inactive status reflects the Customer's own status change.                                  | [link](https://app.clickup.com/t/z941abu09y) | ✅        | ❌ not yet run   |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story's screen
(Customer Details → Contacts tab) doesn't exist yet as automated CRM
coverage in this repo (only Create/Activate/Deactivate Customer and
Create/Edit Contact are confirmed so far — see `customer-detail.md`/
`create-contact.md`). Everything in `contacts-tab.locators.ts` /
`contacts-tab.page.ts` is a best-guess derived from this ClickUp text and
this framework's established UI patterns (tab widgets, combobox/
multi-select popups, `role=dialog` modals, `[data-sonner-toast]` toasts),
**not confirmed against a real running screen**. In particular:

- **Tab structure**: assumed a standard `role="tablist"`/`role="tab"`/
  `role="tabpanel"` widget with a tab literally named "Contacts", reached
  from the existing Customer Details screen. `CustomerDetailLocators`
  today has no tabs at all (Profile/Management/Departments render as
  always-visible sections) — there's no existing precedent in this
  codebase to confirm the tab shape against.
- **Route**: assumed the Contacts tab lives at the same confirmed
  `/crm/customers/{uuid}` route as the rest of Customer Details (per
  customer-detail.page.ts), just a different tab of that same page —
  not a separate URL. Unconfirmed whether selecting the tab changes the
  URL (e.g. a `?tab=contacts` query) at all.
- **Button labels**: "Link Contact" (opens the search/multi-select panel)
  and "Create Contact" (initiates a pre-linked new Contact, reusing the
  label already confirmed elsewhere in this app for the same conceptual
  action — see the post-save modal on Create Customer) are both guesses.
  "Unlink" per-row action and its confirmation dialog shape (mirroring
  the Activate/Deactivate confirm-dialog pattern on
  `CustomerDetailLocators`) are guesses too — the real screen may unlink
  with a single click and no confirmation step at all.
- **Multi-select mechanics**: modeled as a searchable list of
  `role="option"` rows that toggle selected without closing the panel
  (mirroring `CustomerDetailPage.selectReasons()`), confirmed with a
  final explicit "Link" button. Unconfirmed whether selection is
  checkbox-based, chip-based, or single-select-at-a-time repeated.
- **TC:3 and TC:4 overlap**: both ClickUp subtasks describe "unlinking a
  contact" near-identically (TC:3 explicitly checks the record survives
  as a standalone entity; TC:4 doesn't say so but is otherwise the same
  flow). Implemented as written — two separate tests — rather than
  merged, the same way `create-customer.md` notes an equivalent overlap
  with `contact-creation-screen.md` rather than silently deduplicating.
- **TC:6 (status propagation)** is the least concrete requirement in the
  source text ("where the two are governed together" — unclear which
  statuses are actually linked, or whether Contact status is ever
  independently settable at all). `17-contacts-tab-customer-details.spec.ts`
  marks this one `test.fixme()` pending a live look at the real
  Customer/Contact status relationship, the same way TC:5-6/TC:10 are
  `test.fixme()`'d in `11-create-contact.spec.ts` for comparable reasons.

Before trusting a pass/fail from
`17-contacts-tab-customer-details.spec.ts`, run it against a live
`tilt up` stack or dev, fix locators to match what's actually rendered,
and update this note the way `create-contact.md` and `create-customer.md`
were updated after their own first live runs.
