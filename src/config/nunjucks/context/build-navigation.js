import { isEmpty } from 'lodash-es'

/**
 * @import {UserSession} from "#server/auth/helpers/get-user-session.js"
 */

/**
 * I18nRequest
 * @typedef {{ localiseUrl: (url: string) => string; t: (key: string) => string; }} I18nRequest
 */

/**
 * Navigation item
 * @typedef {{active?: boolean, href: string, text: string}} NavigationItem
 */

/**
 * @param {I18nRequest | null} request
 * @param {UserSession | null} authedUser
 * @returns {NavigationItem[]}
 */
const yourSites = ({ localiseUrl, path, t: localise }, authedUser) => {
  if (!isEmpty(authedUser)) {
    return [
      {
        active: path === '/account',
        href: localiseUrl('/account'),
        text: localise('common:navigation:yourSites')
      }
    ]
  }
  return []
}

/**
 * @param {I18nRequest | null} request
 * @param {UserSession | null} userSession
 * @returns {NavigationItem[]}
 */
const switchOrganisation = ({ localiseUrl, t: localise }, userSession) => {
  if (userSession?.relationships?.length > 1) {
    return [
      {
        href: localiseUrl('/auth/organisation'),
        text: localise('common:navigation:switchOrganisation')
      }
    ]
  }
  return []
}

/**
 * @param {I18nRequest | null} request
 * @param {UserSession | null} authedUser
 * @returns {NavigationItem[]}
 */
const logout = ({ localiseUrl, t: localise }, authedUser) => {
  if (!isEmpty(authedUser)) {
    return [
      {
        href: localiseUrl('/logout'),
        text: localise('common:navigation:signOut')
      }
    ]
  }
  return []
}

/**
 * @param {Partial<Request> | null} request
 */
export function buildNavigation(request, authedUser) {
  if (!request) {
    return []
  }

  return [
    ...yourSites(request, authedUser),
    ...switchOrganisation(request, authedUser),
    ...logout(request, authedUser)
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
