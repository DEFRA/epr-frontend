import Wreck from '@hapi/wreck'

/**
 * @typedef {object} OidcConfig
 * @property {string} authorization_endpoint
 * @property {string} token_endpoint
 * @property {string} end_session_endpoint
 * @property {string} jwks_uri - JSON Web Key Set (JWKS) endpoint
 */

// Uses Wreck deliberately — this shares the same proxy code path as
// @hapi/bell's OAuth token exchange (Wreck → private https.Agent →
// global-agent). Fetching at startup makes this a canary: if the proxy
// is misconfigured, the server fails to start rather than starting in a
// silently broken state where users cannot log in.

/**
 * Get OIDC configuration from url
 * @param {string} url - OIDC configuration url
 * @returns {Promise<OidcConfig>}
 */
export const getOidcConfiguration = async (url) => {
  const { payload } = await Wreck.get(url, { json: true })
  return payload
}
