import { config } from '#config/config.js'
import {
  defraIdCallbackController,
  entraIdCallbackController
} from '#server/auth/callback/controller.js'
import { controller as organisationController } from '#server/auth/organisation/controller.js'
import { paths } from '#server/paths.js'

/**
 * Auth plugin
 * Registers auth routes for OAuth2/OIDC callback, organisation selection, and logout callback
 *
 * When the entraId feature flag is enabled, also registers the Entra ID
 * OAuth2/OIDC callback route used by regulator sign in.
 */
const auth = {
  plugin: {
    name: 'auth',
    register: (server) => {
      server.route([
        {
          ...defraIdCallbackController,
          method: 'GET',
          path: paths.auth.defraId.callback
        },
        {
          handler: (request, h) =>
            h.redirect(request.localiseUrl(paths.loggedOut)),
          method: 'GET',
          options: { auth: false },
          path: paths.auth.defraId.postLogoutRedirect
        },
        {
          ...organisationController,
          method: 'GET',
          path: paths.auth.defraId.organisation
        }
      ])

      if (config.get('featureFlags.regulatorAccess')) {
        server.route([
          {
            ...entraIdCallbackController,
            method: 'GET',
            path: paths.auth.entraId.callback
          }
        ])
      }
    }
  }
}

export { auth }
