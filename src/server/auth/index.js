import { authCallbackController } from '~/src/server/auth/controller.js'

/**
 * Auth plugin
 * Registers the /auth/callback route that handles OAuth2/OIDC callback
 */
const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.route({
        method: ['GET', 'POST'],
        path: '/auth/callback',
        ...authCallbackController
      })
    }
  }
}

export { auth }
