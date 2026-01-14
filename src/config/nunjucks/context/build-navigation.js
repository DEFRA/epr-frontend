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
 * @param {I18nRequest} request
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
 * @import { Request } from '@hapi/hapi'
 */
