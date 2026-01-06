import { config } from '#config/config.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/**
 * I18nRequest - Request object with i18n helpers
 * @typedef {Partial<Request> & {
 *  localiseUrl: (url: string) => string;
 *  t: (key: string) => string
 * }} I18nRequest
 */

/**
 * Navigation item
 * @typedef {{active?: boolean, href: string, text: string}} NavigationItem
 */

/**
 * @param {I18nRequest} request
 * @param {UserSession} userSession
 * @returns {NavigationItem[]}
 */
const home = ({ localiseUrl, t: localise }, userSession) => {
  if (!userSession.linkedOrganisationId) {
    return []
  }
  return [
    {
      href: localiseUrl(`/organisations/${userSession.linkedOrganisationId}`),
      text: localise('common:navigation:home')
    }
  ]
}

/**
 * @param {I18nRequest} request
 * @returns {NavigationItem[]}
 */
const manageAccount = ({ t: localise }) => {
  const manageAccountUrl = config.get('defraId.manageAccountUrl')
  if (!manageAccountUrl) {
    return []
  }
  return [
    {
      href: manageAccountUrl,
      text: localise('common:navigation:manageAccount')
    }
  ]
}

/**
 * @param {I18nRequest} request
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
 * @param {I18nRequest | null} request
 * @param {Partial<UserSession | null>} userSession
 */
export function buildNavigation(request, userSession) {
  if (!request || !userSession) {
    return []
  }

  return [
    ...home(request, userSession),
    ...manageAccount(request),
    ...signOut(request)
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
