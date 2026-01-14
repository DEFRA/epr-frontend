import { controller } from './controller.js'

/**
 * Sign out confirmation plugin
 * Registers the /logged-out route that displays confirmation after logout
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const loggedOut = {
  plugin: {
    name: 'logged-out',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/logged-out',
          options: {
            auth: false
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
