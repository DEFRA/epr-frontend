/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler(_request, h) {
    return h.view('account/index', {
      pageTitle: 'Account',
      heading: 'Account'
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
