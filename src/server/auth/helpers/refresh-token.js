import { config } from '#config/config.js'
import { getTracingHeaderName } from '#server/common/helpers/request-tracing.js'
import { withTraceId } from '@defra/hapi-tracing'

import { getUserSession } from './get-user-session.js'

/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Refresh id token using refresh token
 * @param {Request} request - Hapi request object
 * @returns {Promise<Response>}
 */
async function refreshIdToken(request) {
  const { ok, value: session } = await getUserSession(request)

  if (!ok) {
    throw new Error('Cannot refresh token: no user session found')
  }

  if (!session.refreshToken) {
    throw new Error('Cannot refresh token: no refresh token found')
  }

  const refreshToken = session.refreshToken
  const clientId = config.get('defraId.clientId')
  const clientSecret = config.get('defraId.clientSecret')
  const serviceId = config.get('defraId.serviceId')

  const params = new URLSearchParams()

  params.append('client_id', clientId)
  params.append('client_secret', clientSecret)
  params.append('grant_type', 'refresh_token')
  params.append('refresh_token', refreshToken)
  params.append('scope', 'openid offline_access')
  params.append('serviceId', serviceId)

  const t0 = performance.now()

  const response = await fetch(session.urls.token, {
    method: 'post',
    headers: withTraceId(getTracingHeaderName(), {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    }),
    body: params
  })

  request.logger.info(
    {
      event: {
        action: 'token-refresh-oidc-call',
        outcome: response.ok ? 'success' : 'failure',
        duration: performance.now() - t0,
        kind: 'event'
      },
      http: {
        response: { status_code: response.status }
      }
    },
    'OIDC token endpoint call complete'
  )

  return response
}

export { refreshIdToken }
