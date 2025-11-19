import { err, ok } from '#server/common/helpers/result.js'

/**
 * @import { Request } from '@hapi/hapi'
 * @import { UserSession } from '../types/session.js'
 * @import { Result } from '#server/common/helpers/result.js'
 */

/**
 * Get user session from cache
 * @param {Request} request - Hapi request object
 * @returns {Promise<Result<UserSession>>}
 */
async function getUserSession(request) {
  if (!request.state?.userSession?.sessionId) {
    return err()
  }

  const session = await request.server.app.cache.get(
    request.state.userSession.sessionId
  )

  return session ? ok(session) : err()
}

export { getUserSession }
