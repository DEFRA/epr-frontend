import { isEmpty } from 'lodash-es'

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
    {
      active: request?.path === '/',
      href: '/',
      text: request?.t('common:navigation:yourSites')
    },
    ...logout(request, authedUser)
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
