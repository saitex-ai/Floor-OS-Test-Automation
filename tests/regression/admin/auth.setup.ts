import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Admin test user and caches storage state to
// .auth/admin.json. Runs automatically before the "admin" project
// (see the "admin" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('admin');
