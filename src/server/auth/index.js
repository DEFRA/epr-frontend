import {
  defraCallbackController,
  entraCallbackController
} from '#server/auth/callback/controller.js'
import { controller as organisationController } from '#server/auth/organisation/controller.js'
import { paths } from '#server/paths.js'

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
          ...defraCallbackController,
          method: 'GET',
          path: paths.auth.callback
        },
        {
          ...entraCallbackController,
          method: 'GET',
          path: '/auth/callback/entra'
        },
        {
          handler: (request, h) =>
            h.redirect(request.localiseUrl(paths.loggedOut)),
          method: 'GET',
          options: { auth: false },
          path: paths.auth.logout
        },
        {
          ...organisationController,
          method: 'GET',
          path: paths.auth.organisation
        }
      ])
    }
  }
}

export { auth }
