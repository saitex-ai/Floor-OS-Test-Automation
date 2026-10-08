import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { loginAsUser, secondUserCredentials } from '../../../src/fixtures/multi-user';
import { BomListPage } from '../../../src/pages/bom/bom-list.page';
import { BomDetailPage } from '../../../src/pages/bom/bom-detail.page';
import { BomItemsPage } from '../../../src/pages/bom/bom-items.page';
import { ShellHeaderPage } from '../../../src/pages/shell/shell-header.page';
import { createDisposableBom, DISPOSABLE_BOM_TIMEOUT } from './support/disposable-bom';

/**
 * BOM — Permissions (a non-admin second user against the same BOM).
 *
 * Source of truth for these cases: test-cases/bom/bom-permissions.md.
 *
 * Alice (the suite's admin login) builds one disposable BOM
 * (support/disposable-bom.ts) and drives its lifecycle; the second user
 * (BOM_SECOND_USER_<ENV>, a Qc-lead such as `bob`, in its own isolated
 * browser context — see loginAsUser()) looks at the very same BOM in
 * each state. Each case checks the second user's control against
 * Alice's own on the same screen, so a difference is a permission gate,
 * not a state the BOM happens to be in. Serial: the cases follow the
 * BOM from Open to Approved. Skips when no second user is configured.
 */

const LINES = ['FAB0000002', 'LBL0000001'];

test.describe.serial('BOM - Permissions (second user)', () => {
  const credentials = secondUserCredentials('BOM');
  let alice: Page;
  let bob: { page: Page; close: () => Promise<void> };
  let aliceDetail: BomDetailPage;
  let bobList: BomListPage;
  let bobDetail: BomDetailPage;
  let code = '';

  test.beforeAll(async ({ browser }) => {
    test.skip(!credentials, 'BOM_SECOND_USER_<ENV> / BOM_SECOND_PASSWORD_<ENV> not set');
    test.setTimeout(DISPOSABLE_BOM_TIMEOUT);
    alice = await browser.newPage({ storageState: authFile('bom') });
    aliceDetail = new BomDetailPage(alice);
    code = await createDisposableBom(alice);
    await new BomItemsPage(alice).addLines(LINES);
    bob = await loginAsUser(browser, credentials!.username, credentials!.password);
    bobList = new BomListPage(bob.page);
    bobDetail = new BomDetailPage(bob.page);
  });

  test.afterAll(async () => {
    await bob?.close();
    await alice?.close();
  });

  test.beforeEach(async () => {
    test.setTimeout(150_000);
    await allure.epic('BOM');
    await allure.feature('BOM Permissions');
    await allure.owner('BOM QA');
  });

  test('TC:1 Verify a non-admin (Qc-lead) user can open the BOM list', async () => {
    await bobList.open();
    await expect(new ShellHeaderPage(bob.page).locators.userMenuButton).toContainText(
      credentials!.username,
      { ignoreCase: true },
    );
    await bobList.searchFor(code);
  });

  test('TC:2 Verify a non-admin user can open a BOM and read its header and items', async () => {
    await bobDetail.open(code, 0);
    expect(await bobDetail.headerField('B.O.M Code')).toBe(code);
    expect(await bobDetail.status()).toBe('Open');
    await bobDetail.expectItemCount(LINES.length);
  });

  test('TC:3 Verify a non-admin user cannot "Costing Approve" a BOM the admin can', async () => {
    await test.step("Alice's Costing Approve is enabled", async () => {
      await aliceDetail.open(code, 0);
      await expect(aliceDetail.locators.costingApproveButton).toBeEnabled();
    });

    await test.step("The second user's is disabled on the same BOM", async () => {
      await bobDetail.open(code, 0);
      await expect(bobDetail.locators.costingApproveButton).toBeDisabled();
    });
  });

  test('TC:4 Verify a non-admin user cannot Reopen, Mark complete or Create Revision on an Approved BOM', async () => {
    await test.step('Alice approves the BOM — her lifecycle actions are enabled', async () => {
      await aliceDetail.open(code, 0);
      await aliceDetail.costingApprove();
      await expect(aliceDetail.locators.reopenButton).toBeEnabled();
      await expect(aliceDetail.locators.markCompleteButton).toBeEnabled();
      await expect(aliceDetail.locators.createRevisionButton).toBeEnabled();
    });

    await test.step("The second user's Reopen, Mark complete and Create Revision are disabled", async () => {
      await bobDetail.open(code, 0);
      expect(await bobDetail.status()).toBe('Approved');
      await expect(bobDetail.locators.reopenButton).toBeDisabled();
      await expect(bobDetail.locators.markCompleteButton).toBeDisabled();
      await expect(bobDetail.locators.createRevisionButton).toBeDisabled();
    });
  });
});
