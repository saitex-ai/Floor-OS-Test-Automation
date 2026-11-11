import * as fs from 'fs';
import * as path from 'path';
import { type Page, test } from '@playwright/test';
import { createApprovedTechpack as createApprovedTechpackViaTechpack } from '../../../../src/fixtures/cross-module.helpers';
import { BomListPage, CreateBomError } from '../../../../src/pages/bom/bom-list.page';
import { BomDetailPage } from '../../../../src/pages/bom/bom-detail.page';

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
 * as setup — through createApprovedTechpack() in
 * src/fixtures/cross-module.helpers.ts, never Techpack's pages directly.
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

/**
 * Skip reason for the "Add line" cases on a BOM that shows the materials
 * redesign (dev 2026-11-05, uat by 2026-11-11): "Add material", product
 * lines, sizes, an "Items Confirmed" status, and Costing Approve blocked
 * until the BOM's issues are resolved.
 */
export const MATERIALS_REDESIGN =
  'This BOM shows the materials redesign ("Add material", product lines, "Items Confirmed"; dev and uat ' +
  'since 2026-11-11). These "Add line" cases wait for new test cases written from its prototype.';

/** Skip reason for the manual Create BOM cases when approving already created the BOM. */
export const AUTO_BOM =
  'Approving this techpack already created its rev-0 BOM ("system:autobom"; uat since 2026-11-05, dev by 2026-11-11), so New BOM ' +
  "doesn't offer it. These manual-create cases wait for test cases for the automatic BOM.";

/** Generous budget for the whole setup chain, for callers' hooks. */
export const DISPOSABLE_BOM_TIMEOUT = 420_000;

/** A fresh Classic techpack, approved on its canvas, tagged as BOM test data. Returns its code. */
export async function createApprovedTechpack(page: Page): Promise<string> {
  return createApprovedTechpackViaTechpack(page, {
    description: TEST_DATA_TAG,
    document: {
      name: 'sample-techpack.pdf',
      mimeType: 'application/pdf',
      buffer: fs.readFileSync(SAMPLE_PDF),
    },
  });
}

/**
 * Builds a disposable BOM: an approved techpack, then "New BOM" for it.
 * Leaves the page on the new BOM's detail page (rev 0, Open, no items)
 * and returns its techpack code. Where approving already created the BOM
 * (uat, 2026-11-05: "system:autobom"), it opens that BOM instead.
 *
 * Create BOM has answered 500 INTERNAL_ERROR now and then on uat under 2
 * workers (2026-10-27, 2026-10-28; the second created nothing), so this
 * setup step tries once more after a server error and records it in the
 * report. 02-create-bom.spec.ts tests Create BOM itself without a retry.
 */
export async function createDisposableBom(page: Page): Promise<string> {
  const code = await createApprovedTechpack(page);
  const list = new BomListPage(page);
  await list.open();
  if (!(await list.isOfferedForNewBom(code))) {
    await new BomDetailPage(page).open(code, 0);
    return code;
  }
  for (let attempt = 1; ; attempt++) {
    await list.open();
    await list.openNewBomDialog();
    await list.openTechpackPicker();
    await list.pickTechpack(code);
    try {
      await list.createBom(code);
      return code;
    } catch (error) {
      if (attempt > 1 || !(error instanceof CreateBomError) || error.status < 500) throw error;
      test.info().annotations.push({
        type: 'setup retry',
        description: `${error.message} (retried once)`,
      });
    }
  }
}
