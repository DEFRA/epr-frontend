import { controller } from './controller.js'

/**
 * Sign out confirmation plugin
 * Registers the /sign-out route that displays confirmation after logout
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const signOut = {
  plugin: {
    name: 'sign-out',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/sign-out',
          ...controller
        }
      ])
    }
  }
}

export { signOut }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
