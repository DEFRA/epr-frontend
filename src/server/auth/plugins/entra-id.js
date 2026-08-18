import { asHapiRequest } from '#server/common/hapi-types.js'
import { config } from '#config/config.js'
import { paths } from '#server/paths.js'
import bell from '@hapi/bell'
import * as jose from 'jose'
import { getTokenExpiresAt } from '../helpers/build-session.js'
import { getRedirectUrl } from '../helpers/get-redirect-url.js'
import { recordSignInReferrer } from '../helpers/record-sign-in-referrer.js'

/**
 * @import { AzureB2CTokenParams, BellProfileTarget, OAuthTokenParams } from '../types/auth.js'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { AuthProvider } from '../types/auth-provider.js'
 * @import { OidcConfig } from '../helpers/get-oidc-configuration.js'
 */

export const OIDC_ENTRA_ID = 'entra-id'

/**
 * The app asks for `api://{clientId}/.default` as a resource scope for its own
 * app registration, so Entra issues an access token — rather than the id
 * token — carrying the `roles` app-role assignment claim. Sign-in and refresh
 * ask for the same scopes, so a refreshed session keeps that claim.
 * @param {string} clientId
 * @returns {string[]}
 */
const entraIdScopes = (clientId) => [
  'openid',
  'profile',
  'email',
  'offline_access',
  `api://${clientId}/.default`
]

/**
 * Subset of the Entra ID access token payload claims the app reads. Mirrors
 * the `DefraIdJwtPayload` typedef pattern in `../types/auth.js`.
 *
 * The token's `roles` claim is absent here on purpose. It is what the backend
 * resolves a regulator from, and the backend holds that mapping alone.
 *
 * Authoritative claim list: Microsoft's access token reference for v2.0
 * tokens https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
 * @typedef {{
 *   oid: string
 *   preferred_username: string
 *   exp: number
 * }} EntraIdJwtPayload
 */

/**
 * Describe what Entra ID does differently from the other OIDC providers.
 *
 * An Entra ID session presents the access token to the backend, so the access
 * token is both the token to verify and the token the session carries. The id
 * token stays for the `id_token_hint` on logout.
 * @param {OidcConfig} oidcConf - Entra ID OIDC discovery document
 * @returns {AuthProvider}
 */
const createEntraIdAuthProvider = (oidcConf) => {
  // `jose` treats an absent `issuer` as "do not check the issuer", so a
  // discovery document without one would verify a token from anybody.
  if (!oidcConf.issuer) {
    throw new Error('Entra ID discovery document names no issuer')
  }

  const clientId = config.get('entraId.clientId')

  const JWKS = jose.createRemoteJWKSet(new URL(oidcConf.jwks_uri))

  /**
   * Verifies the OAuth2 access token, not the id token.
   * @param {string} token
   * @returns {Promise<EntraIdJwtPayload>}
   */
  const verifyToken = async (token) => {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: oidcConf.issuer
    })

    return /** @type {EntraIdJwtPayload} */ (payload)
  }

  return {
    tokenRequestParams: {
      client_id: clientId,
      client_secret: config.get('entraId.clientSecret'),
      scope: entraIdScopes(clientId).join(' ')
    },
    selectBackendToken: (tokens) => {
      if (!tokens.access_token) {
        throw new Error('Entra ID returned no access token')
      }

      return tokens.access_token
    },
    verifyBackendToken: async (token) => {
      const payload = await verifyToken(token)

      return {
        profile: { id: payload.oid, email: payload.preferred_username },
        expiresAt: getTokenExpiresAt(payload)
      }
    }
  }
}

/**
 * Create Entra ID OIDC authentication plugin
 * Factory function, mirrors the shape of `createDefraId` in `./defra-id.js`
 * @param {OidcConfig} oidcConf - Entra ID OIDC discovery document
 * @param {AuthProvider} authProvider - What Entra ID does differently
 * @returns {ServerRegisterPluginObject<void>}
 */
const createEntraId = (oidcConf, authProvider) => ({
  plugin: {
    name: OIDC_ENTRA_ID,
    register: async (server) => {
      const clientId = config.get('entraId.clientId')
      const clientSecret = config.get('entraId.clientSecret')

      // `once: true` — bell may already be registered by the defra-id plugin;
      // hapi throws if the same plugin is registered twice without this.
      await server.register(bell, { once: true })

      server.auth.strategy(OIDC_ENTRA_ID, 'bell', {
        clientId,
        clientSecret,
        cookie: 'bell-entra-id',
        isSecure: config.get('session.cookie.secure'),
        location: (request) => {
          recordSignInReferrer(request)

          return getRedirectUrl(
            asHapiRequest(request),
            paths.auth.entraId.callback
          )
        },
        password: config.get('session.cookie.password'),
        provider: {
          name: OIDC_ENTRA_ID,
          protocol: 'oauth2',
          useParamsAuth: true,
          auth: oidcConf.authorization_endpoint,
          token: oidcConf.token_endpoint,
          scope: entraIdScopes(clientId),
          /**
           * Extract user profile from the verified access token and
           * populate credentials. Bell gives us a plain `BellCredentials`
           * object which we mutate into a `UserSession` by attaching the
           * profile, token expiry, tokens and OIDC URLs.
           *
           * The access token becomes the session's backend token: it carries
           * the `roles` claim the backend resolves a regulator from. The id
           * token stays for the `id_token_hint` on logout.
           * @param {BellProfileTarget} credentials
           * @param {OAuthTokenParams | AzureB2CTokenParams} params
           * @returns {Promise<void>}
           */
          profile: async function (credentials, params) {
            const backendToken = authProvider.selectBackendToken(params)
            const { profile, expiresAt } =
              await authProvider.verifyBackendToken(backendToken)

            credentials.profile = profile
            credentials.expiresAt = expiresAt
            credentials.idToken = params.id_token
            credentials.backendToken = backendToken
            credentials.urls = {
              token: oidcConf.token_endpoint,
              logout: oidcConf.end_session_endpoint
            }
            credentials.scope = []
          }
        },
        providerParams: () => ({
          response_mode: 'query'
        })
      })
    }
  }
})

export { createEntraId, createEntraIdAuthProvider }
