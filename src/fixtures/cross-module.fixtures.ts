import { mergeTests } from '@playwright/test';
import { test as planningTest } from './planning.fixtures';
import { test as masterDataTest } from './master-data.fixtures';
import { test as crmTest } from './crm.fixtures';

/**
 * For flows that genuinely span modules (e.g. Set up my department creating a
 * Master Data department, or a Sales Order converting a CRM Prospect). Each
 * module's own fixtures expose only its pages; a cross-module spec imports
 * `test` / `expect` from here instead. Fixture names don't overlap across the
 * three modules (checked 2026-10-22), so merging all of them is safe.
 */
export const test = mergeTests(planningTest, masterDataTest, crmTest);
export { expect } from '@playwright/test';
