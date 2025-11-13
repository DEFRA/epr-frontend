import { config } from '#config/config.js'
import bell from '@hapi/bell'
import jwt from '@hapi/jwt'
import fetch from 'node-fetch'
import { getDisplayName } from '../helpers/display.js'

/**
 * @typedef {object} BellCredentials
 * @property {number} expiresIn - Token expiration time in seconds
 * @property {string} provider - OAuth provider name (e.g., "defra-id")
 * @property {object} query - Query parameters from the OAuth callback
 * @property {string} refreshToken - JWT refresh token
 * @property {string} token - JWT access token
 * @property {object} [profile] - User profile object (set by the profile function)
 */

/**
 * @typedef {object} OAuthTokenParams
 * @property {string} access_token - JWT access token
 * @property {number} expires_in - Token expiration time in seconds
 * @property {string} id_token - JWT ID token containing user claims
 * @property {string} refresh_token - JWT refresh token for obtaining new access tokens
 * @property {string} token_type - Token type (typically "bearer")
 */

/**
 * @typedef {object} AzureB2CTokenParams
 * @property {string} id_token - JWT ID token containing user claims
 * @property {number} id_token_expires_in - ID token expiration time in seconds
 * @property {number} not_before - Timestamp before which the token is not valid
 * @property {string} profile_info - Base64 encoded profile information
 * @property {string} refresh_token - JWT refresh token for obtaining new access tokens
 * @property {number} refresh_token_expires_in - Refresh token expiration time in seconds
 * @property {string} scope - Space-separated list of granted scopes
 * @property {string} token_type - Token type (typically "Bearer")
 */

const getOidcConfiguration = async (oidcConfigurationUrl) => {
  const res = await fetch(oidcConfigurationUrl)
  if (!res.ok) {
    throw new Error(`OIDC config fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/**
 * Defra ID OIDC authentication plugin
 * Configures `@hapi/bell` for OAuth2/OIDC flow with Defra ID
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const defraId = {
  plugin: {
    name: 'defra-id',
    register: async (server) => {
      const oidcConfigurationUrl = config.get('defraId.oidcConfigurationUrl')
      const serviceId = config.get('defraId.serviceId')
      const clientId = config.get('defraId.clientId')
      const clientSecret = config.get('defraId.clientSecret')
      const authCallbackUrl = config.get('appBaseUrl') + '/auth/callback'

      await server.register(bell)

      // Fetch OIDC configuration from discovery endpoint
      const oidcConf = await getOidcConfiguration(oidcConfigurationUrl)

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
            const payload = jwt.token.decode(params.id_token).decoded.payload
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
 */
