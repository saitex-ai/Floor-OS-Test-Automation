import * as fs from 'fs';
import * as path from 'path';
import { type Page, expect } from '@playwright/test';
import { CreateTechpackPage } from '../../../../src/pages/techpack/create-techpack.page';
import { CanvasPage } from '../../../../src/pages/techpack/canvas.page';
import { BomListPage } from '../../../../src/pages/bom/bom-list.page';

/**
 * Test data for the BOM suite. A BOM can only be created for an Approved
 * techpack that has no BOM yet, and UAT's existing BOMs belong to other
 * people's testing (Costing's QA-AUTO records among them) — so every
 * file that changes a BOM builds its own, end to end, through the real
 * UI: a fresh Classic-form techpack, approved on its canvas, then "New
 * BOM" for it. A Classic techpack has no AI-extracted BOM lines, so
 * approving it doesn't kick off an auto-BOM (the auto-BOM worker skips a
 * techpack with no extracted lines) — it lands in the New BOM picker
 * instead. Confirmed live on uat 2026-10-08: the whole chain takes ~45s.
 *
 * This is the one place the BOM suite drives Techpack screens, and only
 * as setup — through Techpack's own page objects, never its locators.
 */

/**
 * Every techpack (and so every BOM) this suite creates carries this in
 * its Description, which the techpack and BOM lists show as "Remark" — so
 * anyone looking at UAT/dev data can tell it's automated test data, safe
 * to delete from the backend. Same "QA-AUTO" prefix the Costing suite's
 * own test records use.
 */
export const TEST_DATA_TAG =
  'QA-AUTO — BOM regression test data (pw-hybrid-framework). Safe to delete.';

const SAMPLE_PDF = path.join(__dirname, '..', '..', 'techpack', 'fixtures', 'sample-techpack.pdf');

/** Generous budget for the whole setup chain, for callers' hooks. */
export const DISPOSABLE_BOM_TIMEOUT = 420_000;

/**
 * Creates a fresh Classic techpack and approves it. A fresh record's
 * Functions menu doesn't always offer Approve straight away (see
 * CanvasPage.approveTechpack()), so this tries up to 3 fresh techpacks.
 */
export async function createApprovedTechpack(page: Page): Promise<string> {
  const create = new CreateTechpackPage(page);
  const canvas = new CanvasPage(page);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await create.openFromTechpacksList();
    await create.fillAllRequiredWithRandomAvailable();
    await create.fillDetails({ description: TEST_DATA_TAG });
    await create.uploadTechpackFile({
      name: 'sample-techpack.pdf',
      mimeType: 'application/pdf',
      buffer: fs.readFileSync(SAMPLE_PDF),
    });
    expect(await create.createExpectingResult()).toBe('created');
    await create.expectCreatedSuccessfully();
    const code = await create.currentTechpackCode();
    if ((await canvas.approveTechpack()) === 'approved') {
      await expect
        .poll(async () => (await canvas.fieldRowText('Status')).split('\n').pop()!.trim(), {
          timeout: 30_000,
        })
        .toBe('Approved');
      return code;
    }
  }
  throw new Error('Could not approve a fresh techpack in 3 attempts');
}

/**
 * Builds a disposable BOM: an approved techpack, then "New BOM" for it.
 * Leaves the page on the new BOM's detail page (rev 0, Open, no items)
 * and returns its techpack code.
 */
export async function createDisposableBom(page: Page): Promise<string> {
  const code = await createApprovedTechpack(page);
  const list = new BomListPage(page);
  await list.open();
  await list.openNewBomDialog();
  await list.openTechpackPicker();
  await list.pickTechpack(code);
  await list.createBom(code);
  return code;
}
