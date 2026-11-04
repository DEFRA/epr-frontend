import { getTracingHeaderName } from '#server/common/helpers/request-tracing.js'
import { withTraceId } from '@defra/hapi-tracing'

import { getUserSession } from './get-user-session.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { AuthProvider } from '../types/auth-provider.js'
 */

/**
 * Refresh the session's tokens at the provider that issued them.
 *
 * The session records the token endpoint of its own provider, and the auth
 * provider carries the credentials and the scopes that endpoint expects.
 * @param {HapiRequest} request - Hapi request object
 * @param {AuthProvider} authProvider - The auth provider that issued the session
 * @returns {Promise<Response>}
 */
async function refreshIdToken(request, authProvider) {
  const { ok, value: session } = await getUserSession(request)

  if (!ok) {
    throw new Error('Cannot refresh token: no user session found')
  }

  if (!session.refreshToken) {
    throw new Error('Cannot refresh token: no refresh token found')
  }

  const params = new URLSearchParams({
    ...authProvider.tokenRequestParams,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken
  })

  const response = await fetch(session.urls.token, {
    method: 'post',
    headers: withTraceId(getTracingHeaderName(), {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    }),
    body: params
  })

  request.logger.info({
    message: 'OIDC token endpoint call complete',
    event: {
      action: 'token-refresh-oidc-call',
      outcome: response.ok ? 'success' : 'failure',
      kind: 'event'
    },
    http: {
      response: { status_code: response.status }
    }
  })

  return response
}

export { refreshIdToken }
