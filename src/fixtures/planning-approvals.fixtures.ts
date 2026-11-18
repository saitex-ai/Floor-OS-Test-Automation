import { test as planningTest } from './planning.fixtures';
import { ApprovalPoliciesPage } from '../pages/planning/approval-policies.page';
import { ApprovalPolicyFormPage } from '../pages/planning/approval-policy-form.page';
import { ApprovalsInboxPage } from '../pages/planning/approvals-inbox.page';
import { ApprovalRequestPage } from '../pages/planning/approval-request.page';
import { ApprovalPanelPage } from '../pages/planning/approval-panel.page';

interface PlanningApprovalFixtures {
  approvalPoliciesPage: ApprovalPoliciesPage;
  approvalPolicyFormPage: ApprovalPolicyFormPage;
  approvalsInboxPage: ApprovalsInboxPage;
  approvalRequestPage: ApprovalRequestPage;
  approvalPanelPage: ApprovalPanelPage;
}

/**
 * The Planning fixtures plus the Approvals screens Planning's records go
 * through (Setup Generic Approval workflow, Sprint 4): Policies, the Inbox,
 * a request's page and the approval panel on a record. Kept apart from
 * planning.fixtures.ts so that file stays the same for every other suite.
 */
export const test = planningTest.extend<PlanningApprovalFixtures>({
  approvalPoliciesPage: async ({ page }, use) => {
    await use(new ApprovalPoliciesPage(page));
  },

  approvalPolicyFormPage: async ({ page }, use) => {
    await use(new ApprovalPolicyFormPage(page));
  },

  approvalsInboxPage: async ({ page }, use) => {
    await use(new ApprovalsInboxPage(page));
  },

  approvalRequestPage: async ({ page }, use) => {
    await use(new ApprovalRequestPage(page));
  },

  approvalPanelPage: async ({ page }, use) => {
    await use(new ApprovalPanelPage(page));
  },
});

export { expect } from '@playwright/test';
