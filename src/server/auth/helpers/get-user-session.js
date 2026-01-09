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
  const sessionId = request.state?.userSession?.sessionId

  if (!sessionId) {
    request.logger.debug('No sessionId in cookie state')
    return err()
  }

  const session = await request.server.app.cache.get(sessionId)

  if (!session) {
    request.logger.info(
      { sessionId },
      'Session not found in cache - may have expired or been cleared'
    )
    return err()
  }

  return ok(session)
}

export { getUserSession }
