import { expect } from '@playwright/test';
import { type FacilityFormPage } from './facility-form.page';
import { type MachineFormPage } from './machine-form.page';

/** The one facility the Machine suites put their QA machines in. */
export const QA_FACILITY_NAME = 'QA-AUTO Planning machine test facility';
const QA_FACILITY_PURPOSE =
  'QA-AUTO — Planning machine test data (pw-hybrid-framework). Safe to delete.';

/**
 * A machine can only be saved in a facility. Returns the QA-AUTO one's
 * picker label, creating it on the first run on an environment and reusing
 * it afterwards. Never picks or edits a facility this suite did not make.
 */
export async function ensureQaFacility(
  facilityForm: FacilityFormPage,
  machineForm: MachineFormPage,
): Promise<string> {
  await machineForm.open();
  const existing = await machineForm.findFacility(new RegExp(QA_FACILITY_NAME));
  if (existing) return existing;
  await facilityForm.open();
  await facilityForm.fillRequired({ name: QA_FACILITY_NAME, purpose: QA_FACILITY_PURPOSE });
  expect(await facilityForm.submitCreate(), `create facility ${QA_FACILITY_NAME}`).toBe(
    'submitted',
  );
  await machineForm.open();
  const created = await machineForm.findFacility(new RegExp(QA_FACILITY_NAME));
  expect(created, `${QA_FACILITY_NAME} offered by the Machine form once created`).not.toBeNull();
  return created as string;
}
