import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Sample Development test user and caches storage
// state to .auth/sample-development.json. Runs automatically before the
// "sample-development" project (see its `dependencies` in
// playwright.config.ts) — you never need to run this file directly.
registerAuthSetup('sample-development');
