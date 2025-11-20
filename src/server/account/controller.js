/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler({ t: localise }, h) {
    return h.view('account/index', {
      pageTitle: localise('account:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
