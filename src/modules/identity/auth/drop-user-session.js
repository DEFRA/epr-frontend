/**
 * Drop user session from cache
 * @param {Request} request - Hapi request object
 * @returns {Promise<void>}
 */
async function dropUserSession(request) {
  await request.server.app.cache.drop(request.state.userSession.sessionId)
}

export { dropUserSession }

/**
 * @import { Request } from '@hapi/hapi'
 */
