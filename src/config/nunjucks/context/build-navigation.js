import { config } from '#config/config.js'
import { SESSION_STRATEGY } from '#server/auth/helpers/session-cookie.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { paths } from '#server/paths.js'

/**
 * Navigation item
 * @typedef {{active?: boolean, href: string, text: string}} NavigationItem
 */

/**
 * @param {HapiRequest} request
 * @param {UserSession} session
 * @returns {NavigationItem[]}
 */
const home = ({ localiseUrl, t: localise }, session) => {
  if (!session.linkedOrganisationId) {
    return []
  }
  return [
    {
      href: localiseUrl(`/organisations/${session.linkedOrganisationId}`),
      text: localise('common:navigation:home')
    }
  ]
}

/**
 * The link manages a Defra ID account, so it belongs only to a user who has
 * one. A regulator signs in with Entra ID and manages their account elsewhere.
 * @param {HapiRequest} request
 * @param {UserSession} session
 * @returns {NavigationItem[]}
 */
const manageAccount = ({ t: localise }, session) => {
  if (session.provider !== OIDC_DEFRA_ID) {
    return []
  }

  return [
    {
      href: config.get('defraId.manageAccountUrl'),
      text: localise('common:navigation:manageAccount')
    }
  ]
}

/**
 * @param {HapiRequest} request
 * @returns {NavigationItem[]}
 */
const signOut = ({ localiseUrl, t: localise }) => {
  return [
    {
      href: localiseUrl(paths.logout),
      text: localise('common:navigation:signOut')
    }
  ]
}

/**
 * @param {HapiRequest | null} request
 */
export function buildNavigation(request) {
  if (!request) {
    return []
  }

  const session = request.auth?.credentials

  // Credentials from a sign-in callback are not a session: the visitor has
  // nothing to sign out of and no account these controls reach.
  if (!session || request.auth.strategy !== SESSION_STRATEGY) {
    return []
  }

  return [
    ...home(request, session),
    ...manageAccount(request, session),
    ...signOut(request)
  ]
}

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */
