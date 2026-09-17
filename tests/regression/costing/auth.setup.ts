import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Costing test user and caches storage state to
// .auth/costing.json. Runs automatically before the "costing" project
// (see the "costing" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('costing');
