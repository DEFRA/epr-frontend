/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler({ t: localise }, h) {
    return h.view('contact/index', {
      pageTitle: localise('contact:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
