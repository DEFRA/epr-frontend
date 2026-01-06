/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler({ t: localise }, h) {
    return h.view('cookies/index', {
      pageTitle: localise('cookies:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
