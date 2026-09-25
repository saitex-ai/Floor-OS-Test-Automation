import { test as base } from '@playwright/test';
import { CrmPage } from '../pages/crm/crm.page';
import { CreateCustomerPage } from '../pages/crm/create-customer.page';
import { ContactListPage } from '../pages/crm/contact-list.page';
import { CreateContactPage } from '../pages/crm/create-contact.page';
import { CustomerDetailPage } from '../pages/crm/customer-detail.page';
import { ContactDetailPage } from '../pages/crm/contact-detail.page';
import { LogCommunicationPage } from '../pages/crm/log-communication.page';
import { ContactsTabPage } from '../pages/crm/contacts-tab.page';
import { CommunicationsEmailPage } from '../pages/crm/communications-email.page';
import { QualifiedLeadToProspectPage } from '../pages/crm/qualified-lead-to-prospect.page';
import { KeyMeetingNotesPage } from '../pages/crm/key-meeting-notes.page';
import { BizDocPage } from '../pages/crm/biz-doc.page';
import { ScanCreatePage } from '../pages/crm/scan-create.page';
import { LeadQualificationPage } from '../pages/crm/lead-qualification.page';
import { ExternalEventsPage } from '../pages/crm/external-events.page';
import { AlertsPage } from '../pages/crm/alerts.page';

interface CrmFixtures {
  crmPage: CrmPage;
  createCustomerPage: CreateCustomerPage;
  contactListPage: ContactListPage;
  createContactPage: CreateContactPage;
  customerDetailPage: CustomerDetailPage;
  contactDetailPage: ContactDetailPage;
  logCommunicationPage: LogCommunicationPage;
  contactsTabPage: ContactsTabPage;
  communicationsEmailPage: CommunicationsEmailPage;
  qualifiedLeadToProspectPage: QualifiedLeadToProspectPage;
  keyMeetingNotesPage: KeyMeetingNotesPage;
  bizDocPage: BizDocPage;
  scanCreatePage: ScanCreatePage;
  leadQualificationPage: LeadQualificationPage;
  externalEventsPage: ExternalEventsPage;
  alertsPage: AlertsPage;
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

  contactDetailPage: async ({ page }, use) => {
    await use(new ContactDetailPage(page));
  },

  logCommunicationPage: async ({ page }, use) => {
    await use(new LogCommunicationPage(page));
  },

  contactsTabPage: async ({ page }, use) => {
    await use(new ContactsTabPage(page));
  },

  communicationsEmailPage: async ({ page }, use) => {
    await use(new CommunicationsEmailPage(page));
  },

  qualifiedLeadToProspectPage: async ({ page }, use) => {
    await use(new QualifiedLeadToProspectPage(page));
  },

  keyMeetingNotesPage: async ({ page }, use) => {
    await use(new KeyMeetingNotesPage(page));
  },

  bizDocPage: async ({ page }, use) => {
    await use(new BizDocPage(page));
  },

  scanCreatePage: async ({ page }, use) => {
    await use(new ScanCreatePage(page));
  },

  leadQualificationPage: async ({ page }, use) => {
    await use(new LeadQualificationPage(page));
  },

  externalEventsPage: async ({ page }, use) => {
    await use(new ExternalEventsPage(page));
  },

  alertsPage: async ({ page }, use) => {
    await use(new AlertsPage(page));
  },
});

export { expect } from '@playwright/test';
