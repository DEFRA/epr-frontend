import { config } from '#config/config.js'
import { paths } from '#server/paths.js'
import bell from '@hapi/bell'
import {
  buildUserProfile,
  getTokenExpiresAt
} from '../helpers/build-session.js'
import { getOidcConfiguration } from '../helpers/get-oidc-configuration.js'
import { getRedirectUrl } from '../helpers/get-redirect-url.js'

/**
 * @import { AzureB2CTokenParams, AzureB2CBellCredentials, OAuthBellCredentials, OAuthTokenParams } from '../types/auth.js'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Create Defra ID OIDC authentication plugin
 * Factory function that creates a plugin with verifyToken closure
 * @param {VerifyToken} verifyToken - Token verification function
 * @returns {ServerRegisterPluginObject<void>}
 */
const createDefraId = (verifyToken) => ({
  plugin: {
    name: 'defra-id',
    register: async (server) => {
      const clientId = config.get('defraId.clientId')
      const clientSecret = config.get('defraId.clientSecret')
      const serviceId = config.get('defraId.serviceId')

      await server.register(bell)

      // Fetch OIDC configuration from discovery endpoint
      const oidcConf = await getOidcConfiguration(
        config.get('defraId.oidcConfigurationUrl')
      )

      // Parse authorization endpoint to extract any existing query parameters
      // Azure AD B2C may include policy parameters like ?p=policy_name
      const authUrl = new URL(oidcConf.authorization_endpoint)
      const authBaseUrl = authUrl.origin + authUrl.pathname
      const authParams = Object.fromEntries(authUrl.searchParams)

      // Configure bell authentication strategy
      server.auth.strategy('defra-id', 'bell', {
        clientId,
        clientSecret,
        cookie: 'bell-defra-id',
        isSecure: config.get('session.cookie.secure'),
        location: (request) => {
          if (request.info.referrer) {
            const { hash, pathname, search } = new URL(request.info.referrer)

            if (!pathname.startsWith(paths.auth.callback)) {
              const referrer = `${pathname}${search}${hash}`
              request.yar.flash('referrer', referrer)
            }
          }

          return getRedirectUrl(request, paths.auth.callback)
        },
        password: config.get('session.cookie.password'),
        provider: {
          name: 'defra-id',
          protocol: 'oauth2',
          useParamsAuth: true,
          auth: authBaseUrl,
          token: oidcConf.token_endpoint,
          scope: ['openid', 'offline_access'],
          /**
           * Extract user profile from OIDC ID token and populate credentials
           * @param {OAuthBellCredentials | AzureB2CBellCredentials} credentials
           * @param {OAuthTokenParams | AzureB2CTokenParams} params
           * @returns {Promise<void>}
           */
          profile: async function (credentials, params) {
            const payload = await verifyToken(params.id_token)

            credentials.profile = buildUserProfile(payload)
            credentials.expiresAt = getTokenExpiresAt(payload)
            credentials.idToken = params.id_token
            credentials.urls = {
              token: oidcConf.token_endpoint,
              logout: oidcConf.end_session_endpoint
            }
          }
        },
        providerParams: function (request) {
          return {
            ...authParams,
            forceReselection: request.path === paths.auth.organisation,
            serviceId
          }
        }
      })
    }
  }
})

export { createDefraId }
