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
 * @returns {NavigationItem[]}
 */
const yourSites = ({ localiseUrl, path, t: localise }) => {
  return [
    {
      active: path === '/account',
      href: localiseUrl('/account'),
      text: localise('common:navigation.yourSites')
    }
  ]
}

/**
 * @param {I18nRequest} request
 * @param {UserSession} userSession
 * @returns {NavigationItem[]}
 */
const switchOrganisation = ({ localiseUrl, t: localise }, userSession) => {
  if (userSession.relationships?.length > 1) {
    return [
      {
        href: localiseUrl('/auth/organisation'),
        text: localise('common:navigation.switchOrganisation')
      }
    ]
  }
  return []
}

/**
 * @param {I18nRequest} request
 * @returns {NavigationItem[]}
 */
const logout = ({ localiseUrl, t: localise }) => {
  return [
    {
      href: localiseUrl('/logout'),
      text: localise('common:navigation.signOut')
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
    ...yourSites(request),
    ...switchOrganisation(request, userSession),
    ...logout(request)
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
