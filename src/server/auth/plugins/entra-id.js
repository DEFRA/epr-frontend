import { asHapiRequest } from '#server/common/hapi-types.js'
import { config } from '#config/config.js'
import { paths } from '#server/paths.js'
import bell from '@hapi/bell'
import * as jose from 'jose'
import { getTokenExpiresAt } from '../helpers/build-session.js'
import { getOidcConfiguration } from '../helpers/get-oidc-configuration.js'
import { getRedirectUrl } from '../helpers/get-redirect-url.js'
import { recordSignInReferrer } from '../helpers/record-sign-in-referrer.js'
import { SCOPES } from '../scopes.js'

/**
 * @import { AzureB2CTokenParams, BellProfileTarget, OAuthTokenParams } from '../types/auth.js'
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

export const OIDC_ENTRA_ID = 'entra-id'

/**
 * App role required for an Entra ID user to be treated as a regulator.
 * Configured against the app registration in Entra and returned in the
 * access token's `roles` claim for users assigned to it.
 */
export const REGULATOR_ROLE = 'Waste.Regulator.Standard'

/**
 * Subset of the Entra ID access token payload claims the app reads. Mirrors
 * the `DefraIdJwtPayload` typedef pattern in `../types/auth.js`.
 *
 * Authoritative claim list: Microsoft's access token reference for v2.0
 * tokens https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
 * @typedef {{
 *   oid: string
 *   preferred_username: string
 *   exp: number
 *   roles?: string[]
 * }} EntraIdJwtPayload
 */

/**
 * Create Entra ID OIDC authentication plugin
 * Factory function, mirrors the shape of `createDefraId` in `./defra-id.js`
 * @returns {ServerRegisterPluginObject<void>}
 */
const createEntraId = () => ({
  plugin: {
    name: OIDC_ENTRA_ID,
    register: async (server) => {
      const clientId = config.get('entraId.clientId')
      const clientSecret = config.get('entraId.clientSecret')
      const tenantId = config.get('entraId.tenantId')

      // `once: true` — bell may already be registered by the defra-id plugin;
      // hapi throws if the same plugin is registered twice without this.
      await server.register(bell, { once: true })

      const oidcConf = await getOidcConfiguration(
        config.get('entraId.oidcWellKnownConfigurationUrl')
      )

      const JWKS = jose.createRemoteJWKSet(new URL(oidcConf.jwks_uri))

      /**
       * Verifies the OAuth2 access token (not the id token). The app
       * requests `api://{clientId}/.default` as a resource scope for its
       * own app registration, so Entra issues an access token — rather than
       * the id token — carrying the `roles` app-role assignment claim.
       * @param {string} token
       * @returns {Promise<EntraIdJwtPayload>}
       */
      const verifyToken = async (token) => {
        const { payload } = await jose.jwtVerify(token, JWKS, {
          algorithms: ['RS256'],
          audience: clientId,
          issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`
        })

        return /** @type {EntraIdJwtPayload} */ (payload)
      }

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
          scope: [
            'openid',
            'profile',
            'email',
            'offline_access',
            `api://${clientId}/.default`
          ],
          /**
           * Extract user profile from the verified access token and
           * populate credentials. Bell gives us a plain `BellCredentials`
           * object which we mutate into a `UserSession` by attaching the
           * profile, token expiry, id token and OIDC URLs.
           * @param {BellProfileTarget} credentials
           * @param {OAuthTokenParams | AzureB2CTokenParams} params
           * @returns {Promise<void>}
           */
          profile: async function (credentials, params) {
            const payload = await verifyToken(credentials.token ?? '')
            const { oid: id, preferred_username: email, roles = [] } = payload

            credentials.profile = { id, email }
            credentials.expiresAt = getTokenExpiresAt(payload)
            credentials.idToken = params.id_token
            credentials.urls = {
              token: oidcConf.token_endpoint,
              logout: oidcConf.end_session_endpoint
            }
            credentials.scope = roles.includes(REGULATOR_ROLE)
              ? [SCOPES.regulator]
              : []
          }
        },
        providerParams: () => ({
          response_mode: 'query'
        })
      })
    }
  }
})

export { createEntraId }
