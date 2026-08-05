import { config } from '#config/config.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'

/**
 * Login plugin
 * Registers the /login route that triggers OIDC authentication
 * Adds a route that triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, auth callback redirects to organisation home (linked) or linking page (unlinked)
 *
 * When the entraId feature flag is enabled, also registers /regulators/login,
 * which triggers the 'entra-id' auth strategy for regulator sign in.
 */
const login = {
  plugin: {
    name: 'login',
    register: (server) => {
      server.route([
        {
          options: {
            ext: {
              onPreAuth: {
                method: async (_request, h) => {
                  await metrics.signInAttempted(OIDC_DEFRA_ID)
                  return h.continue
                }
              }
            },
            auth: OIDC_DEFRA_ID
          },
          method: 'GET',
          path: paths.auth.defraId.login,
          /* v8 ignore next - handler is fallback; defra-id auth strategy handles redirect */
          handler: async (request, h) =>
            h.redirect(request.localiseUrl(paths.start))
        }
      ])

      if (config.get('featureFlags.regulatorAccess')) {
        server.route([
          {
            options: {
              ext: {
                onPreAuth: {
                  method: async (_request, h) => {
                    await metrics.signInAttempted(OIDC_ENTRA_ID)
                    return h.continue
                  }
                }
              },
              auth: OIDC_ENTRA_ID
            },
            method: 'GET',
            path: paths.auth.entraId.login,
            /* v8 ignore next - handler is fallback; entra-id auth strategy handles redirect */
            handler: async (request, h) =>
              h.redirect(request.localiseUrl(paths.start))
          }
        ])
      }
    }
  }
}

export { login }
