import { controller } from './controller.js'

/**
 * Sets up the routes used in the cookies page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const cookies = {
  plugin: {
    name: 'cookies',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/cookies',
          options: {
            auth: false
          }
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
