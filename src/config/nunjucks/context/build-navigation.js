import { isEmpty } from 'lodash-es'

/**
 * @param {Partial<Request> | null} request
 */
export function buildNavigation(request, authedUser) {
  return [
    {
      active: request?.path === '/',
      href: '/',
      text: 'Your sites'
    },
    ...(!isEmpty(authedUser)
      ? [
          {
            href: request.localiseUrl('/logout'),
            text: request.t('common:signOut')
          }
        ]
      : [])
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
