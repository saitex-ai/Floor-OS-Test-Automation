/**
 * The first view of the Fabric Mill remote on dev sits on "Loading
 * Fabric Mill…" for well over the 15s default expect timeout (seen
 * 2026-09-24 on the first smoke run) — its federated bundle loads over
 * the VPN. Only the wait for a screen's heading gets this; every other
 * assertion keeps the default.
 */
export const MILL_REMOTE_LOAD_TIMEOUT = 45_000;

/**
 * The New request popup's "From {source}" list (GET
 * /api/inventory-mill/requests/sources) took ~25s to render on
 * devmill.flooros.app on 2026-10-22 — past the 15s default, though the
 * API answered 200. Used only for that wait.
 */
export const MILL_REQUEST_SOURCES_TIMEOUT = 45_000;
