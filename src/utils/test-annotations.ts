import { test } from '@playwright/test';

/**
 * Records the part of a TC that the test can't check (e.g. it needs data
 * or access automation doesn't have), so it shows in the report instead of
 * silently passing.
 */
export function partial(description: string): void {
  test.info().annotations.push({ type: 'partial', description });
}

/**
 * Records a story requirement the environment doesn't meet yet, where the
 * test asserts the environment's current behaviour instead (so the run
 * stays green and the step fails once the requirement is delivered). The
 * gap shows in the report next to the TC.
 */
export function devGap(description: string): void {
  test.info().annotations.push({ type: 'dev-gap', description });
}
