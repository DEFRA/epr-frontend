import { authCallbackController } from '#server/auth/callback/controller.js'

/**
 * Auth plugin
 * Registers the /auth/callback route that handles OAuth2/OIDC callback
 */
const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.route({
        ...authCallbackController,
        method: 'GET',
        path: '/auth/callback'
      })
    }
  }
}

export { auth }
