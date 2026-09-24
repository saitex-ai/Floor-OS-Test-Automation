/**
 * The first view of the Fabric Mill remote on dev sits on "Loading
 * Fabric Mill…" for well over the 15s default expect timeout (seen
 * 2026-09-24 on the first smoke run) — its federated bundle loads over
 * the VPN. Only the wait for a screen's heading gets this; every other
 * assertion keeps the default.
 */
export const MILL_REMOTE_LOAD_TIMEOUT = 45_000;
