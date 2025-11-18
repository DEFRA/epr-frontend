import { createLogger } from '#server/common/helpers/logging/logger.js'
import Jwt from '@hapi/jwt'
import jwkToPem from 'jwk-to-pem'
import fetch from 'node-fetch'

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
  try {
    const res = await fetch(url)
    const { keys } = await res.json()

    const pem = jwkToPem(keys[0])

    /**
     * @type {VerifyToken}
     */
    return (token) => {
      const decoded = Jwt.token.decode(token)
      Jwt.token.verify(decoded, { key: pem, algorithm: 'RS256' })

      return decoded
    }
  } catch (error) {
    const logger = createLogger()
    logger.error(error, 'Failed to verify token')

    throw error
  }
}
