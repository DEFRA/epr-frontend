/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler(request, h) {
    const localise = request.t
    return h.view('home/index', {
      pageTitle: localise('home:pageTitle'),
      heading: localise('home:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
