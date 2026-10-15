import { type Locator, type Page } from '@playwright/test';

/** The four cards on the Customer Detail "Overview" tab, by their h2 heading. */
export type OverviewSection =
  'Customer Profile' | 'Customer Management' | 'System' | 'Departments and Assignees';

/**
 * Raw element locators for section-level editing on the Customer Detail
 * screen's Overview tab (CRM, Sprint 5 — "Customer Overview -> Edit").
 * No actions or assertions here, see
 * src/pages/crm/customer-overview-edit.page.ts for those.
 *
 * Unlike CustomerDetailLocators (which addresses the three identical
 * icon-only "Edit" buttons by DOM index), everything here is scoped to
 * its own `<section>` card — confirmed on dev (2026-10-15) that each card
 * is a `<section>` with an `<h2>` heading. Index-based lookup breaks as
 * soon as one section is in edit mode, because that section's "Edit"
 * button is replaced by "Cancel"/"Save" and every later index shifts.
 *
 * Field rows (confirmed DOM, read and edit mode alike): a label `<div>`
 * ("Customer Name" carries an extra " •" required marker span) followed
 * by a sibling `<div>` holding either the plain value (read mode) or the
 * input/combobox (edit mode). There's no label↔input ARIA association,
 * so a row is located by its label text and the input is found inside
 * that row. Locked fields (Version in Customer Profile, Status in
 * Customer Management, every System field) render their value plus a
 * `<span title="Locked field">` padlock icon and never get an input.
 */
export class CustomerOverviewEditLocators {
  readonly toasts: Locator;

  constructor(private readonly page: Page) {
    this.toasts = page.locator('[data-sonner-toast]');
  }

  section(name: OverviewSection): Locator {
    return this.page
      .locator('section')
      .filter({ has: this.page.getByRole('heading', { level: 2, name, exact: true }) });
  }

  editButton(name: OverviewSection): Locator {
    return this.section(name).getByRole('button', { name: 'Edit', exact: true });
  }

  saveButton(name: OverviewSection): Locator {
    return this.section(name).getByRole('button', { name: 'Save', exact: true });
  }

  cancelButton(name: OverviewSection): Locator {
    return this.section(name).getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Any editable control inside a section — textboxes and comboboxes alike. */
  editableControls(name: OverviewSection): Locator {
    return this.section(name).locator('input, textarea, [role="combobox"]');
  }

  /**
   * One field's row. Anchored regex so "Address" doesn't also match
   * "Address Line 2", "Origin" doesn't match "Origin Type", and the
   * optional " •" required marker on "Customer Name" is tolerated.
   */
  fieldRow(name: OverviewSection, label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.section(name)
      .getByText(new RegExp(`^${escaped}(\\s*•)?$`))
      .first()
      .locator('..');
  }

  fieldTextbox(name: OverviewSection, label: string): Locator {
    return this.fieldRow(name, label).getByRole('textbox');
  }

  fieldCombobox(name: OverviewSection, label: string): Locator {
    return this.fieldRow(name, label).getByRole('combobox');
  }

  fieldLockedIcon(name: OverviewSection, label: string): Locator {
    return this.fieldRow(name, label).locator('[title="Locked field"]');
  }

  /** Phone's row holds a country-code combobox plus this named textbox. */
  get phoneNumberInput(): Locator {
    return this.section('Customer Profile').getByRole('textbox', { name: 'Phone Number' });
  }

  option(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  toast(text: string | RegExp): Locator {
    return this.toasts.filter({ hasText: text });
  }

  /** Overview / Lead Qualification / Biz Docs / Communication / Contacts tabs (plain buttons, not role=tab). */
  detailTab(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name });
  }
}
