/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */
export const homeController = {
  handler(request, h) {
    const localize = request.t
    return h.view('home/index', {
      pageTitle: localize('home:pageTitle'),
      heading: localize('home:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
