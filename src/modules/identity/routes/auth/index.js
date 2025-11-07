import { authCallbackController } from '#modules/identity/routes/auth/controller.js'

/**
 * Auth plugin
 * Registers the /auth/callback route that handles OAuth2/OIDC callback
 */
const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.route({
        method: ['GET'],
        path: '/auth/callback',
        ...authCallbackController
      })
    }
  }
}

export { auth }
