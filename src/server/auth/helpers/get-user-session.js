/**
 * @import { Request } from '@hapi/hapi'
 * @import { UserSession } from '../types/session.js'
 */

/**
 * Get user session from cache
 * @param {Request} request - Hapi request object
 * @returns {Promise<Partial<UserSession>>}
 */
async function getUserSession(request) {
  return request.state?.userSession?.sessionId
    ? await request.server.app.cache.get(request.state.userSession.sessionId)
    : {}
}

export { getUserSession }
