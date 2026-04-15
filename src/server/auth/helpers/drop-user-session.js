/**
 * Drop user session from cache
 * @param {HapiRequest} request - Hapi request object
 * @returns {Promise<void>}
 */
async function dropUserSession(request) {
  if (request.state.userSession?.sessionId) {
    await request.server.app.cache.drop(request.state.userSession.sessionId)
  }
}

export { dropUserSession }

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
