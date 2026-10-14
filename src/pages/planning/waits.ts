/**
 * Non-default waits for the Planning master-data page objects, each
 * reason documented once here rather than as bare numbers at every call.
 * Observed on dev (2026-10-09 / 10-12) with the Planning remote
 * micro-frontend; tune here if an environment is faster or slower.
 */
export const WAIT = {
  /**
   * A cold list/detail page: the shell redeems the session, the Planning
   * remote loads, then the grid fetches — the skeleton has been seen for
   * 20–40 s on dev, so 60 s (the same headroom PlanningPage.expectLoaded
   * already uses).
   */
  PAGE_LOAD: 60_000,
  /** A route change or an in-place form/detail render after a click. */
  NAVIGATION: 30_000,
  /**
   * One server round trip: a save, a search/filter debounce plus refetch,
   * or the toast that follows. dev's latency varies; a 1.5 s fixed sleep
   * once misread an in-flight save as "blocked".
   */
  SERVER: 15_000,
  /** Client-side validation messages ("Required", …) shown after submit. */
  VALIDATION: 10_000,
  /**
   * How long a permission-gated control is watched before it counts as
   * absent or disabled: write controls render once the user's permissions
   * load, which can be a few seconds after the heading.
   */
  PERMISSION_SETTLE: 5_000,
  /**
   * One attempt inside an `expect(...).toPass()` retry loop, e.g. a picker
   * whose click opened nothing because the form was still loading. Short on
   * purpose: the loop (bounded by its own WAIT) retries the action.
   */
  RETRY_STEP: 2_000,
} as const;
