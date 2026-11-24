/**
 * Where a blocked user may land. Being sent off a Planning route is not
 * enough: an expired session lands on the login page, which must not count
 * as "blocked". The app shell's launcher (or "Access restricted" in place)
 * is the real landing.
 */
const LOGIN_PAGE = /\/(realms|login|logout|auth|signin|sign-in)(\/|\?|$)|openid-connect/i;

/** True when `url` is the app (the launcher or a non-Planning page), not a Planning route and not a login page. */
export function isLauncherLanding(url: string, planningPrefix: string): boolean {
  const { pathname, href } = new URL(url);
  if (LOGIN_PAGE.test(href)) return false;
  return !pathname.startsWith(planningPrefix);
}
