/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */
export const homeController = {
  handler(request, h) {
    console.log('request#############: ', request.t)
    const localize = request.t
    const itemCount0 = 0
    const itemCount1 = 1
    const itemCount3 = 3
    const messageZero = localize('home:item', { count: itemCount0 })
    const messageOne = localize('home:item', { count: itemCount1 })
    const messageThree = localize('home:item', { count: itemCount3 })
    return h.view('home/index', {
      pageTitle: localize('common:serviceName'),
      heading: localize('home:pageTitle'),
      greeting: localize('home:greeting', { name: 'John Doe' }),
      messageZero,
      messageOne,
      messageThree
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
