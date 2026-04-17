import { config } from '#config/config.js'

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
 * @param {HapiRequest} request
 * @returns {NavigationItem[]}
 */
const manageAccount = ({ t: localise }) => {
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
      href: localiseUrl('/logout'),
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

  if (!session) {
    return []
  }

  return [
    ...home(request, session),
    ...manageAccount(request),
    ...signOut(request)
  ]
}

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */
