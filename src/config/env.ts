import path from 'path';
import * as dotenv from 'dotenv';
import type { ModuleConfig } from './modules';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type TestEnv = 'local' | 'dev';

export interface ModuleCredentials {
  username: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers — pure functions, nothing here runs on its own until called
// below in "Execution" or "Public exports".
// ─────────────────────────────────────────────────────────────────────

/** Reads an env var; crashes with a clear message if it's missing. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name} (see .env.example, TEST_ENV=${testEnv})`);
  }
  return value;
}

/** Reads an env var; falls back to a default if it's missing. */
function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

/** Reads TEST_ENV, defaulting to "local"; rejects anything else outright. */
function resolveTestEnv(): TestEnv {
  const raw = (process.env.TEST_ENV ?? 'local').toLowerCase();
  if (raw !== 'local' && raw !== 'dev') {
    throw new Error(
      `TEST_ENV must be "local" or "dev" (got "${raw}"). Run e.g. TEST_ENV=dev npm run test:crm`,
    );
  }
  return raw;
}

// ─────────────────────────────────────────────────────────────────────
// Execution — the only part of this file with side effects. Runs once,
// the moment anything imports this module.
//
// Load order matters (later file wins): a shared `.env`, then an
// optional env-specific override (`.env.local` / `.env.dev`,
// gitignored). TEST_ENV itself must come from that first `.env` load,
// since we need to know it before picking which override file to load.
// ─────────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testEnv = resolveTestEnv();

dotenv.config({ path: path.resolve(__dirname, `../../.env.${testEnv}`), override: true });

// ─────────────────────────────────────────────────────────────────────
// Public exports — what the rest of the framework actually imports.
// ─────────────────────────────────────────────────────────────────────

export const env = {
  testEnv,
  /**
   * app-shell is the only app every module test talks to directly — it
   * owns auth and mounts every remote under its own routes. Local defaults
   * to the shell's Vite dev port (see floorOS docs/handbook/14-frontends.md);
   * dev has no safe default and must be set explicitly.
   */
  shellBaseUrl:
    testEnv === 'local'
      ? optional('LOCAL_APP_SHELL_URL', 'http://localhost:3100')
      : required('DEV_APP_SHELL_URL'),
};

/**
 * Reads `<envPrefix>_USER_<LOCAL|DEV>` / `<envPrefix>_PASSWORD_<LOCAL|DEV>`
 * for the active TEST_ENV. Every module has its own seeded Keycloak test
 * user (per-module, not shared) so each QA's login reflects the
 * permissions their module actually needs.
 */
export function moduleCredentials(moduleOrPrefix: ModuleConfig | string): ModuleCredentials {
  const prefix = typeof moduleOrPrefix === 'string' ? moduleOrPrefix : moduleOrPrefix.envPrefix;
  const suffix = testEnv.toUpperCase(); // 'local' -> 'LOCAL', 'dev' -> 'DEV'
  return {
    username: required(`${prefix}_USER_${suffix}`),
    password: required(`${prefix}_PASSWORD_${suffix}`),
  };
}
