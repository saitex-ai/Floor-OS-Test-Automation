import { type Page, type Request, type Route, expect } from '@playwright/test';
import { WAIT } from './waits';

/** One saved timer as `GET /api/planning/digest-templates` returns it. */
export interface AlertTimerRow {
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  groups: { code: string; label: string }[];
  cadence: 'real_time' | 'daily' | 'weekly';
  sendAt: string | null;
  sendWeekday: number | null;
  timezone: string;
  sections: string[];
  channels: string[];
  isEnabled: boolean;
  warnings: string[];
  lastSavedAt: string;
  lastSavedBy: { userId: string; username: string | null } | null;
  version: number;
}

export type CandidateStatus =
  'ready' | 'already_set' | 'account_disabled' | 'no_planning_access' | 'no_account';

/** One person offered by `GET .../digest-templates/candidates`. */
export interface AlertTimerCandidate {
  employeeId: string;
  employeeCode: string;
  name: string;
  departmentLabel: string | null;
  userId: string | null;
  username: string | null;
  email: string | null;
  linkedBy: string | null;
  status: CandidateStatus;
  alertTimer: { userId?: string } | null;
}

/** The body the form sends on Add (POST) / Save (PUT). */
export interface AlertTimerBody {
  userId?: string;
  cadence: AlertTimerRow['cadence'];
  sendAt: string | null;
  sendWeekday: number | null;
  timezone: string;
  sections: string[];
  channels: string[];
  isEnabled: boolean;
  expectedVersion?: number;
}

export interface RecordedWrite {
  method: string;
  url: string;
  body: AlertTimerBody;
}

/** What the server answered to a write that was let through. */
export interface WriteResponse {
  status: number;
  body: { code?: string; message?: string };
}

const API = '**/api/planning/digest-templates**';
const LIST_URL = /\/api\/planning\/digest-templates(\?|$)/;
const DETAIL_URL = /\/api\/planning\/digest-templates\/([0-9a-f-]{36})(\?|$)/;
const CANDIDATES_URL = /\/api\/planning\/digest-templates\/candidates/;

type SaveHandler = (route: Route, body: AlertTimerBody) => Promise<void>;
type DetailHandler = (route: Route, userId: string) => Promise<void>;

/**
 * Network side of the Alert timers screens. Timers belong to seeded users,
 * carry no free-text field a QA-AUTO marker could go in, and can't be
 * deleted, so this suite never lets a real POST / PUT reach the server
 * with a change: `guardWrites()` (called first in every case) aborts every
 * write unless the case answers it itself — with a simulated response
 * (`answerSave…`), or by sending it on to an id that has no timer
 * (`sendSaveToMissingTimer`, so the real server's 404 runs and nothing
 * changes). Reads stay real; a few cases rewrite one read's response to
 * reach a state the environment can't produce on demand (directory outage,
 * a warning, a slow lookup). The page's own responses are captured here
 * too, so cases can pick records from what the screen really loaded.
 */
export class AlertTimersNetwork {
  readonly writes: RecordedWrite[] = [];
  readonly writeResponses: WriteResponse[] = [];
  /** The row the last simulated successful save produced. */
  lastSaved: AlertTimerRow | undefined;
  private readonly candidateRows = new Map<string, AlertTimerCandidate[]>();
  private readonly candidateRequests: string[] = [];
  private listRows: AlertTimerRow[] | undefined;
  private readonly listResponses: [string, AlertTimerRow[]][] = [];
  private saveHandler: SaveHandler | undefined;
  private detailHandler: DetailHandler | undefined;
  private candidateTransform:
    ((search: string, rows: AlertTimerCandidate[]) => AlertTimerCandidate[] | 'fail') | undefined;
  private listTransform: ((json: Record<string, unknown>) => void) | undefined;
  private lookupsDelayMs = 0;
  private lookupGroups: string[] | undefined;

  constructor(private readonly page: Page) {
    page.on('request', (request) => this.onRequest(request));
    page.on('response', async (response) => {
      const method = response.request().method();
      if (method === 'GET' || !response.url().includes('/api/planning/digest-templates')) return;
      const body = (await response.json().catch(() => ({}))) as WriteResponse['body'];
      this.writeResponses.push({ status: response.status(), body });
    });
  }

  /** Blocks every POST / PUT to the timers API unless a case answers it. Call first in every case. */
  async guardWrites(): Promise<void> {
    await this.page.route(API, async (route) => {
      try {
        await this.handle(route);
      } catch (error) {
        // The page closed or navigated while a rewritten read was in flight
        // ("Test ended" / "Response has been disposed"): nothing left to answer.
        if (!/Test ended|disposed|closed|Target page/i.test(String(error))) throw error;
      }
    });
  }

  /** Group codes in the order the lookups list them (the list's Group sort follows it). */
  async groupOrder(): Promise<string[]> {
    await expect
      .poll(() => this.lookupGroups !== undefined, {
        message: 'the lookups response should arrive',
        timeout: WAIT.PAGE_LOAD,
      })
      .toBe(true);
    return this.lookupGroups!;
  }

  // ── Captured reads ──────────────────────────────────────────────────

  /** The rows of the latest list response the page loaded. */
  async timers(): Promise<AlertTimerRow[]> {
    await expect
      .poll(() => this.listRows !== undefined, {
        message: 'the list response should arrive',
        timeout: WAIT.PAGE_LOAD,
      })
      .toBe(true);
    return this.listRows!;
  }

  /** Waits for the list request carrying `param=value` and returns its rows. */
  async listResponseWith(param: string, value: string): Promise<AlertTimerRow[]> {
    return this.listResponseWithParams({ [param]: value });
  }

  /** Waits for a list response whose request carries every one of `params`; returns its rows. */
  async listResponseWithParams(params: Record<string, string>): Promise<AlertTimerRow[]> {
    let rows: AlertTimerRow[] | undefined;
    await expect
      .poll(
        () => {
          rows = this.lastListFor(params);
          return rows !== undefined;
        },
        { message: `a list response with ${JSON.stringify(params)}`, timeout: WAIT.SERVER },
      )
      .toBe(true);
    return rows!;
  }

  /** The candidates the picker loaded for `search` ('' = the unfiltered opening list). */
  async candidates(search: string): Promise<AlertTimerCandidate[]> {
    await expect
      .poll(() => this.candidateRows.has(search), {
        message: `candidates response for "${search}"`,
        // A search is debounced, then answered through the directory: give it a navigation's headroom.
        timeout: WAIT.NAVIGATION,
      })
      .toBe(true);
    return this.candidateRows.get(search)!;
  }

  /**
   * No candidates request with search=`term` goes out within the picker's
   * debounce plus headroom (it searches only from two characters).
   */
  async expectNoCandidateSearch(term: string): Promise<void> {
    const deadline = Date.now() + WAIT.PERMISSION_SETTLE;
    await expect
      .poll(
        () => {
          if (this.candidateRequests.includes(term)) return 'searched';
          return Date.now() >= deadline ? 'none' : 'waiting';
        },
        { message: `no search for "${term}"`, intervals: [250], timeout: WAIT.SERVER },
      )
      .toBe('none');
  }

  /** The server's answer to the next write let through after `count` earlier answers. */
  async writeResponseAfter(count: number): Promise<WriteResponse> {
    await expect
      .poll(() => this.writeResponses.length > count, {
        message: 'the server should answer the save',
        timeout: WAIT.SERVER,
      })
      .toBe(true);
    return this.writeResponses[count]!;
  }

  /** The next write the page sends after `count` earlier ones. */
  async writeAfter(count: number): Promise<RecordedWrite> {
    await expect
      .poll(() => this.writes.length > count, {
        message: 'the form should send its save request',
        timeout: WAIT.SERVER,
      })
      .toBe(true);
    return this.writes[count]!;
  }

  // ── Answers for writes ──────────────────────────────────────────────

  /** Answers saves with `status` and the flat `{code, message, …}` body the server sends. */
  answerSaveWithError(status: number, body: Record<string, unknown>): void {
    this.saveHandler = (route) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  }

  /**
   * Answers saves as the server would on success (201 create / 200 update)
   * with `base` merged with what was sent and version + 1, and serves that
   * row to the page's later reads of the same timer — so the page goes on
   * as if the save had happened, while the server is never written to.
   */
  answerSaveAsSaved(base: Partial<AlertTimerRow>): void {
    this.saveHandler = async (route, body) => {
      const { expectedVersion, ...values } = body;
      const saved = {
        ...base,
        ...values,
        warnings: base.warnings ?? [],
        lastSavedAt: new Date().toISOString(),
        lastSavedBy: { userId: 'qa-auto', username: 'QA-AUTO' },
        version: (expectedVersion ?? base.version ?? 0) + 1,
      } as AlertTimerRow;
      this.lastSaved = saved;
      this.serveTimer(saved);
      await route.fulfill({
        status: route.request().method() === 'POST' ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify(saved),
      });
    };
  }

  /**
   * Sends saves on to the real server, but for a well-formed id that has no
   * timer, so the server's own 404 runs and no record can change.
   */
  sendSaveToMissingTimer(missingUserId: string): void {
    this.saveHandler = async (route) => {
      const url = route
        .request()
        .url()
        .replace(/digest-templates\/[0-9a-f-]{36}/, `digest-templates/${missingUserId}`);
      await route.continue({ url });
    };
  }

  // ── Rewritten reads ─────────────────────────────────────────────────

  /** Serves `row` for every later read of that timer. */
  serveTimer(row: AlertTimerRow): void {
    this.detailHandler = async (route, userId) => {
      if (userId !== row.userId) return route.fallback();
      await route.fulfill({ status: 200, contentType: 'application/json', json: row });
    };
  }

  /** The real timer, with `warnings` in place of the stored ones. */
  addWarnings(userId: string, warnings: string[]): void {
    this.detailHandler = async (route, id) => {
      if (id !== userId) return route.fallback();
      const response = await route.fetch();
      const json = (await response.json()) as AlertTimerRow;
      await route.fulfill({ response, json: { ...json, warnings } });
    };
  }

  /**
   * The directory (Keycloak admin API) as unavailable: list and details
   * come back with `directoryDegraded: true` and no names, emails, groups or
   * account warnings,
   * the shape the service returns in that case.
   */
  degradeDirectory(): void {
    const strip = (row: Record<string, unknown>) => ({
      ...row,
      username: null,
      displayName: null,
      email: null,
      groups: [],
      // Account state (disabled, no Planning access) comes from the directory too.
      warnings: [],
    });
    this.listTransform = (json) => {
      json['directoryDegraded'] = true;
      json['rows'] = (json['rows'] as Record<string, unknown>[]).map(strip);
    };
    this.detailHandler = async (route) => {
      const response = await route.fetch();
      const json = (await response.json()) as Record<string, unknown>;
      await route.fulfill({ response, json: { ...strip(json), directoryDegraded: true } });
    };
  }

  /** Candidate searches (not the unfiltered opening list) fail with 503 DIRECTORY_UNAVAILABLE. */
  failCandidateSearches(): void {
    this.candidateTransform = (search, rows) => (search === '' ? rows : 'fail');
  }

  /** The candidate `userId` comes back with no email on its account. */
  dropCandidateEmail(userId: string): void {
    this.candidateTransform = (_search, rows) =>
      rows.map((r) => (r.userId === userId ? { ...r, email: null } : r));
  }

  /** Holds the form's lookups response back by `ms`, to see the loading state. */
  delayLookups(ms: number): void {
    this.lookupsDelayMs = ms;
  }

  // ── Internals ───────────────────────────────────────────────────────

  private onRequest(request: Request): void {
    const url = request.url();
    if (request.method() !== 'GET') return;
    if (CANDIDATES_URL.test(url))
      this.candidateRequests.push(new URL(url).searchParams.get('search') ?? '');
  }

  private lastListFor(params: Record<string, string>): AlertTimerRow[] | undefined {
    const hit = [...this.listResponses].reverse().find(([u]) => {
      const query = new URL(u).searchParams;
      return Object.entries(params).every(([k, v]) => query.get(k) === v);
    });
    return hit?.[1];
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = request.url();
    if (request.method() !== 'GET') return this.handleWrite(route);

    if (url.includes('/lookups')) {
      if (this.lookupsDelayMs > 0)
        await new Promise((resolve) => setTimeout(resolve, this.lookupsDelayMs));
      const response = await route.fetch();
      const json = (await response.json()) as { groups?: { code: string }[] };
      this.lookupGroups = (json.groups ?? []).map((g) => g.code);
      return route.fulfill({ response, json });
    }

    if (CANDIDATES_URL.test(url)) {
      const search = new URL(url).searchParams.get('search') ?? '';
      const response = await route.fetch();
      const json = (await response.json()) as { rows: AlertTimerCandidate[] };
      const rows = this.candidateTransform ? this.candidateTransform(search, json.rows) : json.rows;
      if (rows === 'fail') {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'DIRECTORY_UNAVAILABLE',
            message: 'The directory is unavailable.',
          }),
        });
      }
      this.candidateRows.set(search, rows);
      return route.fulfill({ response, json: { ...json, rows } });
    }

    const detail = url.match(DETAIL_URL);
    if (detail && this.detailHandler) return this.detailHandler(route, detail[1]!);

    if (LIST_URL.test(url)) {
      const response = await route.fetch();
      const json = (await response.json()) as Record<string, unknown>;
      this.listTransform?.(json);
      const rows = json['rows'] as AlertTimerRow[];
      this.listRows = rows;
      this.listResponses.push([url, rows]);
      return route.fulfill({ response, json });
    }

    return route.fallback();
  }

  private async handleWrite(route: Route): Promise<void> {
    const request = route.request();
    const body = JSON.parse(request.postData() ?? '{}') as AlertTimerBody;
    this.writes.push({ method: request.method(), url: request.url(), body });
    if (this.saveHandler) return this.saveHandler(route, body);
    // Never let an unanswered write through: timers are seeded users' own.
    return route.abort('blockedbyclient');
  }
}
