import { isEmpty } from 'lodash-es'

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
    ...(!isEmpty(authedUser)
      ? [
          {
            href: request.localiseUrl('/logout'),
            text: request.t('common:navigation:signOut')
          }
        ]
      : [])
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
