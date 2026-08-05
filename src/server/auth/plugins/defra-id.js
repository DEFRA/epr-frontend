import { asHapiRequest } from '#server/common/hapi-types.js'
import { config } from '#config/config.js'
import { paths } from '#server/paths.js'
import bell from '@hapi/bell'
import {
  buildUserProfile,
  getTokenExpiresAt
} from '../helpers/build-session.js'
import { getOidcConfiguration } from '../helpers/get-oidc-configuration.js'
import { getRedirectUrl } from '../helpers/get-redirect-url.js'
import { recordSignInReferrer } from '../helpers/record-sign-in-referrer.js'

/**
 * @import { AzureB2CTokenParams, AzureB2CBellCredentials, BellProfileTarget, OAuthBellCredentials, OAuthTokenParams } from '../types/auth.js'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

export const OIDC_DEFRA_ID = 'defra-id'

/**
 * Create Defra ID OIDC authentication plugin
 * Factory function that creates a plugin with verifyToken closure
 * @param {VerifyToken} verifyToken - Token verification function
 * @returns {ServerRegisterPluginObject<void>}
 */
const createDefraId = (verifyToken) => ({
  plugin: {
    name: OIDC_DEFRA_ID,
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
      server.auth.strategy(OIDC_DEFRA_ID, 'bell', {
        clientId,
        clientSecret,
        cookie: 'bell-defra-id',
        isSecure: config.get('session.cookie.secure'),
        location: (request) => {
          recordSignInReferrer(request)

          return getRedirectUrl(
            asHapiRequest(request),
            paths.auth.defraId.callback
          )
        },
        password: config.get('session.cookie.password'),
        provider: {
          name: OIDC_DEFRA_ID,
          protocol: 'oauth2',
          useParamsAuth: true,
          auth: authBaseUrl,
          token: oidcConf.token_endpoint,
          scope: ['openid', 'offline_access'],
          /**
           * Extract user profile from OIDC ID token and populate credentials.
           * Bell gives us a plain `BellCredentials` object which we mutate
           * into a `UserSession` by attaching the profile, token expiry, id
           * token and OIDC URLs.
           * @param {BellProfileTarget} credentials
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
            credentials.scope = []
          }
        },
        providerParams: function (request) {
          return {
            ...authParams,
            forceReselection: request.path === paths.auth.defraId.organisation,
            serviceId
          }
        }
      })
    }
  }
})

export { createDefraId }
