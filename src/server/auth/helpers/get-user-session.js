/**
 * @import { Request } from '@hapi/hapi'
 */

/**
 * @typedef {object} UserSession
 * @property {string} displayName
 * @property {string} email
 * @property {string} expiresAt
 * @property {boolean} isAuthenticated
 * @property {string} refreshToken
 * @property {string[]} relationships
 * @property {string} token
 * @property {string} userId
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
