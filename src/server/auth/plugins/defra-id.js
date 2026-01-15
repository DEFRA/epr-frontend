import { config } from '#config/config.js'
import bell from '@hapi/bell'
import {
  buildUserProfile,
  getTokenExpiresAt
} from '../helpers/build-session.js'
import { getOidcConfiguration } from '../helpers/get-oidc-configuration.js'

/**
 * @import { Request, ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { AzureB2CTokenParams, AzureB2CBellCredentials, OAuthBellCredentials, OAuthTokenParams } from '../types/auth.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

const PRODUCTION_SERVICE_URL =
  'https://record-reprocessed-exported-packaging-waste.defra.gov.uk'

const VALID_PROTOCOLS = new Set(['http', 'https'])

/**
 * Gets the auth callback URL from the request, restricted to allowed origins
 * @param {Request} request
 * @returns {string}
 */
const getAuthCallbackUrl = (request) => {
  const appBaseUrl = config.get('appBaseUrl')
  const allowedOrigins = new Set([appBaseUrl, PRODUCTION_SERVICE_URL])

  const forwardedProto = request.headers['x-forwarded-proto']
  const protocol = VALID_PROTOCOLS.has(forwardedProto)
    ? forwardedProto
    : request.server.info.protocol

  const requestUrl = new URL(appBaseUrl)
  requestUrl.protocol = protocol
  requestUrl.host = request.info.host

  const origin = allowedOrigins.has(requestUrl.origin)
    ? requestUrl.origin
    : appBaseUrl

  return new URL('/auth/callback', origin).href
}
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

            // TODO store paths/routes as constants
            if (!pathname.startsWith('/auth/callback')) {
              const referrer = `${pathname}${search}${hash}`
              request.yar.flash('referrer', referrer)
            }
          }

          return getAuthCallbackUrl(request)
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
            // TODO store paths/routes as constants
            forceReselection: request.path === '/auth/organisation',
            serviceId
          }
        }
      })
    }
  }
})

export { createDefraId, getAuthCallbackUrl }
