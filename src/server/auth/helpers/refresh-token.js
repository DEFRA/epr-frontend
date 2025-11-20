import fetch from 'node-fetch'
import { config } from '#config/config.js'
import { getUserSession } from './get-user-session.js'

/**
 * Refresh access token using refresh token
 * @param {Request} request - Hapi request object
 * @returns {Promise<Response>}
 */
async function refreshAccessToken(request) {
  const { ok, value: authedUser } = await getUserSession(request)

  if (!ok) {
    throw new Error('Cannot refresh token: no user session found')
  }

  const refreshToken = authedUser.refreshToken ?? null
  const clientId = config.get('defraId.clientId')
  const clientSecret = config.get('defraId.clientSecret')

  const params = new URLSearchParams()

  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('grant_type', 'refresh_token')
  params.append('refresh_token', refreshToken)
  params.append('scope', `${clientId} openid profile email offline_access`)

  request.logger.info('Access token expired, refreshing...')

  return fetch(authedUser.tokenUrl, {
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
 */
