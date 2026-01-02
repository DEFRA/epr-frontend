import { controller } from './controller.js'

/**
 * Sets up the routes used in the contact page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const contact = {
  plugin: {
    name: 'contact',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/contact'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
