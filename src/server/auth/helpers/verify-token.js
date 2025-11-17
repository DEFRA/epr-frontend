import { createLogger } from '#server/common/helpers/logging/logger.js'
import Jwt from '@hapi/jwt'
import jwkToPem from 'jwk-to-pem'
import fetch from 'node-fetch'

export const getVerifyToken = async ({ jwks_uri: url }) => {
  try {
    const res = await fetch(url)
    const { keys } = await res.json()

    const pem = jwkToPem(keys[0])

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
