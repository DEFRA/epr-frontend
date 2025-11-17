import { config } from '#config/config.js'
import bell from '@hapi/bell'
import { getDisplayName } from '../helpers/display.js'
import { getOidcConfiguration } from '../helpers/get-oidc-configuration.js'
import { getVerifyToken } from '../helpers/verify-token.js'

/**
 * Defra ID OIDC authentication plugin
 * Configures `@hapi/bell` for OAuth2/OIDC flow with Defra ID
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const defraId = {
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
      const verifyToken = await getVerifyToken(oidcConf)

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
            // Decode JWT and extract user profile
            const payload = verifyToken(params.id_token).decoded.payload

            const displayName = getDisplayName(payload)

            credentials.profile = {
              id: payload.sub,
              correlationId: payload.correlationId,
              sessionId: payload.sessionId,
              contactId: payload.contactId,
              serviceId: payload.serviceId,
              firstName: payload.firstName,
              lastName: payload.lastName,
              displayName,
              email: payload.email,
              uniqueReference: payload.uniqueReference,
              loa: payload.loa,
              aal: payload.aal,
              enrolmentCount: payload.enrolmentCount,
              enrolmentRequestCount: payload.enrolmentRequestCount,
              currentRelationshipId: payload.currentRelationshipId,
              relationships: payload.relationships,
              roles: payload.roles,
              idToken: params.id_token,
              tokenUrl: oidcConf.token_endpoint,
              logoutUrl: oidcConf.end_session_endpoint
            }
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
}

export { defraId }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { BellCredentials, OAuthTokenParams, AzureB2CTokenParams } from '../types/auth-types.js'
 */
