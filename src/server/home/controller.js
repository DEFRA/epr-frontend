/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */
export const homeController = {
  handler(request, h) {
    console.log('request#############: ', request.t);
    const localize = request.t
    return h.view('home/index', {
      pageTitle: localize('common:serviceName'),
      heading: localize('home:pageTitle'),
      greeting: localize('home:greeting', { name: 'Mohammed' })
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
