# CRM — [Origin Type = Social Media Post] Lead Qualification (Sprint 5)

- **User Story:** [[Origin Type = Social Media Post] Lead Qualification](https://app.clickup.com/t/86eye4dtz) (old version), subtask [Notification to the CRM users that a customer and contact was created as lead based on social media post](https://app.clickup.com/t/86eypejnd)
- **Test-case set:** [CRM -Sprint -5 - [Origin Type = Social Media Post] Lead Qualification](https://app.clickup.com/t/z941abzjg7) (22 TCs; statuses set from the 2026-10-23 run)
- **Sources (newest wins):** the ClickUp story; the Floor OS CRM prototype (`crm-leadqual.jsx`, `crm-leadgen.jsx`, `CRM Screen User Stories.html`, 2026-10-14), which is the current version of the story; dev (`https://dev.flooros.app`), explored read-only on 2026-10-23. Expected wording follows dev's current text. Functional points that dev can't show yet are written from the prototype.
- **Automated in:** [`tests/regression/crm/39-social-media-lead-qualification.spec.ts`](../../tests/regression/crm/39-social-media-lead-qualification.spec.ts) — run on dev 2026-10-23: 19 pass, 3 `test.fixme` (TC:12, TC:15, TC:22). TC:3, TC:7 and TC:10 were changed to dev's behaviour on 2026-10-23; see "Expected behaviour changed to dev's". See "Run results" below.

## User story (summary, current version)

A Lead raised from a post that Social Media Listening found opens on its
Lead Qualification tab. The captured **Posts** card is its origin card and
comes first, above the AI sections. Each post shows the author, handle,
channel and date, the complete post text and, separately, the relevancy
reasoning. All of it is read-only. The post's only action is to view it on
the social channel, which opens in a new tab and leaves CRM intact.

The prototype and the current story have **removed** the comment and
message-the-author composers that the old ClickUp version had. There is no
Contact Info section, because no individual contacted SAITEX. The AI
sections open at Customer Info and draw on the captured post. They can be
refined with the AI Chatbot markup tool, and so can the relevancy
reasoning. No web form or crawl detection sections appear. With no post,
the card reads "No posts captured yet."

Managers record reviews and scores. Convert to Qualified Lead is blocked
until at least one review exists, and past the Lead stage the screen is
read-only.

## Test data on dev (2026-10-23, read-only)

| Record                           | Origin Type / Origin              | Stage          | Why                                                                                                                             |
| -------------------------------- | --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Nudie Jeans (CTC0002294)         | Social Media Post / _(blank)_     | Qualified Lead | The only Social Media Post record with a captured post (Instagram, @nudiejeans); 2 reviews                                      |
| Testing Two                      | Social Media Post / Facebook Post | Qualified Lead | No captured post → "No posts captured yet."; 2 reviews                                                                          |
| Vino miruvers, Sathish Nagarajan | Social Media / Facebook, LinkedIn | Lead           | Legacy "Social Media" type (Messages + Comments cards, Contact Info shown). Used only to see the Lead-stage chatbot / review UI |

Dev has **no Social Media Post Lead at the Lead stage with a captured
post**. TC:12, TC:13 and TC:15–19 need one. The review and convert cases
can use a Social Media Post Lead created through Create Customer (Origin
Type "Social Media Post", Origin "LinkedIn / Facebook / Instagram Post").
Such a Lead has no captured post, though.

## Test cases

| #     | Test case                                                                | Type     | ClickUp                                      | Dev check (2026-10-23)                                                                                                                      |
| ----- | ------------------------------------------------------------------------ | -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Posts Card Is the First Card                                             | Positive | [link](https://app.clickup.com/t/z941abzjg8) | ✅ seen on Nudie Jeans (Qualified Lead)                                                                                                     |
| TC:2  | Posts Card Is Marked as the Origin                                       | Positive | [link](https://app.clickup.com/t/z941abzjg9) | ✅ "Posts" + "Origin" badge                                                                                                                 |
| TC:3  | Each Post Shows Author, Handle, Channel and Posted Date                  | Positive | [link](https://app.clickup.com/t/z941abzjga) | ✅ "@nudiejeans · Instagram · 10/21/2026, 12:36:46 PM" (posted date; accepted 2026-10-23)                                                   |
| TC:4  | Complete Post Text Without Truncation                                    | Positive | [link](https://app.clickup.com/t/z941abzjgc) | ⚠️ only a short post available; long-text truncation not checked                                                                            |
| TC:5  | Relevancy Reasoning Shown Separately from the Post Text                  | Positive | [link](https://app.clickup.com/t/z941abzjgd) | ✅ separate "Relevancy" block                                                                                                               |
| TC:6  | Captured Post and Metadata Cannot Be Edited                              | Negative | [link](https://app.clickup.com/t/z941abzjgg) | ✅ no inputs/edit icons on the card (checked on a read-only Qualified Lead only)                                                            |
| TC:7  | View on the Platform Opens a New Tab; Not Clickable Past the Lead Stage  | Positive | [link](https://app.clickup.com/t/z941abzjgh) | ✅ opened https://www.instagram.com/p/DdoS-7nCn1R/ in a new tab; CRM URL unchanged; not clickable on a Qualified Lead (accepted 2026-10-23) |
| TC:8  | No Comment or Message Action on the Post                                 | Negative | [link](https://app.clickup.com/t/z941abzjgj) | ✅ only "View on the platform"                                                                                                              |
| TC:9  | No Contact Info; AI Sections Start at Customer Info                      | Negative | [link](https://app.clickup.com/t/z941abzjgk) | ✅ (the dossier does hold contact info; the UI hides it)                                                                                    |
| TC:10 | AI Sections in Order, Describing the Brand from Its Crawl Detection      | Positive | [link](https://app.clickup.com/t/z941abzjgm) | ✅ order; Customer Info is the crawl detection's description of the brand (accepted 2026-10-23)                                             |
| TC:11 | No Web Form or Crawl Detection Section                                   | Negative | [link](https://app.clickup.com/t/z941abzjgn) | ✅ (Nudie Jeans has a stored crawl detection, not rendered)                                                                                 |
| TC:12 | Relevancy Reasoning Refined with the AI Chatbot Markup Tool              | Positive | [link](https://app.clickup.com/t/z941abzjgp) | ❓ not verified: no Lead-stage Social Media Post Lead with a post; the Relevancy block does carry a markup hook                             |
| TC:13 | AI Section Pointer Refined and Marked Enhanced                           | Positive | [link](https://app.clickup.com/t/z941abzjgq) | ❓ chatbot + Markup tool open on a Lead-stage record; enhancement not sent (read-only)                                                      |
| TC:14 | Posts Card States No Posts Captured                                      | Edge     | [link](https://app.clickup.com/t/z941abzjgr) | ✅ "No posts captured yet." (Testing Two)                                                                                                   |
| TC:15 | Every Captured Post Listed When There Are Several                        | Edge     | [link](https://app.clickup.com/t/z941abzjgt) | ❓ no record with 2+ posts (prototype: GANNI)                                                                                               |
| TC:16 | Manager's Review and Score Mandatory Field Validation                    | Negative | [link](https://app.clickup.com/t/z941abzjgu) | ❓ not run (no Lead-stage SMP Lead; wording from the Web Crawled set, 2026-10-22)                                                           |
| TC:17 | Saved Review Listed with Department, Manager, Score, Timestamp           | Positive | [link](https://app.clickup.com/t/z941abzjgv) | ✅ existing rows read on Nudie Jeans; saving not done (read-only)                                                                           |
| TC:18 | Conversion Blocked Until a Review Exists                                 | Negative | [link](https://app.clickup.com/t/z941abzjgw) | ✅ Convert disabled with no reviews (seen on a Lead-stage "Social Media" Lead)                                                              |
| TC:19 | Converts to Qualified Lead After a Review                                | Positive | [link](https://app.clickup.com/t/z941abzjgx) | ❓ not run (convert is a write)                                                                                                             |
| TC:20 | Read-Only After the Lead Leaves the Lead Stage                           | Edge     | [link](https://app.clickup.com/t/z941abzjgy) | ✅ Nudie Jeans: no form/Save/Convert, no Assistant button, tab dimmed                                                                       |
| TC:21 | Lead Opens on Lead Qualification from Its Post on Social Media Listening | Positive | [link](https://app.clickup.com/t/z941abzjgz) | ⚠️ post details show the Lead card; the click-through to the Lead was not run                                                               |
| TC:22 | CRM Users Notified When a Lead Is Created from a Social Media Post       | Positive | [link](https://app.clickup.com/t/z941abzjh0) | ❓ not verifiable: needs a new capture (from subtask 86eypejnd, written from the prototype)                                                 |

Legend: ✅ dev matches the expected result; ⚠️ partly checked; ❓ not
checked on dev, for the reason given. This column is the manual
exploration; the automated results are under "Run results".

## Run results (dev, 2026-10-23)

`TEST_ENV=dev npx playwright test tests/regression/crm/39-social-media-lead-qualification.spec.ts --project=crm --workers=2`
→ after the expected behaviour of TC:3, TC:7 and TC:10 was changed to dev's (22 tests):
**19 passed, 3 skipped (fixme: TC:12, TC:15, TC:22), 0 failed**, about 1.1 min. ClickUp:
19 `pass` (TC:3, 7 and 10 set to `pass` on 2026-10-23), 3 `skip`; Test Run Date 2026-10-23.

- **Display TCs (1–7, 9–11, 20, 21)** run read-only on Nudie Jeans and Testing
  Two (`src/data/crm/social-media-leads.data.json`). Both are Qualified Leads,
  so TC:1–11 carry a `partial` note: dev has no Lead-stage Social Media Post
  Lead with a captured post. TC:4 checks a 132-character post only (no long post).
- **TC:3, TC:7, TC:10** test dev's accepted behaviour (see below): TC:3 checks
  the posted date on the post; TC:7 checks that View on the platform gets no
  pointer events on a Qualified Lead, then opens the post from code to check
  the new tab and the CRM tab; TC:10 checks that Customer Info shows the
  crawl detection's description of the brand.
- **Write TCs (8, 13, 16–19)** each create their own Lead through Create
  Customer: "Playwright Regression SocialMedia LQ <timestamp>", Origin Type
  Social Media Post, Origin Instagram Post, CRM Stage Lead. TC:17 and TC:19
  save reviews on it, and TC:19 converts it to Qualified Lead. Such a Lead
  has no post and no AI sections ("No dossier for this account yet"), so
  TC:13 only opens the AI Chatbot (greeting) and switches on the Markup
  tool. No enhancement is sent (`partial`).
- **fixme:** TC:12 (no Lead-stage Social Media Post Lead with a post to refine
  the Relevancy on), TC:15 (no record with 2+ posts), TC:22 (needs a new
  capture by Social Media Listening; none on dev during the run).
- Nothing was sent to a social channel. "View on the platform" opened the
  Instagram post in a new tab, which was closed untouched.

## Expected behaviour changed to dev's

**Expected behaviour changed to dev's.** The test titles, the ClickUp test cases and the tests describe dev's behaviour. Each decision (2026-10-23, Banupriya Palanivel, CRM QA) is a comment on the ClickUp test case, linked from the code:

| Test case | Now expected                                                                                                                                          | Decision                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| TC:3      | The post shows the date/time it was posted on the channel (`postedAt`); no capture date is shown.                                                     | [comment](https://app.clickup.com/t/z941abzjga?comment=1100750000204245) |
| TC:7      | View on the platform opens the post in a new tab and leaves CRM intact; past the Lead stage the tab is read-only and the button can't be clicked.     | [comment](https://app.clickup.com/t/z941abzjgh?comment=1100750000204246) |
| TC:10     | The AI sections describe the brand from its crawl detection (Customer Info is the detection's description); the post's topic is not expected in them. | [comment](https://app.clickup.com/t/z941abzjgm?comment=1100750000204248) |

## Where dev differs from the prototype / story

Functional gaps and open questions:

1. **Comment / message composers: dropped on purpose.** The old ClickUp
   story has a comment composer, a message-the-author composer and a list
   of sent items. The current story ("The post must offer one action: view
   the post on the social media channel") and the prototype have removed
   them, and dev has none either. TC:8 checks that they are **absent**. The
   ClickUp story text needs updating to the new version.
2. **Captured date vs posted date (TC:3).** The story asks for the date the
   post was _captured_. Dev shows the post's own `postedAt`
   (10/21/2026, 12:36:46 PM, local time) and stores no separate capture
   date. The prototype shows a single date as well. Accepted on 2026-10-23.
3. **No auto-raised Social Media Post Leads on dev.** Social Media Listening
   lists 13 posts, all Instagram. Apart from Nudie Jeans, the ones checked
   are attached to **Web Crawled** Leads (KG Fabriks, HIMDENIM, CURVJEANS
   LLC), not to Social Media Post Leads.
   The only Social Media Post record with a post (Nudie Jeans) has a blank
   Origin and also a crawl detection ("Sample: social leads"). The story
   expects a relevant post to raise a Social Media Post Lead whose Origin
   follows the channel (e.g. Instagram Post).
4. **AI sections drawing on the post (TC:10).** Nudie Jeans' Customer Info
   is the crawl detection summary, word for word, and nothing in the AI
   sections clearly comes from the post. The story says the sections must
   draw on the captured post. Accepted on 2026-10-23: they describe the
   brand from its crawl detection.
5. **Relevancy markup (TC:12).** Dev renders the Relevancy block with a
   markup hook (`data-line-locator="social_interaction/<id>/relevancy"`).
   Whether it can actually be targeted and refined could not be tried,
   because there is no Lead-stage Social Media Post Lead with a post.
6. **View on the platform past the Lead stage.** On a Qualified Lead the
   whole tab is non-interactive (`pointer-events: none`), so the user
   can't click View on the platform. The prototype does the same. The story
   only says the screen "must not accept any changes", and viewing the
   post isn't a change. Accepted on 2026-10-23.
7. **Two social origin types on dev.** Create Customer offers both
   **Social Media** (legacy: Facebook / Instagram / LinkedIn, rendered with
   Messages + Comments cards and with Contact Info) and **Social Media Post**
   (LinkedIn / Facebook / Instagram Post). The prototype has removed the
   legacy "Social Media" type.
8. **Notification on Lead creation (TC:22, subtask 86eypejnd).** Not
   observable on dev without a new capture. The prototype sends "New lead
   captured — <name>" as a CRM notification plus an email to all Managers.

Wording / UI-only (not bugs, dev's text used in the TCs):

9. "Relevancy" (dev) vs "Relevancy reasoning" (prototype); "View on the
   platform" (dev Lead Qualification) vs "View Post on Social Media"
   (prototype, and dev's Social Media Listening post details).
10. Date format differs between screens: "10/21/2026, 12:36:46 PM" on the
    Posts card vs "2026-10-21 07:06" on Social Media Listening.
11. The **"Generated by AI"** tag is back on the AI sections. The Web
    Crawled run of 2026-10-22 found it gone.
12. Past the Lead stage the **Assistant** button is not shown at all. The
    Web Crawled set saw a read-only notice inside the chatbot instead.

## Notes

- Dev was explored with a throwaway read-only Playwright probe, since
  deleted. It only opened pages, read the tab's own
  `GET /api/crm/customers/:id/lead-qualification`, opened dropdowns on
  Create Customer without saving, and opened the Instagram post via View
  on the platform. No comment, message, review, enhancement or conversion
  was sent or saved.
- The review/validation wording in TC:16–18 ("Select a department",
  "Score (1–10) required", "At least one Manager's Review and Score must
  exist.") is the wording the Web Crawled set confirmed on dev on
  2026-10-21/22. The tab's review form is shared across Origin Types.
