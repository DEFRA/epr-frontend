import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import Iron from '@hapi/iron'
import { addSeconds } from 'date-fns'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/verify-token.js'), () => ({
  getVerifyToken: vi.fn(async () => (token) => jose.decodeJwt(token))
}))

const loggedOutUrl = '/logged-out'

/**
 * Creates a fake JWT token from a payload
 * @param {object} payload - JWT payload
 * @returns {string} Base64url encoded JWT
 */
const createFakeJwt = (payload) => {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url'
  )

  return `${header}.${encodedPayload}.fake-signature`
}

const defaultJwtPayload = {
  aal: '1',
  contactId: 'contact-123',
  correlationId: 'corr-123',
  currentRelationshipId: 'rel-123',
  email: 'test@example.com',
  enrolmentCount: 1,
  enrolmentRequestCount: 0,
  exp: Math.floor(Date.now() / 1000) + 3600,
  firstName: 'Test',
  lastName: 'User',
  loa: '2',
  relationships: ['rel-123'],
  roles: ['role1'],
  serviceId: 'test-service-id',
  sessionId: 'sess-123',
  sub: 'user-123',
  uniqueReference: 'ref-123'
}

describe('#sessionCookie - integration', () => {
  describe('token refresh on expired session', () => {
    /**
     * Helper function to create expired session data for refresh tests
     * @param {string} userId - User identifier
     * @param {string} expiresAt - ISO date string for token expiry
     * @returns {{sessionId: string, sessionData: object}} Session ID and data
     */
    const createExpiredRefreshSessionData = (userId, expiresAt) => ({
      sessionId: `test-session-${userId}`,
      sessionData: {
        profile: {
          id: userId,
          email: `${userId}@example.com`
        },
        expiresAt,
        idToken: `old-id-token-${userId}`,
        refreshToken: `old-refresh-token-${userId}`,
        urls: {
          token: 'http://defra-id.auth/token',
          logout: 'http://defra-id.auth/logout'
        }
      }
    })

    beforeEach(({ server }) => {
      server.route({
        method: 'GET',
        path: '/test-auth',
        options: {
          auth: 'session'
        },
        handler: (request) => ({
          userId: request.auth.credentials.profile.id,
          email: request.auth.credentials.profile.email,
          idToken: request.auth.credentials.idToken
        })
      })
    })

    it('should refresh token in background when token expires within 5 minutes', async ({
      server,
      msw
    }) => {
      msw.use(
        ((jwtPayload) =>
          http.post('http://defra-id.auth/token', async () =>
            HttpResponse.json({
              expires_in: 3600,
              id_token: createFakeJwt(jwtPayload),
              refresh_token: 'new-refresh-token',
              token_type: 'Bearer'
            })
          ))(defaultJwtPayload)
      )

      // Expires in 2 minutes: within the 5-minute background-refresh window but
      // outside the 10-second awaited-refresh window
      const expiredAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-123',
        expiredAt
      )

      sessionData.profile.enrolmentCount = 1
      sessionData.profile.relationships = ['rel-123']
      sessionData.profile.roles = ['role1']

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Request succeeds immediately with the existing session
      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)
      expect(payload.userId).toBe('user-123')

      // Background refresh updates the cache with the new tokens
      await vi.waitFor(async () => {
        const updatedSession = await server.app.cache.get(sessionId)
        expect(updatedSession.refreshToken).toBe('new-refresh-token')
      })

      const updatedSession = await server.app.cache.get(sessionId)
      const newExpiresAt = new Date(updatedSession.expiresAt)
      expect(newExpiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should drop session from cache when background refresh fails', async ({
      server,
      msw
    }) => {
      msw.use(
        http.post('http://defra-id.auth/token', () => {
          return HttpResponse.json(
            {
              error: 'invalid_grant',
              error_description: 'Refresh token expired'
            },
            { status: 400 }
          )
        })
      )

      // Expires in 2 minutes: background-refresh window
      const expiredAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-456',
        expiredAt
      )

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Request succeeds immediately; failed refresh is handled in the background
      expect(response.statusCode).toBe(statusCodes.ok)

      // Background refresh fails and drops the cache entry
      await vi.waitFor(async () => {
        const removedSession = await server.app.cache.get(sessionId)
        expect(removedSession).toBeNull()
      })
    })

    it('should not refresh when token is still valid (expires beyond 5 minutes)', async ({
      server
    }) => {
      const sessionId = 'test-session-789'
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      const sessionData = {
        profile: {
          id: 'user-789',
          email: 'test3@example.com'
        },
        expiresAt: futureExpiry,
        idToken: 'valid-id-token',
        refreshToken: 'valid-refresh-token',
        urls: {
          token: 'http://defra-id.auth/token',
          logout: 'http://defra-id.auth/logout'
        }
      }

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      expect(payload.idToken).toBe('valid-id-token')

      const unchangedSession = await server.app.cache.get(sessionId)

      expect(unchangedSession.idToken).toBe('valid-id-token')
      expect(unchangedSession.refreshToken).toBe('valid-refresh-token')
    })

    it('should return invalid when session not found in cache', async ({
      server
    }) => {
      const nonExistentSessionId = 'non-existent-session-id'

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId: nonExistentSessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)
    })

    it('should skip session update with refreshed id token when session is removed during background refresh', async ({
      server,
      msw
    }) => {
      // Expires in 2 minutes: background-refresh window
      const expiredAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-concurrent-logout',
        expiredAt
      )

      await server.app.cache.set(sessionId, sessionData)

      msw.use(
        http.post('http://defra-id.auth/token', async () => {
          // Simulate the session being removed concurrently (e.g. logout) while
          // the token refresh HTTP call is in-flight
          await server.app.cache.drop(sessionId)
          return HttpResponse.json({
            expires_in: 3600,
            id_token: createFakeJwt(defaultJwtPayload),
            refresh_token: 'concurrent-logout-token',
            token_type: 'Bearer'
          })
        })
      )

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Initial request succeeds with the existing session
      expect(response.statusCode).toBe(statusCodes.ok)

      // Background refresh finds the session gone and returns early without
      // calling updateUserSession; the cache entry should remain absent
      await vi.waitFor(async () => {
        const session = await server.app.cache.get(sessionId)
        expect(session).toBeNull()
      })
    })

    it('should drop session from cache when background token refresh throws exception', async ({
      server,
      msw
    }) => {
      msw.use(
        http.post('http://defra-id.auth/token', () => {
          return HttpResponse.error()
        })
      )

      const sessionId = 'test-session-exception'
      // Expires in 2 minutes: background-refresh window
      const expiredAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()

      const sessionData = {
        profile: {
          id: 'user-exception',
          email: 'exception@example.com'
        },
        expiresAt: expiredAt,
        idToken: 'old-id-token',
        refreshToken: 'old-refresh-token',
        urls: {
          token: 'http://defra-id.auth/token',
          logout: 'http://defra-id.auth/logout'
        }
      }

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Request succeeds immediately; the exception is handled in the background
      expect(response.statusCode).toBe(statusCodes.ok)

      // Background refresh throws and drops the user session
      await vi.waitFor(async () => {
        const cachedSession = await server.app.cache.get(sessionId)
        expect(cachedSession).toBeNull()
      })
    })

    it('should await refresh and update session before response when token expires within 10 seconds', async ({
      server,
      msw
    }) => {
      msw.use(
        ((jwtPayload) =>
          http.post('http://defra-id.auth/token', async () =>
            HttpResponse.json({
              expires_in: 3600,
              id_token: createFakeJwt(jwtPayload),
              refresh_token: 'awaited-new-refresh-token',
              token_type: 'Bearer'
            })
          ))(defaultJwtPayload)
      )

      // Expires in 5 seconds: within the 10-second awaited-refresh window
      const expiresAt = addSeconds(new Date(), 5).toISOString()
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-awaited',
        expiresAt
      )

      sessionData.profile.enrolmentCount = 1
      sessionData.profile.relationships = ['rel-123']
      sessionData.profile.roles = ['role1']

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      expect(response.statusCode).toBe(statusCodes.ok)

      // Session must be updated synchronously (no vi.waitFor needed)
      const updatedSession = await server.app.cache.get(sessionId)
      expect(updatedSession.refreshToken).toBe('awaited-new-refresh-token')
      const newExpiresAt = new Date(updatedSession.expiresAt)
      expect(newExpiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should drop session synchronously when awaited refresh fails for token expiring within 10 seconds', async ({
      server,
      msw
    }) => {
      msw.use(
        http.post('http://defra-id.auth/token', () =>
          HttpResponse.json(
            {
              error: 'invalid_grant',
              error_description: 'Refresh token expired'
            },
            { status: 400 }
          )
        )
      )

      // Expires in 5 seconds: within the 10-second awaited-refresh window
      const expiresAt = addSeconds(new Date(), 5).toISOString()
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-awaited-fail',
        expiresAt
      )

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Request still succeeds with the existing (nearly-expired) session
      expect(response.statusCode).toBe(statusCodes.ok)

      // Session must be removed synchronously (no vi.waitFor needed)
      const removedSession = await server.app.cache.get(sessionId)
      expect(removedSession).toBeNull()
    })

    it('should skip refresh when idTokenRefreshInProgress is already set', async ({
      server
    }) => {
      // Expires in 5 seconds: would normally trigger an awaited refresh
      const expiresAt = addSeconds(new Date(), 5).toISOString()
      const sessionId = 'test-session-in-progress'

      const sessionData = {
        profile: { id: 'user-in-progress', email: 'inprogress@example.com' },
        expiresAt,
        idToken: 'old-id-token-in-progress',
        refreshToken: 'old-refresh-token-in-progress',
        idTokenRefreshInProgress: true,
        urls: {
          token: 'http://defra-id.auth/token',
          logout: 'http://defra-id.auth/logout'
        }
      }

      await server.app.cache.set(sessionId, sessionData)

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      expect(response.statusCode).toBe(statusCodes.ok)

      // Session must be unchanged: refresh was skipped because it was already in progress
      const unchangedSession = await server.app.cache.get(sessionId)
      expect(unchangedSession.idToken).toBe('old-id-token-in-progress')
      expect(unchangedSession.refreshToken).toBe(
        'old-refresh-token-in-progress'
      )
    })
  })
})
