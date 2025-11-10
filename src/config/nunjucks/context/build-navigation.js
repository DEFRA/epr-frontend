import { isEmpty } from 'lodash-es'

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

const switchOrganisation = ({ localiseUrl, t: localise }, authedUser) => {
  if (!isEmpty(authedUser)) {
    return [
      {
        href: localiseUrl('/auth/organisation'),
        text: localise('common:navigation:switchOrganisation')
      }
    ]
  }
  return []
}

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
