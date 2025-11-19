import fetch from 'node-fetch'

/**
 * @typedef {object} OidcConfig
 * @property {string} authorization_endpoint
 * @property {string} token_endpoint
 * @property {string} end_session_endpoint
 * @property {string} jwks_uri - JSON Web Key Set (JWKS) endpoint
 */

/**
 * Get OIDC configuration from url
 * @param {string} url - OIDC configuration url
 * @returns {Promise<OidcConfig>}
 */
export const getOidcConfiguration = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`OIDC config fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}
