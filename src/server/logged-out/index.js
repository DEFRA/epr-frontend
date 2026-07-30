import { controller } from './controller.js'
import { paths } from '#server/paths.js'

/**
 * Sign out confirmation plugin
 * Registers the /logged-out route that displays confirmation after logout
 */
const loggedOut = {
  plugin: {
    name: 'logged-out',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: paths.loggedOut,
          options: {
            auth: { mode: 'try' }
          }
        }
      ])
    }
  }
}

export { loggedOut }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
