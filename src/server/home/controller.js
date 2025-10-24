/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler(_request, h) {
    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'Home'
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
