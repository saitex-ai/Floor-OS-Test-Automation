import * as fs from 'fs';
import * as path from 'path';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';
import { loginAsUser, secondUserCredentials } from '../../../src/fixtures/multi-user';
import { CanvasPage } from '../../../src/pages/techpack/canvas.page';

/**
 * Techpack — Canvas Multi-User Presence.
 *
 * Source of truth for these cases: test-cases/techpack/multi-user-presence.md.
 * No ClickUp task exists for this story yet, so these tests don't call allure.tms().
 * TC:2 needs a second, non-admin login from TECHPACK_SECOND_USER_<ENV> /
 * TECHPACK_SECOND_PASSWORD_<ENV> and skips when those are unset.
 * Only presence (avatar badges) is covered here — the live cursor is deliberately out of
 * scope, see that doc's notes.
 *
 * Each test creates its own fresh techpack via the Classic form, same rationale as
 * canvas.spec.ts: legacy seed records have their own known load-reliability issues.
 */
test.describe('Techpack - Canvas Multi-User Presence', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('Canvas Multi-User Presence');
    await allure.owner('Techpack QA');
  });

  test('TC:1 Verify a lone viewer sees their own identity with no phantom "other participant" indicator', async ({
    createTechpackPage,
    canvasPage,
  }) => {
    test.setTimeout(300_000);

    await test.step('Create a fresh techpack, alone', async () => {
      await createTechpackPage.openFromTechpacksList();
      await createTechpackPage.fillAllRequiredWithRandomAvailable();
      await createTechpackPage.uploadTechpackFile({
        name: 'sample-techpack.pdf',
        mimeType: 'application/pdf',
        buffer: fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-techpack.pdf')),
      });
      const outcome = await createTechpackPage.createExpectingResult();
      if (outcome !== 'created') {
        throw new Error(`expected a fresh techpack to be created, got: ${outcome}`);
      }
      await createTechpackPage.expectCreatedSuccessfully();
      await canvasPage.expectLoaded();
    });

    await test.step('Own identity shown; the presence indicator reads zero other participants', async () => {
      await expect(canvasPage.locators.ownIdentityLabel).toBeVisible();
      // The "other participants" container is always in the DOM, even
      // alone — it reads "0 other participants, plus you" in that case,
      // rather than being absent (confirmed live; don't reintroduce a
      // presence/absence check for this).
      await expect.poll(() => canvasPage.otherParticipantsCount()).toBe(0);
    });
  });

  test("TC:2 Verify a second user's presence shows correctly, bidirectionally, then clears when they leave", async ({
    createTechpackPage,
    canvasPage,
    page,
    browser,
  }) => {
    test.setTimeout(420_000);
    const second = secondUserCredentials('TECHPACK');
    test.skip(
      !second,
      'Needs a second, non-admin login: set TECHPACK_SECOND_USER_<ENV> / TECHPACK_SECOND_PASSWORD_<ENV> (e.g. bob, Qc-lead)',
    );
    if (!second) return;

    const canvasUrl =
      await test.step('Alice creates a fresh techpack and opens its canvas', async () => {
        await createTechpackPage.openFromTechpacksList();
        await createTechpackPage.fillAllRequiredWithRandomAvailable();
        await createTechpackPage.uploadTechpackFile({
          name: 'sample-techpack.pdf',
          mimeType: 'application/pdf',
          buffer: fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-techpack.pdf')),
        });
        const outcome = await createTechpackPage.createExpectingResult();
        if (outcome !== 'created') {
          throw new Error(`expected a fresh techpack to be created, got: ${outcome}`);
        }
        await createTechpackPage.expectCreatedSuccessfully();
        await canvasPage.expectLoaded();
        return page.url();
      });

    const { page: bobPage, close: closeBobContext } =
      await test.step('Bob (a genuinely separate login) opens the same canvas', async () => {
        const session = await loginAsUser(browser, second.username, second.password);
        const bobCanvasPage = new CanvasPage(session.page);
        // A raw goto() to a fresh URL always lands back on the login gate
        // first, even with a valid session cookie, and the OIDC-callback
        // redirect back to the real path can take 15-18s — see
        // multi-user-presence.md's notes. gotoAuthenticated() + a generous
        // expectLoaded() timeout handles both.
        await bobCanvasPage.gotoAuthenticated(canvasUrl);
        await bobCanvasPage.expectLoaded(60_000);
        return session;
      });
    const bobCanvasPage = new CanvasPage(bobPage);

    // The presence WebSocket round-trip (join broadcast -> both clients'
    // roster updated) has been observed to take longer than 15s on local
    // at least once in each direction (Alice-sees-Bob and Bob-sees-Alice
    // failed on different runs, never both at once) — a generous 45s poll
    // distinguishes "just slow to propagate" from "genuinely broken" without
    // guessing which side is likely to lag.
    const PRESENCE_SYNC_TIMEOUT = 45_000;

    await test.step("Alice's view shows Bob's presence", async () => {
      await expect
        .poll(() => canvasPage.otherParticipantsCount(), { timeout: PRESENCE_SYNC_TIMEOUT })
        .toBe(1);
      await expect(canvasPage.locators.otherParticipantAvatar('Bob QCLead')).toBeVisible();
    });

    await test.step("Bob's own view symmetrically shows Alice's presence and his own identity", async () => {
      await expect(bobCanvasPage.locators.ownIdentityLabel).toBeVisible();
      await expect
        .poll(() => bobCanvasPage.otherParticipantsCount(), { timeout: PRESENCE_SYNC_TIMEOUT })
        .toBe(1);
      await expect(bobCanvasPage.locators.otherParticipantAvatar('Alice Planner')).toBeVisible();
    });

    await test.step("After Bob leaves, the indicator clears on Alice's side", async () => {
      await bobPage.goto('about:blank');
      await expect
        .poll(() => canvasPage.otherParticipantsCount(), { timeout: PRESENCE_SYNC_TIMEOUT })
        .toBe(0);
      await closeBobContext();
    });
  });
});
