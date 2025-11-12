/**
 * Get user session from cache
 * @param {Request} request - Hapi request object
 * @returns {Promise<UserSession>}
 */
async function getUserSession(request) {
  return request.state?.userSession?.sessionId
    ? await request.server.app.cache.get(request.state.userSession.sessionId)
    : {}
}

export { getUserSession }

/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * @typedef {object} UserSession
 * @property {boolean} isAuthenticated
 * @property {string} displayName
 * @property {string} email
 * @property {string} expiresAt
 * @property {string} refreshToken
 * @property {string[]} relationships
 * @property {string} token
 * @property {string} userId
 */
