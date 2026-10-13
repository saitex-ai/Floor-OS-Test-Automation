import { test } from '@playwright/test';

/**
 * Every code `uniqueCode()` hands out, with the spec file that asked for
 * it — so each file's afterAll cleans up only its own records (other files
 * in the same worker may still be using theirs). Module state is per
 * worker, like the codes themselves.
 */
export interface CreatedCode {
  file: string;
  prefix: string;
  code: string;
}

const created: CreatedCode[] = [];

/** The running test's (or hook's) spec file; '' outside a test. */
export function currentSpecFile(): string {
  try {
    return test.info().file;
  } catch {
    return '';
  }
}

export function track(prefix: string, code: string): void {
  created.push({ file: currentSpecFile(), prefix, code });
}

/** Removes and returns this spec file's codes for `prefix`. */
export function takeCodes(file: string, prefix: string): string[] {
  const mine = created.filter((c) => c.file === file && c.prefix === prefix);
  for (const c of mine) created.splice(created.indexOf(c), 1);
  return mine.map((c) => c.code);
}
