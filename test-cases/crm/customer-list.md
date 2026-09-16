# CRM — Customer List (Sprint 1)

- **Test-case set:** [CRM - Sprint 1 - Customer list Screen](https://app.clickup.com/t/90181912927/86eyqwcrp)
- **Source:** ClickUp, expanded from subtasks 2026-09-16
- **Automated in:** N/A — see note.

## This ClickUp task has no real Customer List content

Despite being named "Customer list Screen", every one of this task's subtasks (TC:3–11) is **word-for-word identical** — same markdown, same steps, same expected results — to `create-customer.spec.ts`'s existing TC:2, TC:4, TC:5, TC:6, TC:7, TC:8, TC:9, TC:10, TC:11 (duplicate detection, business process validation, save flows, etc.). Confirmed by reading every subtask's full description, not just titles.

There is no genuine "browse/search/filter the Customer List" content here at all — that's already covered separately by `test-cases/crm/contact-list.md`'s equivalent for Contacts (`ContactListPage`/`contact-list.spec.ts`), which a real "Customer List" screen would presumably mirror, but this ClickUp task doesn't actually contain that content.

**Recommendation:** flag this to whoever maintains the ClickUp test-case tree — it looks like these 9 subtasks got attached to the wrong parent task. No spec file needed here; nothing to automate that isn't already covered.
