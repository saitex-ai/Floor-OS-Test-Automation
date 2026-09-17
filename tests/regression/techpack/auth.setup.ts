import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Techpack test user and caches storage state to
// .auth/techpack.json. Runs automatically before the "techpack" project
// (see the "techpack" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('techpack');
