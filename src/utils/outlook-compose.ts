/**
 * The fields of an Outlook web compose deep link, decoded.
 *
 * The CRM hands emails off to Outlook by opening one of two deep-link
 * shapes in a new tab (both confirmed against dev, 2026-10-15):
 *
 * - `https://outlook.office.com/mail/0/deeplink/compose?to=a,b&cc=c&subject=…&body=…`
 *   (e.g. Alerts' "Email Alert Internally")
 * - `https://outlook.cloud.microsoft/mail/deeplink/compose?mailtouri=<encoded mailto:a,b?cc=c&subject=…&body=…>`
 *   (e.g. Alerts' "Email Alert to Customer") — the mailto URI's own query
 *   values are percent-encoded a second time inside it.
 *
 * Tests assert on this link only — never on Outlook's own UI.
 */
export interface OutlookCompose {
  url: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}

function splitAddresses(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean);
}

export function parseOutlookComposeUrl(url: string): OutlookCompose {
  const parsed = new URL(url);
  const mailtoUri = parsed.searchParams.get('mailtouri');
  if (mailtoUri !== null) {
    const withoutScheme = mailtoUri.replace(/^mailto:/i, '');
    const queryStart = withoutScheme.indexOf('?');
    const addressPart = queryStart === -1 ? withoutScheme : withoutScheme.slice(0, queryStart);
    const query = new URLSearchParams(queryStart === -1 ? '' : withoutScheme.slice(queryStart + 1));
    return {
      url,
      to: splitAddresses(decodeURIComponent(addressPart)),
      cc: splitAddresses(query.get('cc')),
      subject: query.get('subject') ?? '',
      body: query.get('body') ?? '',
    };
  }
  return {
    url,
    to: splitAddresses(parsed.searchParams.get('to')),
    cc: splitAddresses(parsed.searchParams.get('cc')),
    subject: parsed.searchParams.get('subject') ?? '',
    body: parsed.searchParams.get('body') ?? '',
  };
}
