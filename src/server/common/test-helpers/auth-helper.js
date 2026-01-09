import { config } from '#config/config.js'
import Iron from '@hapi/iron'

/**
 * Create a default user session object with all required fields
 * @param {object} [overrides] - Optional field overrides
 * @returns {object} Complete user session object
 */
export const createMockUserSession = (overrides = {}) => {
  const now = Date.now()

  return {
    id: 'test-user',
    email: 'test@example.com',
    displayName: 'Test User',
    token: 'test-access-token',
    refreshToken: 'test-refresh-token',
    idToken: 'test-id-token',
    expiresAt: new Date(now + 3600000).toISOString(),
    expiresIn: 3600000,
    isAuthenticated: true,
    correlationId: 'test-corr',
    sessionId: 'test-sess',
    contactId: 'test-contact',
    serviceId: 'test-service',
    firstName: 'Test',
    lastName: 'User',
    uniqueReference: 'test-ref',
    loa: '2',
    aal: '1',
    enrolmentCount: 1,
    enrolmentRequestCount: 0,
    currentRelationshipId: 'test-rel',
    relationships: ['rel-1'],
    roles: ['role1'],
    tokenUrl: 'http://defra-id.auth/token',
    logoutUrl: 'http://defra-id.auth/logout',
    idTokenExpiresAt: now + 3600000,
    idTokenNotBefore: now - 60000,
    ...overrides
  }
}

/**
 * Create an auth session helper for a server instance
 * @param {import('@hapi/hapi').Server} server - Hapi server instance
 * @returns {object} Auth session helper functions
 */
export const createAuthSessionHelper = (server) => {
  let authCookie = null

  /**
   * Create and seal an auth session cookie
   * @param {object} [sessionData] - Session data to store (defaults to mock session)
   * @param {string} [sessionId] - Optional session ID (defaults to 'test-session-id')
   * @returns {Promise<string>} Sealed cookie value
   */
  const createAuthCookie = async (
    sessionData,
    sessionId = 'test-session-id'
  ) => {
    const data = sessionData || createMockUserSession()
    await server.app.cache.set(sessionId, data)
    const cookiePassword = config.get('session.cookie.password')
    authCookie = await Iron.seal({ sessionId }, cookiePassword, Iron.defaults)
    return authCookie
  }

  /**
   * Setup getUserSession mock with complete session data
   * @param {object} mockGetUserSession - Mocked getUserSession module
   * @param {object} [sessionOverrides] - Optional session field overrides
   */
  const mockGetUserSession = (mockGetUserSession, sessionOverrides = {}) => {
    const session = createMockUserSession(sessionOverrides)

    mockGetUserSession.mockResolvedValue({
      ok: true,
      value: session
    })
  }

  /**
   * Get the current auth cookie value
   * @returns {string|null} The sealed cookie value or null if not created
   */
  const getAuthCookie = () => authCookie

  /**
   * Inject a request with auth headers automatically added
   * @param {object} options - Hapi inject options
   * @returns {Promise} Response from server.inject
   */
  const injectWithAuth = async (options) => {
    if (!authCookie) {
      throw new Error(
        'Auth cookie not created. Call createAuthCookie() first in beforeAll.'
      )
    }

    const headers = {
      ...options.headers,
      cookie: options.headers?.cookie
        ? `${options.headers.cookie}; userSession=${authCookie}`
        : `userSession=${authCookie}`
    }

    return server.inject({
      ...options,
      headers
    })
  }

  return {
    createAuthCookie,
    mockGetUserSession,
    getAuthCookie,
    injectWithAuth
  }
}

/**
 * Get common auth headers for server.inject requests
 * @param {string} authCookie - The sealed auth cookie value
 * @returns {object} Headers object with cookie
 */
export const getAuthHeaders = (authCookie) => ({
  cookie: `userSession=${authCookie}`
})
