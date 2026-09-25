import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the BOM test user and caches storage state to
// .auth/bom.json. Runs automatically before the "bom" project
// (see the "bom" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('bom');
