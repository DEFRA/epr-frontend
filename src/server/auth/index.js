import { config } from '#config/config.js'
import {
  defraIdCallbackController,
  entraIdCallbackController
} from '#server/auth/callback/controller.js'
import { controller as organisationController } from '#server/auth/organisation/controller.js'
import {
  registerSignedOutProviderCookie,
  signedOutOfRegulatorService,
  SIGNED_OUT_PROVIDER_COOKIE
} from '#server/auth/helpers/signed-out-provider.js'
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
      registerSignedOutProviderCookie(server)

      server.route([
        {
          ...defraIdCallbackController,
          method: 'GET',
          path: paths.auth.defraId.callback
        },
        {
          handler: (request, h) => {
            const signedOutPage = signedOutOfRegulatorService(request)
              ? paths.regulators.loggedOut
              : paths.loggedOut

            return h
              .redirect(request.localiseUrl(signedOutPage))
              .unstate(SIGNED_OUT_PROVIDER_COOKIE)
          },
          method: 'GET',
          options: { auth: false },
          path: paths.auth.postLogoutRedirect
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
