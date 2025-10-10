/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

export const homeController = {
  handler(request, h) {
    return h.view('home/index', {
      pageTitle: request.localize('home.pageTitle'),
      serviceName: request.localize('global.serviceName'),
      heading: request.localize('home.heading')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
