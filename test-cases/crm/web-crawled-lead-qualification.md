# CRM — [Origin Type = Web Crawled] Lead Qualification (Sprint 5)

- **User Story:** [[Origin Type = Web Crawled]](https://app.clickup.com/t/86eye4dtr)
- **Test-case set:** [CRM -Sprint -5 - [Origin Type = Web Crawled] Lead Qualification](https://app.clickup.com/t/z941abzh3w)
- **Sources:** the user story; dev (`https://dev.flooros.app`) explored on 2026-10-22; the Floor OS CRM prototype (`crm-leadqual.jsx`, 2026-10-14) as reference only. Expected results follow dev. Where the story asked for more (the crawl card, Sales Pitch Recommendation, a review author), the expected behaviour was changed to dev's on 2026-10-23; see "Expected behaviour changed to dev's" below.
- **Automated in:** [`tests/regression/crm/37-web-crawled-lead-qualification.spec.ts`](../../tests/regression/crm/37-web-crawled-lead-qualification.spec.ts)
- **Locators:** [`src/locators/crm/lead-qualification.locators.ts`](../../src/locators/crm/lead-qualification.locators.ts) (extended)
- **Page object:** [`src/pages/crm/lead-qualification.page.ts`](../../src/pages/crm/lead-qualification.page.ts) (extended)

## User story (summary)

A Lead the web crawler discovered opens on its Lead Qualification tab with
the crawl detection as its origin card — crawl source/cohort, detection
date and the full detection summary (incl. the matched signal), read-only —
above the AI sections. Qualification is about the company, not a person:
no Contact Info section, no web form / social / comment / post sections, no
reply composer, and nothing implies the prospect contacted SAITEX. The AI
sections are generated from the crawl detection plus public company data
and can be refined with the AI Chatbot markup tool. Managers record reviews
and scores; Convert to Qualified Lead is blocked until at least one review
exists; past the Lead stage the screen is read-only. A Lead with no
identifiable contact still qualifies and converts on company information.

## How this suite gets its Web Crawled Leads

- **Display TCs** run **read-only** on Leads the crawler created on dev
  (Created By "CRM", `createdBy: null`). The "what was detected" oracle is
  the tab's own `GET /api/crm/customers/:id/lead-qualification` read, which
  returns `crawlDetection` (`sourceDomain`, `intentLabel`, `detectedAt`,
  `detectionSummary[]`, `fitScore`, `fitAxes[]`) next to the AI `dossier`.
- **TCs that write** (save reviews, convert) run on a Web Crawled Lead the
  suite **creates itself** through Create Customer (Origin Type "Web
  Crawled", Origin "Established Brand", no contact). Such a Lead has no
  crawl detection and no AI dossier.

Existing records used, all read-only (`webCrawledLeads` in
[`seed-records.data.json`](../../src/data/crm/seed-records.data.json), picked 2026-10-22):

| Key           | Record          | Why                                                                                         |
| ------------- | --------------- | ------------------------------------------------------------------------------------------- |
| `crawled`     | HIMDENIM        | Crawler Lead; summary with matched-signal lines; dossier has company email/phone; 1 IG post |
| `crawledRich` | ELV Denim       | Crawler Lead; full AI sections incl. public financial data; 2 IG posts                      |
| `noContact`   | CURVJEANS LLC   | Crawler Lead with Contacts (0)                                                              |
| `sparse`      | Kings Of Indigo | Crawler Lead with no Customer Info / Financial data                                         |
| `converted`   | Testing         | Web Crawled, Qualified Lead, 1 review, seeded dossier (no crawl detection)                  |

If one is converted or deleted, the test skips with the key to replace;
pick another from Customers (Origin Type = Web Crawled, Created By = CRM).

## Test cases

| #     | Test case                                                                     | ClickUp                                      | Automated                           | Dev result (2026-10-23) / ClickUp status                                                                                    |
| ----- | ----------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Opens at Customer Info with No Crawl Detection Card (Positive)                | [link](https://app.clickup.com/t/z941abzh3x) | ✅                                  | ✅ pass — first card is Customer Info; no crawl card                                                                        |
| TC:2  | Crawl Source and Cohort Stored but No Card Marked as the Origin (Positive)    | [link](https://app.clickup.com/t/z941abzh3y) | ✅                                  | ✅ pass — source/cohort in the tab data; no Origin-marked card; cohort not shown                                            |
| TC:3  | Detection Date Is Not Shown on the Tab (Positive)                             | [link](https://app.clickup.com/t/z941abzh3z) | ✅                                  | ✅ pass — detection date stored, shown nowhere on the tab                                                                   |
| TC:4  | Detection Summary Shown Through Customer Info and Compatibility (Positive)    | [link](https://app.clickup.com/t/z941abzh40) | ✅                                  | ✅ pass — descriptive lines in Customer Info; matched signals as fit reasons in Business Compatibility Report               |
| TC:5  | Stored Crawl Detection Cannot Be Edited from the Tab (Negative)               | [link](https://app.clickup.com/t/z941abzh41) | ✅                                  | ✅ pass — no crawl card; only editable box is Manager's review; stored detection unchanged after a reload                   |
| TC:6  | Contact Info AI Section Is Not Shown (Negative)                               | [link](https://app.clickup.com/t/z941abzh42) | ✅                                  | ✅ pass (dossier holds company email/phone, UI omits Contact Info)                                                          |
| TC:7  | AI Sections Open at Customer Info and End at Compatibility (Positive)         | [link](https://app.clickup.com/t/z941abzh43) | ✅                                  | ✅ pass — 4 sections in order, none blank; no Sales Pitch Recommendation                                                    |
| TC:8  | AI Sections Generated from the Crawl Detection and Public Data (Positive)     | [link](https://app.clickup.com/t/z941abzh44) | ✅ + partial (public-data accuracy) | ✅ pass (Customer Info = summary lines; compat = fit axes + fit score)                                                      |
| TC:9  | Overview Shows the Crawler Origin; Nothing Implies Inbound Contact (Positive) | [link](https://app.clickup.com/t/z941abzh45) | ✅                                  | ✅ pass — no crawl card, no inbound wording; Overview shows Web Crawled / Created By CRM                                    |
| TC:10 | No Web Form / Social / Comments / Posts Sections (Negative)                   | [link](https://app.clickup.com/t/z941abzh46) | ✅                                  | ✅ pass (captured Instagram posts not rendered)                                                                             |
| TC:11 | No Reply / Comment / Message Composer (Negative)                              | [link](https://app.clickup.com/t/z941abzh47) | ✅                                  | ✅ pass                                                                                                                     |
| TC:12 | No Automated Acknowledgement Sent to the Prospect (Negative)                  | [link](https://app.clickup.com/t/z941abzh49) | ✅ + partial (prospect inbox)       | ✅ pass (nothing logged, no emails)                                                                                         |
| TC:13 | AI Pointer Refined with the Markup Tool and Marked Enhanced (Positive)        | [link](https://app.clickup.com/t/z941abzh4a) | automated + partial (apply/persist) | ✅ pass — chatbot opens and the Markup tool works; applying an enhancement needs a writable Lead with AI sections (partial) |
| TC:14 | Manager's Review and Score Mandatory Field Validation (Negative)              | [link](https://app.clickup.com/t/z941abzh4b) | ✅ (own lead)                       | ✅ pass — score error now reads "Score (1–10) required"                                                                     |
| TC:15 | Saved Review Listed with Department, Manager, Score, Timestamp (Positive)     | [link](https://app.clickup.com/t/z941abzh4c) | ✅ (own lead)                       | ✅ pass — row has manager, department, score, timestamp, text; no separate author                                           |
| TC:16 | All Recorded Reviews Are Listed (Positive)                                    | [link](https://app.clickup.com/t/z941abzh4d) | automated                           | ✅ pass                                                                                                                     |
| TC:17 | Conversion Blocked Until a Review Exists (Negative)                           | [link](https://app.clickup.com/t/z941abzh4e) | automated                           | ✅ pass                                                                                                                     |
| TC:18 | Converts to Qualified Lead After a Review (Positive)                          | [link](https://app.clickup.com/t/z941abzh4f) | automated                           | ✅ pass                                                                                                                     |
| TC:19 | No Identifiable Contact: Qualifies and Converts on Company Info (Edge)        | [link](https://app.clickup.com/t/z941abzh4g) | automated                           | ✅ pass                                                                                                                     |
| TC:20 | Read-Only After the Lead Leaves the Lead Stage (Edge)                         | [link](https://app.clickup.com/t/z941abzh4h) | ✅                                  | ✅ pass                                                                                                                     |
| TC:21 | AI Sections with No Public Data Show the No-Information Message (Edge)        | [link](https://app.clickup.com/t/z941abzh4j) | automated                           | ✅ pass                                                                                                                     |
| TC:22 | No Stored Crawl Detection: No Crawl Card, No AI Sections Yet (Edge)           | [link](https://app.clickup.com/t/z941abzh4k) | automated                           | ✅ pass                                                                                                                     |

Re-run on dev 2026-10-23: TC:13, 16, 17, 18, 19, 21 and 22 pass (their `test.fixme()` lines removed), so all 22 TCs now run.

After the expected behaviour was changed to dev's (2026-10-23, `--workers=2`, 22 tests): **22 passed, 0 failed** (TC:16 timed out once on Create Customer's "created successfully" dialog and passed on re-run), about 1.6 min. ClickUp has TC:1–5, 7, 9 and 15 as **pass** (Test Run Date 2026-10-23).

Earlier dev run (2026-10-22, `--workers=1`, saved CRM session): TC:1–12, 14, 15 and 20 passed; the rest hit dev timeouts / a network error ("Loading CRM…" over 60–120 s, the shell sign-in gate over 60 s, `net::ERR_NETWORK_CHANGED`) and were `test.fixme()` with that reason. The crm-setup login also timed out twice ("Signing you in" over 60 s).

## Expected behaviour changed to dev's

**Expected behaviour changed to dev's.** The test titles, the ClickUp test cases and the tests describe dev's behaviour. Each decision (2026-10-23, Banupriya Palanivel, CRM QA) is a comment on the ClickUp test case, linked from the code:

| Test case | Now expected                                                                                                                                                           | Decision                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| TC:1      | The tab opens at Customer Info; no crawl detection card is shown.                                                                                                      | [comment](https://app.clickup.com/t/z941abzh3x?comment=1100750000204236) |
| TC:2      | The crawl source and cohort are stored with the Lead; no card is marked Origin and the cohort is not shown on the tab.                                                 | [comment](https://app.clickup.com/t/z941abzh3y?comment=1100750000204237) |
| TC:3      | The detection date is stored with the Lead but not shown on the tab.                                                                                                   | [comment](https://app.clickup.com/t/z941abzh3z?comment=1100750000204238) |
| TC:4      | No crawl card; the summary's descriptive lines are in Customer Info and its matched signals are the fit reasons in Business Compatibility Report.                      | [comment](https://app.clickup.com/t/z941abzh40?comment=1100750000204239) |
| TC:5      | No crawl card, so nothing on the tab can edit the detection; the only text box is Manager's review; the detection is unchanged after a reload.                         | [comment](https://app.clickup.com/t/z941abzh41?comment=1100750000204240) |
| TC:7      | The AI sections end at Business Compatibility Report; there is no Sales Pitch Recommendation section.                                                                  | [comment](https://app.clickup.com/t/z941abzh43?comment=1100750000204241) |
| TC:9      | The Overview tab (Origin Type Web Crawled, Created By CRM) shows the crawler origin; the Lead Qualification tab has no crawl card and nothing implies inbound contact. | [comment](https://app.clickup.com/t/z941abzh45?comment=1100750000204242) |
| TC:15     | The review row shows the selected Manager as the reviewer, with no separate author ("saved by").                                                                       | [comment](https://app.clickup.com/t/z941abzh4c?comment=1100750000204243) |

## Dev vs story / prototype differences

1. **No crawl origin card (TC:1–5, TC:9).** The tab's data has
   `crawlDetection` (source site, cohort e.g. "Sample: social leads" /
   "Denim buyers all around the globe", detection date, summary, fit score),
   but dev renders nothing for it — the tab opens on Customer Info. The
   prototype has no crawl card either. Accepted as the expected behaviour
   on 2026-10-23 (see the table above).
2. **Nothing on the tab says the Lead came from the crawler (TC:9).** Only
   the Overview tab shows Origin Type "Web Crawled" and Created By "CRM".
   Accepted on 2026-10-23.
3. **Section list (TC:7).** Dev: Customer Info, Customer's Financial
   Standpoint, Customer's Product Range, **Business Compatibility Report**.
   The story lists "Compatibility" and **Sales Pitch Recommendation**; dev
   and the prototype have no Sales Pitch Recommendation (the dossier's
   `pitch` is empty for crawled Leads). Accepted on 2026-10-23.
4. **Contact Info (TC:6).** Hidden as the story asks, although the AI
   dossier does hold company contact pointers (email/phone) for several
   crawled Leads.
5. **Captured social posts on crawled Leads (TC:10).** HIMDENIM, ELV Denim,
   CURVJEANS etc. have Instagram posts stored against them; they are not
   shown on the tab (as the story asks).
6. **Crawled Leads do have contacts.** Several crawler Leads have 1–5
   contacts (e.g. HIMDENIM, KG Fabriks), against the story's "no individual
   was captured by the crawl".
7. **Review row has no author (TC:15).** The row shows the selected Manager,
   department, score and "Saved <time>"; the AC also asks for the author.
   Accepted on 2026-10-23: the selected Manager is the reviewer.
8. **Wording:** score error is now "Score (1–10) required" (was "Score out
   of 10 is required" until 2026-10-21; locator accepts both); the Convert
   tooltip reads "At least one Manager's Review and Score must exist."
9. **No "Generated by AI" tag** on the AI sections any more (was there on
   2026-10-15).
10. **Data:** one crawled Lead's name carries an HTML entity ("Kindred
    Clothing LLC &#8211; Distressed Denims…").
11. **Customer Info can be empty while the detection has a summary**
    (Kings Of Indigo: summary has only fit lines, Customer Info shows the
    no-information message).
