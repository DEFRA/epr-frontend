import { controller } from './controller.js'
import { controller as linkingController } from './linking/controller.js'

/**
 * Sets up the routes used in the page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const account = {
  plugin: {
    name: 'account',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/account'
        },
        {
          ...linkingController,
          method: 'GET',
          path: '/account/linking'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
