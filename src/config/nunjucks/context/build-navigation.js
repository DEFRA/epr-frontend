/**
 * @param {Partial<Request> | null} request
 */
export function buildNavigation(request) {
  return [
    {
      active: request?.path === '/',
      href: '/',
      text: 'Your sites'
    }
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
