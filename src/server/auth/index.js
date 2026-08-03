import { defraIdCallbackController } from '#server/auth/callback/controller.js'
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
          ...defraIdCallbackController,
          method: 'GET',
          path: paths.auth.defraId.callback
        },
        {
          ...organisationController,
          method: 'GET',
          path: paths.auth.defraId.organisation
        }
      ])
    }
  }
}

export { auth }
