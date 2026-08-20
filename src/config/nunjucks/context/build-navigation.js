import { config } from '#config/config.js'
import { SESSION_STRATEGY } from '#server/auth/helpers/session-cookie.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { isRegulator } from '#server/auth/roles.js'
import { paths } from '#server/paths.js'

/**
 * Navigation item
 * @typedef {{current?: boolean, href: string, text: string}} NavigationItem
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
 * A regulator has no linked organisation, so the operator's home link has
 * nothing to point at. Their home is the page sign-in already lands them on,
 * and that page is the organisation list. The list gets a tab of its own once
 * it moves off home, not before.
 * @param {HapiRequest} request
 * @returns {NavigationItem[]}
 */
const regulatorHome = ({ localiseUrl, t: localise, path }) => {
  const href = localiseUrl(paths.regulators.home)

  return [
    {
      current: path === href,
      href,
      text: localise('common:navigation:home')
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

  // Every control here acts on the session cookie, so a request that another
  // strategy authenticated gets none of them.
  if (!session || request.auth.strategy !== SESSION_STRATEGY) {
    return []
  }

  // Which shell a user gets is a question about who they are, so it reads the
  // role. What renders inside the shell is a question about what they may do,
  // and reads a scope.
  if (isRegulator(session)) {
    return [...regulatorHome(request), ...signOut(request)]
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
