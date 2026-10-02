/**
 * @import { AuthProvider, AuthProviders } from '../types/auth-provider.js'
 */

/**
 * Find the auth provider that issued a session.
 *
 * Entra ID is registered only when regulator access is on, so an Entra ID
 * session with the flag off finds nothing and throws. The refresh path treats
 * that as a failed refresh and signs the user out, which is what happens to a
 * regulator today when the flag goes off under them.
 * @param {AuthProviders} authProviders - The auth providers this server holds
 * @param {string} provider - The provider the session records
 * @returns {AuthProvider}
 */
export const selectAuthProvider = (authProviders, provider) => {
  const authProvider = authProviders[provider]

  if (!authProvider) {
    throw new Error(`Cannot refresh token: no auth provider for '${provider}'`)
  }

  return authProvider
}
