import type { Browser, BrowserContext, Page } from '@playwright/test';
import { env } from '../config/env';
import { loginAsUser, userCredentials } from './multi-user';

/**
 * The two extra logins the Planning permission cases need, read from
 * `PLANNING_<PERSONA>_USER_<ENV>` / `PLANNING_<PERSONA>_PASSWORD_<ENV>`:
 * - READONLY: can read the Planning masters but not write them (e.g. a
 *   user holding only job.pln-viewer).
 * - NOACCESS: can't open the Planning masters at all.
 * Cases skip with `personaSkipReason()` when the login isn't set.
 */
export type Persona = 'READONLY' | 'NOACCESS';

export function personaCredentials(persona: Persona) {
  return userCredentials('PLANNING', persona);
}

export function personaSkipReason(persona: Persona): string {
  const suffix = env.testEnv.toUpperCase();
  const who =
    persona === 'READONLY'
      ? 'a read-only Planning user (e.g. only job.pln-viewer)'
      : 'a user without Planning master-data access';
  return `Needs ${who}: set PLANNING_${persona}_USER_${suffix} / PLANNING_${persona}_PASSWORD_${suffix}`;
}

/**
 * One logged-in browser context per persona, per worker — the worker-scoped
 * `personas` fixture (planning.fixtures.ts). A persona logs in the first
 * time a case asks for it; every later case in that worker gets a new page
 * in the same context, so a run does at most one credentialed login per
 * persona per worker instead of one per case.
 */
export class PersonaSessions {
  private readonly contexts = new Map<Persona, Promise<BrowserContext>>();

  constructor(private readonly browser: Browser) {}

  async newPage(persona: Persona): Promise<Page> {
    let context = this.contexts.get(persona);
    if (!context) {
      const creds = personaCredentials(persona);
      if (!creds) throw new Error(personaSkipReason(persona));
      context = loginAsUser(this.browser, creds.username, creds.password).then(
        async ({ page, context: ctx }) => {
          await page.close();
          return ctx;
        },
      );
      this.contexts.set(persona, context);
    }
    return (await context).newPage();
  }

  async close(): Promise<void> {
    for (const context of this.contexts.values()) await (await context).close();
  }
}
