import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Fabric Mill test user and caches storage state to
// .auth/mill.json. Runs automatically before the "mill" project
// (see the "mill" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('mill');
