/**
 * Drop user session from cache
 * @returns {Promise<void>}
 */
function dropUserSession() {
  return this.server.app.cache.drop(this.state.userSession.sessionId)
}

export { dropUserSession }
