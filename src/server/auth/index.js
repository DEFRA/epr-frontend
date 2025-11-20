import { controller as callbackController } from '#server/auth/callback/controller.js'
import { controller as organisationController } from '#server/auth/organisation/controller.js'

/**
 * Auth plugin
 * Registers the /auth/callback route that handles OAuth2/OIDC callback
 */
const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.route([
        {
          ...callbackController,
          method: 'GET',
          path: '/auth/callback'
        },
        {
          ...organisationController,
          method: 'GET',
          path: '/auth/organisation'
        }
      ])
    }
  }
}

export { auth }
