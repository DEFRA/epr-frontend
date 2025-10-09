/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Get user session from cache
 * @param {Request} request - Hapi request object
 * @returns {Promise<object>}
 */
async function getUserSession(request) {
  return request.state?.userSession?.sessionId
    ? await request.server.app.cache.get(request.state.userSession.sessionId)
    : {}
}

export { getUserSession }
