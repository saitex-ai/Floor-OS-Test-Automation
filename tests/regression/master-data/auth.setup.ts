import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Master Data test user and caches storage state to
// .auth/master-data.json. Runs automatically before the "master-data" project
// (see the "master-data" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('master-data');
