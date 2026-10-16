import { mergeTests } from '@playwright/test';
import { test as planningTest } from './planning.fixtures';
import { test as masterDataTest } from './master-data.fixtures';

/**
 * For flows that genuinely span modules (e.g. Set up my department creating a
 * Master Data department). Each module's own fixtures expose only its pages;
 * a cross-module spec imports `test` / `expect` from here instead.
 */
export const test = mergeTests(planningTest, masterDataTest);
export { expect } from '@playwright/test';
