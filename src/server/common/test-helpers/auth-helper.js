import { config } from '#config/config.js'
import Iron from '@hapi/iron'
import { randomUUID } from 'node:crypto'

/**
 * @import { ServerInjectOptions } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */

/**
 * Create a default user session object with all required fields
 * @param {object} [overrides] - Optional field overrides
 * @param {object} [overrides.profile] - Optional profile field overrides
 * @returns {object} Complete user session object
 */
export const createUserSessionData = (overrides = {}) => {
  const now = Date.now()
  const { profile: profileOverrides, ...sessionOverrides } = overrides

  const profile = {
    id: 'test-user',
    email: 'test@example.com',
    displayName: 'Test User',
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
    ...profileOverrides
  }

  const expiresAt = new Date(now + 3600000).toISOString()

  return {
    profile,
    expiresAt,
    idToken: 'test-id-token',
    refreshToken: 'test-refresh-token',
    urls: {
      token: 'http://defra-id.auth/token',
      logout: 'http://defra-id.auth/logout'
    },
    ...sessionOverrides
  }
}

/**
 * Function that takes options for (hapi) server.inject and returns options
 * @typedef {(injectOptions: ServerInjectOptions) => ServerInjectOptions} InjectOptionsDecorator
 */

/**
 * Creates a session in the service with the provided data. Returns a function that
 * decorates options for server.inject by adding an auth cookie (for that session)
 * @param {Server} server
 * @param {{ sessionData: object, sessionId?: string }} params
 * @returns {Promise<InjectOptionsDecorator>}
 */
export async function givenUserSignedInToService(
  server,
  { sessionData, sessionId = randomUUID() }
) {
  await server.app.cache.set(sessionId, sessionData)
  const cookiePassword = config.get('session.cookie.password')
  const authCookie = await Iron.seal(
    { sessionId },
    cookiePassword,
    Iron.defaults
  )

  /**
   * Decorates options for (hapi) server.inject with cookie for auth
   * @param {ServerInjectOptions} options
   * @returns ServerInjectOptions
   */
  const decorateInjectOptionsWithAuth = (options = {}) => {
    const headers = {
      ...options.headers,
      cookie: options.headers?.cookie
        ? `userSession=${authCookie}; ${options.headers.cookie}`
        : `userSession=${authCookie}`
    }

    return {
      ...options,
      headers
    }
  }

  return decorateInjectOptionsWithAuth
}
