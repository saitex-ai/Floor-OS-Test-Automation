/**
 * Single source of truth for every floorOS module this framework drives.
 *
 * floorOS is a shell + remotes micro-frontend (see
 * frontends/*\/README.md and docs/handbook/14-frontends.md in the floorOS
 * repo): app-shell owns auth and routing, and each remote is mounted at
 * `<shellBaseUrl><path>`. There is no separate host/port per module to
 * point Playwright at — everything goes through the shell, same as a real
 * user.
 *
 * One QA owns one module end to end: `tests/<id>/`, `src/pages/<id>/`,
 * `src/fixtures/<id>.fixtures.ts`. Adding a 9th module means adding one
 * entry here plus that module's own files — nothing shared gets touched,
 * so modules never collide with each other in a PR.
 */

export const MODULE_IDS = [
  'crm',
  'mill',
  'costing',
  'planning',
  'techpack',
  'bom',
  'master-data',
  'admin',
  'copilot',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export interface ModuleConfig {
  id: ModuleId;
  /** Human label for reports/logs/PR descriptions. */
  label: string;
  /**
   * Route segment the shell mounts this remote's Root under
   * (`<shellBaseUrl><path>`). Confirm against the live shell nav if a
   * module's route doesn't match its `frontends/app-<id>` folder name.
   */
  path: string;
  /**
   * Prefix for this module's env vars, e.g. envPrefix "CRM" reads
   * CRM_USER_LOCAL / CRM_PASSWORD_LOCAL / CRM_USER_DEV / CRM_PASSWORD_DEV.
   * See moduleCredentials() in env.ts.
   */
  envPrefix: string;
}

export const MODULES: Record<ModuleId, ModuleConfig> = {
  crm: { id: 'crm', label: 'CRM', path: '/crm', envPrefix: 'CRM' },
  mill: { id: 'mill', label: 'Fabric Mill', path: '/mill', envPrefix: 'MILL' },
  costing: { id: 'costing', label: 'Costing', path: '/costing', envPrefix: 'COSTING' },
  planning: { id: 'planning', label: 'Planning', path: '/planning', envPrefix: 'PLANNING' },
  techpack: { id: 'techpack', label: 'Techpack', path: '/techpack', envPrefix: 'TECHPACK' },
  // Served by app-techpack (its `./BomRoot` export), but the shell mounts it
  // at its own /bom route and it's tested/owned as a module of its own.
  bom: { id: 'bom', label: 'BOM', path: '/bom', envPrefix: 'BOM' },
  'master-data': {
    id: 'master-data',
    label: 'Master Data',
    path: '/master-data',
    envPrefix: 'MASTER_DATA',
  },
  admin: { id: 'admin', label: 'Admin', path: '/admin', envPrefix: 'ADMIN' },
  copilot: { id: 'copilot', label: 'Copilot', path: '/copilot', envPrefix: 'COPILOT' },
};
