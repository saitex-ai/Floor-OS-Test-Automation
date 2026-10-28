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
 * Marks the running case as an expected failure for an open ClickUp bug:
 * `test.fail()` keeps the run green while the bug exists, and once it's
 * fixed the case shows up as an unexpected pass — the cue to remove this
 * call. Adds the bug as an "issue" annotation for the report. Call it after
 * any `test.skip()` so a missing login still skips. (Same convention as
 * Planning's own `knownBug()` in tests/regression/planning/support.)
 */
export function knownBug(clickUpId: string): void {
  const url = `https://app.clickup.com/t/${clickUpId}`;
  test.info().annotations.push({ type: 'issue', description: url });
  test.fail(true, `Known bug, ClickUp ${clickUpId} — expected to fail until fixed`);
}

/**
 * Records behaviour that looks wrong but hasn't been confirmed or filed as a
 * bug yet, so it shows in the report without failing the case.
 */
export function openQuestion(description: string): void {
  test.info().annotations.push({ type: 'open question', description });
}
