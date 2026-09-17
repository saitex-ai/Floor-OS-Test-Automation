import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the Copilot test user and caches storage state to
// .auth/copilot.json. Runs automatically before the "copilot" project
// (see the "copilot" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('copilot');
