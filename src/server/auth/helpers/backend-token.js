import { OIDC_ENTRA_ID } from '../plugins/entra-id.js'

/**
 * @import { RefreshedTokens } from './refreshed-tokens-schema.js'
 */

/**
 * Selects the token a session presents to the backend from a refreshed token
 * response.
 *
 * An Entra ID session presents the access token, because the `roles` claim the
 * backend resolves a regulator from arrives there and not on the id token. A
 * Defra ID session presents the id token.
 * @param {string} provider - OIDC provider that issued the session
 * @param {RefreshedTokens} refreshedTokens - Refreshed tokens from the provider
 * @returns {string}
 */
const selectBackendToken = (provider, refreshedTokens) => {
  if (provider !== OIDC_ENTRA_ID) {
    return refreshedTokens.id_token
  }

  if (!refreshedTokens.access_token) {
    throw new Error('Entra ID refresh returned no access token')
  }

  return refreshedTokens.access_token
}

export { selectBackendToken }
