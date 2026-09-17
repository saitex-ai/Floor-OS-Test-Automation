import { registerAuthSetup } from '../../../src/fixtures/auth-setup';

// Logs in once as the CRM test user and caches storage state to
// .auth/crm.json. Runs automatically before the "crm" project
// (see the "crm" project's `dependencies` in playwright.config.ts) —
// you never need to run this file directly.
registerAuthSetup('crm');
