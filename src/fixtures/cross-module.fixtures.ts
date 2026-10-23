import { mergeTests } from '@playwright/test';
import { test as planningTest } from './planning.fixtures';
import { test as masterDataTest } from './master-data.fixtures';
import { test as crmTest } from './crm.fixtures';
import { test as techpackTest } from './techpack.fixtures';

/**
 * For flows that genuinely span modules (e.g. Set up my department creating a
 * Master Data department, a Sales Order converting a CRM Prospect, or a CRM
 * Customer's status reaching Master Data and Techpack). Each module's own
 * fixtures expose only its pages; a cross-module spec imports `test` /
 * `expect` from here instead. Fixture names don't overlap across the four
 * modules (checked 2026-10-23), so merging all of them is safe.
 */
export const test = mergeTests(planningTest, masterDataTest, crmTest, techpackTest);
export { expect } from '@playwright/test';
