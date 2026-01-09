import fetch from 'node-fetch'
import { config } from '#config/config.js'

/**
 * Refresh access token using refresh token
 * @param {Request} request - Hapi request object
 * @param {UserSession} userSession - Current user session
 * @returns {Promise<Response>}
 */
async function refreshAccessToken(request, userSession) {
  const refreshToken = userSession.refreshToken ?? null
  const tokenUrl = userSession.tokenUrl
  const clientId = config.get('defraId.clientId')
  const clientSecret = config.get('defraId.clientSecret')

  const params = new URLSearchParams()

  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('grant_type', 'refresh_token')
  params.append('refresh_token', refreshToken)
  params.append('scope', `${clientId} openid profile email offline_access`)

  request.logger.info({ tokenUrl }, 'Access token expired, refreshing...')

  return fetch(tokenUrl, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    },
    body: params
  })
}

export { refreshAccessToken }

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Response } from 'node-fetch'
 * @import { UserSession } from '../types/session.js'
 */
