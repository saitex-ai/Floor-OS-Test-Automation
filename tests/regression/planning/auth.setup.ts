import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Planning test user and caches storage state to
// .auth/planning.json. Runs automatically before the "planning" project
// (see the "planning" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('planning');
