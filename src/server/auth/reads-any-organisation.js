import { config } from '#config/config.js'
import { hasOrganisationReadScope } from '#server/auth/scopes.js'

/**
 * @import { ScopeBearingCredentials } from '#server/auth/scopes.js'
 */

/**
 * The gate on a page that shows one organisation's records to somebody outside
 * it. What the backend granted this session is the question, rather than the
 * role that usually carries the grant.
 *
 * The scope is a session scope, which is narrower than the same scope on a
 * backend route: the backend also grants it to an operator per request, for
 * their own active organisation, and that grant is decided from the request's
 * organisation rather than the identity, so it never reaches a session. These
 * pages are the regulator's, so being narrower than the route is the point.
 *
 * The flag is read alongside it because the surface these pages belong to is
 * shut in production until the whole of it ships, and a scope the backend
 * already grants would otherwise open one page early.
 * @param {ScopeBearingCredentials} [credentials]
 * @returns {boolean}
 */
export const readsAnyOrganisation = (credentials) =>
  config.get('featureFlags.regulatorAccess') &&
  hasOrganisationReadScope(credentials)
