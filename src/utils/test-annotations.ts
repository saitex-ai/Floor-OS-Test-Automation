import { test } from '@playwright/test';

/**
 * Records the part of a TC that the test can't check (e.g. it needs data
 * or access automation doesn't have), so it shows in the report instead of
 * silently passing.
 */
export function partial(description: string): void {
  test.info().annotations.push({ type: 'partial', description });
}
