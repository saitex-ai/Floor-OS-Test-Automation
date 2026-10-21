import { chromium } from '@playwright/test';

/**
 * Generates business cards for Scan & Create, one per test, so every scan
 * reads a company name and contact email that don't exist on dev yet.
 *
 * Names are built from real-looking words on purpose: the scan's vision
 * model drops or distrusts gibberish (confirmed 2026-10-05 and
 * 2026-10-21 — a random suffix like "Co. H1L" was read as "Co." and
 * matched an existing Customer). "Playwright" (a real word the model
 * reads reliably) marks every company as test data; two surnames from a
 * 40-word pool plus a trade word give 6,400 company names.
 */
const SURNAMES = [
  'Halvorsen',
  'Okonkwo',
  'Bellweather',
  'Castellanos',
  'Fairbanks',
  'Lindgren',
  'Moreland',
  'Ashcombe',
  'Thornbury',
  'Kingsley',
  'Whitcombe',
  'Radcliffe',
  'Pemberton',
  'Davenport',
  'Holloway',
  'Sinclair',
  'Abernathy',
  'Blackwood',
  'Carrington',
  'Donovan',
  'Ellsworth',
  'Fitzgerald',
  'Greenwood',
  'Hartley',
  'Iverson',
  'Jefferson',
  'Kendrick',
  'Lockhart',
  'Montague',
  'Northcott',
  'Oakley',
  'Prescott',
  'Quinlan',
  'Rutherford',
  'Stanhope',
  'Templeton',
  'Underwood',
  'Vandermeer',
  'Westbrook',
  'Yardley',
];
const TRADES = ['Denim Works', 'Apparel Group', 'Textile Mills', 'Garment Co'];
const CONTACT_NAMES = [
  'Avery Lindqvist',
  'Jordan Ecclestone',
  'Morgan Whitfield',
  'Dakota Marchetti',
  'Reese Kowalski',
  'Emerson Delacroix',
];

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

export interface BusinessCard {
  filePath: string;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  designation: string;
}

export interface BusinessCardOptions {
  /** `null` leaves the company off the card; a string uses that exact name. */
  companyName?: string | null;
  /** `null` leaves the email off the card; a string uses that exact email. */
  contactEmail?: string | null;
}

/** Renders a business-card PDF into `dir` (use `testInfo.outputDir`). */
export async function renderBusinessCard(
  dir: string,
  options: BusinessCardOptions = {},
): Promise<BusinessCard> {
  const id = Math.random().toString(36).slice(2, 10);
  const contactName = pick(CONTACT_NAMES);
  const companyName =
    options.companyName === undefined
      ? `Playwright ${pick(SURNAMES)} ${pick(SURNAMES)} ${pick(TRADES)}`
      : options.companyName;
  const contactEmail =
    options.contactEmail === undefined
      ? `${contactName.split(' ')[0]!.toLowerCase()}.${id}@cardscan.example`
      : options.contactEmail;
  const designation = 'Senior Buyer';
  const filePath = `${dir}/business-card-${id}.pdf`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; width: 500px;">
          <h1 style="margin: 0 0 4px 0; font-size: 24px;">${contactName}</h1>
          <div style="font-size: 16px; color: #333;">${designation}</div>
          ${companyName ? `<div style="font-size: 18px; font-weight: bold; margin: 14px 0;">${companyName}</div>` : ''}
          <div style="font-size: 14px; line-height: 1.8;">
            ${contactEmail ? `<div>Email: ${contactEmail}</div>` : ''}
            <div>Phone: +1 415 555 0148</div>
            <div>San Francisco, United States</div>
          </div>
        </body>
      </html>
    `);
    await page.pdf({ path: filePath, width: '500px', height: '300px' });
  } finally {
    await browser.close();
  }
  return { filePath, companyName, contactName, contactEmail, designation };
}

/** A blank image with no text at all — the "unreadable file" case. */
export async function renderBlankImage(dir: string): Promise<string> {
  const filePath = `${dir}/blank-${Math.random().toString(36).slice(2, 10)}.png`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 300, height: 200 } });
    await page.setContent('<html><body style="background: #fff;"></body></html>');
    await page.screenshot({ path: filePath });
  } finally {
    await browser.close();
  }
  return filePath;
}
