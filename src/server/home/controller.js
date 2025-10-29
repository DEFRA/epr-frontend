/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler({ t: localise }, h) {
    return h.view('home/index', {
      pageTitle: localise('home:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
