# Master Data — System Management: End-to-End

Cross-module coverage for Master Data > System Management
(`/master-data/system-management/*`). Where every one of the 17 sub-module
files in `test-cases/master-data/` tests one screen in isolation, this file
tests the thing none of them can: that the masters actually **chain
together** the way a real admin would set them up for a brand-new
Customer/factory from scratch, in dependency order.

**Methodology, stated plainly**: every individual field name, picker
mechanic, and toast text used in the steps below is copied from that
module's own file, where it was independently confirmed live (not
guessed) — see each module's own `test-cases/master-data/<module>/` file
for that evidence. What this file adds on top is the **sequencing and the
cross-module linkage claims** (e.g. "the Site you just created appears in
Department's facility picker"). E2E-TC:1 (the full happy-path chain) was
composed from those confirmed per-module facts but **not yet executed as
one single unbroken live run in this session** — a partial live run was
attempted while authoring this file (see Notes) and surfaced one
ambiguous, unconfirmed result worth a dedicated re-check rather than
trusting either way. Treat the ✅/🔲 column per test case as the honest
signal: ✅ = independently re-verified live for this file specifically;
🔲 = composed from already-confirmed single-module facts, chain-level
behavior itself not yet independently re-executed.

| #        | Test case                                                                 | Steps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Expected result                                                                                                                                                                                                                                                                                                                                                    | Verified |
| -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| E2E-TC:1 | Verify a full, realistic Master Data setup chain for a brand-new Customer/factory, start to finish | 1. **Company**: New Company — fill Company Code, Prefix Code, Company Name, Address, Primary/Secondary Currency; Create.<br>2. **Site**: New site — fill Site code, Site name, Country, Timezone; Create.<br>3. **Department**: New department — fill Department code/name, Default working calendar; "Add facility" and pick the Site from step 2; Create.<br>4. **Employee**: New Employee — fill Full Name; pick the Department from step 3 in its picker dialog; pick a Maintained By value; Create.<br>5. **Customer**: New Customer — fill Prefix ID, Customer Name, Country, Currency; Create.<br>6. **Customer Season**: New — "Pick a customer" and select the Customer from step 5; fill Season Code, Description; Create.<br>7. **GMT Inseam Master**: New Inseam — fill Code, Description; Create.<br>8. **GMT Waist Master**: New Waist — fill Code, Description; Create.<br>9. **Size Master**: New — pick an Item Category, pick the Inseam from step 7, pick the Waist from step 8; Create.<br>10. **Color Master**: New Color — fill Color Code, Description; pick the same Item Category as step 9; Create.<br>11. **Unit of Measure**: New UoM — fill UoM Code, Description; Create.<br>12. **Vendor Master**: New Vendor — fill Prefix ID, Vendor Name, Currency, Credit Terms, Payment Method, Address Line 1, City, Country; Create.<br>13. **Techpack Type**: New Techpack Type — fill Code, Name; Create.<br>14. **Customer Percentage**: Add Row — pick the Customer from step 5, pick an Item Type; Save.<br>15. **Sample Request Creation**: New — pick the Customer from step 5, pick the Season from step 6 (should already be filtered to only that Customer's seasons), pick the Company from step 1; Save. | Every one of the 15 creates succeeds with its own module's real confirmed toast (`Company created.` / `Site created.` / `Department created.` / `Employee created` / `Customer <code> created.` / `Season <code> created.` / `Inseam created.` / `Waist created.` / `Size created.` / `Color created.` / `UoM created.` / `Vendor <code> created.` / `Techpack type created` / `Row added`-equivalent / `Sample request created.`). Critically: at steps 3, 4, 6, 9, 10, 14 and 15, the just-created prerequisite record (Site/Department/Customer/Inseam/Waist/Item Category/Customer+Season+Company) is actually **findable and selectable** in that step's own picker/combobox — not just present in the database. Step 6's Season dropdown in step 15 shows **only** the one Season just created for that Customer (confirms the per-Customer filtering documented in `sample-request-creation-testcases.md` holds for brand-new data, not just seed data). | 🔲 |
| E2E-TC:2 | Verify a deactivated prerequisite is still visible/selectable where already linked, but its own status is correctly reflected | 1. Complete steps 1–3 of E2E-TC:1 (Company → Site → Department, with the Department's facility pointing at the Site).<br>2. Deactivate the Site (Sites list > open it > Deactivate).<br>3. Re-open the Department created in step 3.                                                                                                                                                                                                                                                                                             | The Department's existing facility row still shows the Site (no silent data loss from deactivating a referenced master) — whether it's visually flagged as "Inactive" inline or not is the open question this test settles. Separately, attempt "Add facility" on a **new** Department and search for the now-Inactive Site: settle whether an Inactive Site still appears as a selectable option (a real "can you still reference inactive masters" question, not yet answered by any individual module file). | 🔲 |
| E2E-TC:3 | Verify a deactivated Customer is still referenceable by records created before deactivation, and is correctly excluded (or not) from new picks | 1. Complete steps 5–6 of E2E-TC:1 (Customer → Customer Season).<br>2. Deactivate the Customer (if Customer Master's own "Deactivate" top action is used — see that module's TC:12-equivalent, noting the file's own confirmed "Deactivate button never relabels to Activate" bug applies here too).<br>3. Open Sample Request Creation > New > Customer picker and search for the now-Inactive Customer.<br>4. Open Customer Percentage > Add Row > Customer picker and search for the same Customer.                        | Settles whether Inactive Customers remain pickable for brand-new Sample Requests / Customer Percentage rows (neither individual module file tested against an Inactive Customer specifically — both only tested against Active ones). If Inactive customers ARE still selectable, that may be worth flagging the same way Sites' now-fixed Country/Timezone gap and Company's non-relabeling Deactivate button were flagged in their own files — a real product question, not an assumed bug either way. | 🔲 |
| E2E-TC:4 | Verify Size Master's "Description" auto-derives correctly from a same-session Item Category + Inseam + Waist combination | 1. Complete steps 7–8 of E2E-TC:1 (create one new GMT Inseam value and one new GMT Waist value).<br>2. Go to Size Master > New > pick Item Category, the new Inseam, the new Waist.<br>3. Observe the read-only Description field before clicking Create.                                                                                                                                                                                                                                                                     | Description auto-populates from the three picks (confirmed mechanism exists per `size-master-testcases.md`, e.g. "Item Category / Inseam / Waist" composed into a readable string) using the **just-created** Inseam/Waist values specifically, not stale/cached ones — the one piece this test adds beyond the single-module file, which only exercised the Description auto-derive against pre-existing seed Inseam/Waist values. | 🔲 |
| E2E-TC:5 | Verify Currency Rate Buyer's read-only lookup can resolve a brand-new Customer created this session | 1. Complete step 5 of E2E-TC:1 (create a new Customer).<br>2. Go to Currency Rate Buyer (read-only for this role — see that module's own file) and attempt to filter/load by the new Customer.                                                                                                                                                                                                                                                                                                                                | The new Customer is at least selectable in the Customer filter (even if "no rows match" is the realistic result, since no rate has been entered for a same-session brand-new Customer) — confirms the Customer master and the Currency Rate Buyer screen share the same live customer list in real time, not a cached/batch-synced one. | 🔲 |

## Notes for whoever picks this up next

**What this file is and isn't.** Every step above reuses field names,
picker mechanics, and toast text that are independently confirmed live in
each sub-module's own `test-cases/master-data/<module>/*.md` file
(authored in parallel, same session, 2026-10-06) — nothing in the *shape*
of these steps is guessed. What's genuinely new and NOT yet independently
re-executed as one continuous live run is the **chaining claim itself**:
that a record created in module A is actually immediately selectable in
module B's picker, in the same browser session, with no reload. That's
the entire point of an end-to-end test (individual CRUD already being
proven doesn't prove the links between masters work), so it's named
explicitly rather than quietly assumed.

**A partial live attempt was made while authoring this file** (scratch
scripts, deleted after use, per this repo's convention) and produced a
genuinely ambiguous result on step 3 (Department's "Add facility" picker):
clicking "Add facility" immediately after opening the New Department form
(before touching any other field) appeared to surface what looked like
the **Default working calendar**'s own option list, not a facility/Site
search dialog — but this was observed with a hastily-written generic
locator (`getByRole('button', { name: /Add facility/i })`) that may simply
have matched the wrong element, not a confirmed product bug. **Do not
treat this as a finding** — it's flagged here only so whoever runs E2E-TC:1
for real knows to look closely at that specific step rather than assume
Department's own file (which DID confirm "Add a Facility row → pick a
facility" works, in TC:1) is wrong. The individual Department file's own
TC:1 is the trustworthy source for that mechanic; this note is a caution
about this file's own authoring process, not a bug report.

**Why these 5 cases and not more.** E2E-TC:1 is the backbone (the full
realistic setup chain). E2E-TC:2/3 target the one class of question no
single-module file could answer alone: what happens when a prerequisite
master is deactivated out from under something that already references
it, or when something new tries to reference an already-deactivated one —
directly relevant given how many of the 17 modules documented a
**Deactivate button that never relabels to Activate** as their one shared
recurring bug (Company, Techpack Type, and implicitly others — see each
file's own Notes). E2E-TC:4/5 are narrower "does real-time data actually
propagate, not just eventually-consistent seed data" checks, picked
because Size Master and Currency Rate Buyer are the two screens whose own
files most explicitly relied on **pre-existing seed data** to prove their
pickers work, never same-session brand-new data.

**Suggested execution order for whoever runs this for real**: E2E-TC:1
first (it's a prerequisite for all the others — TC:2-5 all assume at least
part of its chain already exists). Budget real time for it: 15 real
screen flows, several of them (Department, Employee, Customer Season,
Sample Request Creation) involving a nested picker-dialog-within-a-form
interaction, not a flat form fill.

**Known, already-documented bugs that will surface again if re-run**
(not re-litigated here, see each module's own file): Company/Techpack
Type's non-relabeling Deactivate button; Size Master's Deactivate not
reflecting in its own list/Inactive tab; Sample Request Creation's
Status column always rendering blank; several screens' generic
"Failed to create X." toasts hiding the real server-side reason.
