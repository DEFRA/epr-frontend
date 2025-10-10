/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */

export const homeController = {
  handler(request, h) {
    return h.view('home/index', {
      pageTitle: 'home.pageTitle',
      serviceName: 'global.serviceName',
      heading: 'home.heading'
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
