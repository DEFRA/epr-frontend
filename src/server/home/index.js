import { controller, redirectToStart } from './controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/start',
          options: {
            auth: { mode: 'try' }
          }
        },
        {
          ...redirectToStart,
          method: 'GET',
          path: '/',
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
