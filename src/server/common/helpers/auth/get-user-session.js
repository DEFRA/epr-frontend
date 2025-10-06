/**
 * Get user session from cache
 * @returns {Promise<object>}
 */
async function getUserSession() {
  return this.state?.userSession?.sessionId
    ? await this.server.app.cache.get(this.state.userSession.sessionId)
    : {}
}

export { getUserSession }
