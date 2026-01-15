import { controller as callbackController } from '#server/auth/callback/controller.js'
import { controller as organisationController } from '#server/auth/organisation/controller.js'

/**
 * Auth plugin
 * Registers auth routes for OAuth2/OIDC callback, organisation selection, and logout callback
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
          handler: (request, h) =>
            h.redirect(request.localiseUrl('/logged-out')),
          method: 'GET',
          options: { auth: false },
          path: '/auth/logout'
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
