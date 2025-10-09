/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * Drop user session from cache
 * @param {Request} request - Hapi request object
 * @returns {Promise<void>}
 */
function dropUserSession(request) {
  return request.server.app.cache.drop(request.state.userSession.sessionId)
}

export { dropUserSession }
