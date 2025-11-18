import { config } from '#config/config.js'
import bell from '@hapi/bell'
import { buildUserProfile } from '../helpers/build-session.js'
import { getOidcConfiguration } from '../helpers/get-oidc-configuration.js'

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { BellCredentials, OAuthTokenParams, AzureB2CTokenParams } from '../types/auth-types.js'
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
      const serviceId = config.get('defraId.serviceId')
      const clientId = config.get('defraId.clientId')
      const clientSecret = config.get('defraId.clientSecret')
      const authCallbackUrl = config.get('appBaseUrl') + '/auth/callback'

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

            // TODO store paths/routes as constants
            if (!pathname.startsWith('/auth/callback')) {
              const referrer = `${pathname}${search}${hash}`
              request.yar.flash('referrer', referrer)
            }
          }

          return authCallbackUrl
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
           * @param {BellCredentials} credentials - Bell credentials object (mutated to add profile)
           * @param {OAuthTokenParams | AzureB2CTokenParams} params - OAuth token response parameters (supports both standard OAuth and Azure B2C formats)
           * @returns {Promise<void>}
           */
          profile: async function (credentials, params) {
            const payload = verifyToken(params.id_token).decoded.payload

            credentials.profile = buildUserProfile({
              idToken: params.id_token,
              logoutUrl: oidcConf.end_session_endpoint,
              payload,
              tokenUrl: oidcConf.token_endpoint
            })
          }
        },
        providerParams: function (request) {
          return {
            ...authParams,
            // TODO store paths/routes as constants
            forceReselection: request.path === '/auth/organisation',
            serviceId
          }
        }
      })
    }
  }
})

export { createDefraId }
