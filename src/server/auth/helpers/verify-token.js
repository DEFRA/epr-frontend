import * as jose from 'jose'

/**
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Creates a token verification function from OIDC JWKS endpoint
 * @param {object} config - OIDC configuration
 * @param {string} config.jwks_uri - JWKS endpoint URL
 * @returns {Promise<VerifyToken>} Token verification function
 */
export const getVerifyToken = async ({ jwks_uri: url }) => {
  const JWKS = jose.createRemoteJWKSet(new URL(url))

  /**
   * @type {VerifyToken}
   */
  return async (token) => {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      algorithms: ['RS256']
    })

    return payload
  }
}
