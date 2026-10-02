import { test as base } from '@playwright/test';
import { TechpackPage } from '../pages/techpack/techpack.page';
import { CreateTechpackPage } from '../pages/techpack/create-techpack.page';
import { AiModeCopilotPage } from '../pages/techpack/ai-mode-copilot.page';
import { CanvasPage } from '../pages/techpack/canvas.page';
import { ValidationRulesPage } from '../pages/techpack/validation-rules.page';

interface TechpackFixtures {
  techpackPage: TechpackPage;
  createTechpackPage: CreateTechpackPage;
  aiModeCopilotPage: AiModeCopilotPage;
  canvasPage: CanvasPage;
  validationRulesPage: ValidationRulesPage;
}

/**
 * Fixture set scoped to the Techpack module only. Each module gets its own
 * file on purpose — the Techpack QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<TechpackFixtures>({
  techpackPage: async ({ page }, use) => {
    await use(new TechpackPage(page));
  },

  createTechpackPage: async ({ page }, use) => {
    await use(new CreateTechpackPage(page));
  },

  aiModeCopilotPage: async ({ page }, use) => {
    await use(new AiModeCopilotPage(page));
  },

  canvasPage: async ({ page }, use) => {
    await use(new CanvasPage(page));
  },

  validationRulesPage: async ({ page }, use) => {
    await use(new ValidationRulesPage(page));
  },
});

export { expect } from '@playwright/test';
