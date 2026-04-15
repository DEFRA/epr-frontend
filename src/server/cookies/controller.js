/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler({ t: localise }, h) {
    return h.view('cookies/index', {
      pageTitle: localise('cookies:pageTitle')
    })
  }
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
