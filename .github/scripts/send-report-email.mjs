// Reads Playwright's JSON reporter output, builds a plain-text/HTML
// summary, and sends it via Resend (https://resend.com). Run from CI
// only — see .github/workflows/run-tests-and-notify.yml. Requires:
//   RESEND_API_KEY   - secret, from resend.com's dashboard
//   NOTIFY_EMAILS     - repo variable, comma-separated recipient list
//   NOTIFY_FROM_EMAIL - repo variable, e.g. "floorOS QA <onboarding@resend.dev>"
//                       (Resend's shared onboarding@resend.dev sender works
//                       for a quick start; verify your own domain in Resend
//                       once you're past testing this pipeline)
//   REPORT_URL        - the deployed Allure report's Pages URL
//   RUN_URL           - the GitHub Actions run, for full logs/artifacts

import { readFileSync, existsSync } from 'node:fs';

const RESULTS_PATH = 'test-results/results.json';

function collectFailures(suite, failures) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const outcome = test.status; // "expected" | "unexpected" | "flaky" | "skipped"
      if (outcome === 'unexpected') {
        failures.push(`${suite.title ? `${suite.title} › ` : ''}${spec.title}`);
      }
    }
  }
  for (const child of suite.suites ?? []) {
    collectFailures(child, failures);
  }
}

function buildSummary() {
  if (!existsSync(RESULTS_PATH)) {
    return {
      html: '<p><strong>No results.json found</strong> — the test run may have crashed before producing output.</p>',
      subject: 'floorOS QA run: no results produced',
    };
  }

  const raw = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
  const stats = raw.stats ?? {};
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const flaky = stats.flaky ?? 0;
  const skipped = stats.skipped ?? 0;

  const failures = [];
  for (const suite of raw.suites ?? []) {
    collectFailures(suite, failures);
  }

  const status = failed > 0 ? '❌ FAILED' : '✅ PASSED';
  const subject = `floorOS QA run: ${status} — ${passed} passed, ${failed} failed, ${skipped} skipped`;

  const failureListHtml =
    failures.length > 0
      ? `<ul>${failures.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
      : '<p>None 🎉</p>';

  const reportUrl = process.env.REPORT_URL;
  const runUrl = process.env.RUN_URL;

  const html = `
    <h2>${status}</h2>
    <table cellpadding="4" cellspacing="0">
      <tr><td><strong>Passed</strong></td><td>${passed}</td></tr>
      <tr><td><strong>Failed</strong></td><td>${failed}</td></tr>
      <tr><td><strong>Flaky</strong></td><td>${flaky}</td></tr>
      <tr><td><strong>Skipped</strong></td><td>${skipped}</td></tr>
    </table>
    <h3>Failed tests</h3>
    ${failureListHtml}
    <p>
      ${reportUrl ? `<a href="${reportUrl}">View the full Allure report</a>` : '(Report link unavailable)'}
      &nbsp;|&nbsp;
      ${runUrl ? `<a href="${runUrl}">View the CI run</a>` : ''}
    </p>
  `;

  return { html, subject };
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.NOTIFY_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_FROM_EMAIL || 'floorOS QA Automation <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(
      'RESEND_API_KEY not set — skipping email (add it as a repo secret to enable this step).',
    );
    return;
  }
  if (to.length === 0) {
    console.log(
      'NOTIFY_EMAILS not set — skipping email (add it as a repo variable to enable this step).',
    );
    return;
  }

  const { html, subject } = buildSummary();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API returned ${response.status}: ${body}`);
  }

  console.log(`Email sent to ${to.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
