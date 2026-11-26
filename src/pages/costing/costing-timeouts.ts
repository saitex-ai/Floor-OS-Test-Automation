/**
 * The first view of the Costing remote on dev can sit on "Loading
 * Costing…" for over the 15s default expect timeout while the full smoke
 * suite runs every module in parallel (seen 2026-11-25) — its federated
 * bundle loads over the VPN. Only the wait for the landing heading gets
 * this; every other assertion keeps the default.
 */
export const COSTING_REMOTE_LOAD_TIMEOUT = 45_000;
