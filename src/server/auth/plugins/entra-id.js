import { config } from '#config/config.js'
import { getTokenExpiresAt } from '../helpers/build-session.js'
import * as jose from 'jose'

/**
 * @import { OidcConfig } from '#server/auth/helpers/get-oidc-configuration.js'
 * @import { AzureB2CTokenParams, BellProfileTarget, OAuthBellCredentials, OAuthTokenParams } from '../types/auth.js'
 */

/**
 * Subset of the Entra ID JWT payload claims the app reads. Mirrors the
 * `DefraIdJwtPayload` typedef pattern
 *
 * Authoritative claim list: Microsoft's id_token reference for v2.0 tokens
 * https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens
 * @typedef {{
 *   oid: string
 *   name: string
 *   preferred_username: string
 *   exp: number
 * }} EntraIdTokenPayload
 */

export const entraIdAuthPlugin = (/** @type {OidcConfig} */ oidcConfig) => ({
  plugin: {
    name: 'entra-id-auth-plugin',
    register: async (server) => {
      server.auth.strategy('entra-id', 'bell', getBellOptions(oidcConfig))
    }
  }
})

function getBellOptions(/** @type {OidcConfig} */ oidcConfig) {
  const scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    `api://${config.get('entraId.clientId')}/.default`
  ]

  return {
    provider: {
      name: 'entra-id',
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcConfig.authorization_endpoint,
      token: oidcConfig.token_endpoint,
      scope: scopes,
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
        const tokenPayload = await verifyToken(
          credentials.token || '',
          oidcConfig
        )
        const { oid: id, preferred_username: email } = tokenPayload

        credentials.profile = {
          id,
          email
        }
        credentials.expiresAt = getTokenExpiresAt(tokenPayload)
        credentials.idToken = params.id_token
        credentials.urls = {
          token: oidcConfig.token_endpoint,
          logout: oidcConfig.end_session_endpoint
        }
      }
    },
    clientId: config.get('entraId.clientId'),
    clientSecret: config.get('entraId.clientSecret'),
    cookie: 'bell-entra-id',
    password: config.get('session.cookie.password'),
    isSecure: config.get('isProduction'),
    forceHttps: config.get('isProduction'),
    location: function (request) {
      if (request.info.referrer) {
        const { hash, pathname, search } = new URL(request.info.referrer)

        if (!pathname.startsWith('/auth/callback')) {
          const referrer = `${pathname}${search}${hash}`
          request.yar.flash('referrer', referrer)
        }
      }

      return `${config.get('appBaseUrl')}/auth/callback`
    },

    providerParams: function (_request) {
      return {
        response_mode: 'query'
      }
    }
  }
}

/**
 * Cannot easily reuse existing getVerifyToken function, as that validates the token is Defra shaped
 * @param {string} token
 * @param {OidcConfig} oidcConfig
 * @returns {Promise<EntraIdTokenPayload>}
 */
async function verifyToken(token, { jwks_uri: uri }) {
  const clientId = config.get('entraId.clientId')
  const tenantId = config.get('entraId.tenantId')

  const JWKS = jose.createRemoteJWKSet(new URL(uri))

  const { payload } = await jose.jwtVerify(token, JWKS, {
    algorithms: ['RS256'],
    audience: clientId,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`
  })

  return /** @type {EntraIdTokenPayload} */ (payload)
}
