import { test as base } from '@playwright/test';
import { CrmPage } from '../pages/crm/crm.page';
import { CreateCustomerPage } from '../pages/crm/create-customer.page';
import { ContactListPage } from '../pages/crm/contact-list.page';
import { CreateContactPage } from '../pages/crm/create-contact.page';
import { CustomerDetailPage } from '../pages/crm/customer-detail.page';

interface CrmFixtures {
  crmPage: CrmPage;
  createCustomerPage: CreateCustomerPage;
  contactListPage: ContactListPage;
  createContactPage: CreateContactPage;
  customerDetailPage: CustomerDetailPage;
}

/**
 * Fixture set scoped to the CRM module only. Each module gets its own
 * file on purpose — the CRM QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<CrmFixtures>({
  crmPage: async ({ page }, use) => {
    await use(new CrmPage(page));
  },

  createCustomerPage: async ({ page }, use) => {
    await use(new CreateCustomerPage(page));
  },

  contactListPage: async ({ page }, use) => {
    await use(new ContactListPage(page));
  },

  createContactPage: async ({ page }, use) => {
    await use(new CreateContactPage(page));
  },

  customerDetailPage: async ({ page }, use) => {
    await use(new CustomerDetailPage(page));
  },
});

export { expect } from '@playwright/test';
