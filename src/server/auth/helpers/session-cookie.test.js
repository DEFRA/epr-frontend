import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import Iron from '@hapi/iron'
import { subMinutes } from 'date-fns'
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
          email: `${userId}@example.com`,
          displayName: 'Test User',
          correlationId: `corr-${userId}`,
          sessionId: `sess-${userId}`,
          contactId: `contact-${userId}`,
          serviceId: 'test-service-id',
          firstName: 'Test',
          lastName: 'User',
          uniqueReference: `ref-${userId}`,
          loa: '2',
          aal: '1',
          enrolmentCount: 0,
          enrolmentRequestCount: 0,
          currentRelationshipId: `rel-${userId}`,
          relationships: [],
          roles: []
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

    it('should refresh token and continue when token is expired', async ({
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

      const expiredAt = subMinutes(new Date(), 30).toISOString()
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

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      expect(payload.userId).toBe('user-123')

      const token = jose.decodeJwt(payload.idToken)

      expect(token).toStrictEqual(
        expect.objectContaining({
          sub: 'user-123',
          email: 'test@example.com',
          serviceId: 'test-service-id'
        })
      )

      const updatedSession = await server.app.cache.get(sessionId)

      expect(updatedSession.refreshToken).toBe('new-refresh-token')

      const newExpiresAt = new Date(updatedSession.expiresAt)

      expect(newExpiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should remove session when refresh fails', async ({ server, msw }) => {
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

      const expiredAt = subMinutes(new Date(), 2).toISOString()
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

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)

      const removedSession = await server.app.cache.get(sessionId)

      expect(removedSession).toBeNull()
    })

    it('should not refresh when token is still valid', async ({ server }) => {
      const sessionId = 'test-session-789'
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      const sessionData = {
        profile: {
          id: 'user-789',
          email: 'test3@example.com',
          displayName: 'Test User 3',
          correlationId: 'corr-789',
          sessionId: 'sess-789',
          contactId: 'contact-789',
          serviceId: 'test-service-id',
          firstName: 'Test',
          lastName: 'User',
          uniqueReference: 'ref-789',
          loa: '2',
          aal: '1',
          enrolmentCount: 1,
          enrolmentRequestCount: 0,
          currentRelationshipId: 'rel-789',
          relationships: ['rel-789'],
          roles: ['role1']
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

    it.for([
      {
        testCase: 'only first name',
        firstName: 'Jane',
        lastName: null,
        expectedDisplayName: 'Jane'
      },
      {
        testCase: 'only last name',
        firstName: null,
        lastName: 'Smith',
        expectedDisplayName: 'Smith'
      }
    ])(
      'should handle token refresh with user having $testCase',
      async ({ firstName, lastName, expectedDisplayName }, { server, msw }) => {
        const sessionId = `test-session-${expectedDisplayName.toLowerCase()}`
        const expiredAt = subMinutes(new Date(), 30).toISOString()

        const sessionData = {
          profile: {
            id: 'user-name-test',
            email: 'test@example.com',
            displayName: expectedDisplayName,
            correlationId: 'corr-test',
            sessionId: 'sess-test',
            contactId: 'contact-test',
            serviceId: 'test-service-id',
            firstName,
            lastName,
            uniqueReference: 'ref-test',
            loa: '1',
            aal: '1',
            enrolmentCount: 0,
            enrolmentRequestCount: 0,
            currentRelationshipId: 'rel-test',
            relationships: [],
            roles: []
          },
          expiresAt: expiredAt,
          idToken: 'old-id',
          refreshToken: 'old-refresh',
          urls: {
            token: 'http://defra-id.auth/token',
            logout: 'http://defra-id.auth/logout'
          }
        }

        await server.app.cache.set(sessionId, sessionData)

        msw.use(
          ((jwtPayload) =>
            http.post('http://defra-id.auth/token', async () =>
              HttpResponse.json({
                expires_in: 3600,
                id_token: createFakeJwt(jwtPayload),
                refresh_token: 'new-refresh-token',
                token_type: 'Bearer'
              })
            ))({
            sub: 'user-name-test',
            email: 'test@example.com',
            correlationId: 'corr-test',
            sessionId: 'sess-test',
            contactId: 'contact-test',
            serviceId: 'test-service-id',
            firstName,
            lastName,
            uniqueReference: 'ref-test',
            loa: '1',
            aal: '1',
            enrolmentCount: 0,
            enrolmentRequestCount: 0,
            currentRelationshipId: 'rel-test',
            relationships: [],
            roles: [],
            exp: Math.floor(Date.now() / 1000) + 3600
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

        expect(response.statusCode).toBe(200)

        const updatedSession = await server.app.cache.get(sessionId)

        expect(updatedSession.profile.displayName).toBe(expectedDisplayName)
        expect(updatedSession.profile.firstName).toBe(firstName)
        expect(updatedSession.profile.lastName).toBe(lastName)
      }
    )

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

    it('should return invalid and log error when token refresh throws exception', async ({
      server,
      msw
    }) => {
      msw.use(
        http.post('http://defra-id.auth/token', () => {
          return HttpResponse.error()
        })
      )

      const sessionId = 'test-session-exception'
      const expiredAt = subMinutes(new Date(), 2).toISOString()

      const sessionData = {
        profile: {
          id: 'user-exception',
          email: 'exception@example.com',
          displayName: 'Exception User',
          correlationId: 'corr-exception',
          sessionId: 'sess-exception',
          contactId: 'contact-exception',
          serviceId: 'test-service-id',
          firstName: 'Exception',
          lastName: 'User',
          uniqueReference: 'ref-exception',
          loa: '2',
          aal: '1',
          enrolmentCount: 0,
          enrolmentRequestCount: 0,
          currentRelationshipId: 'rel-exception',
          relationships: [],
          roles: []
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

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)

      const cachedSession = await server.app.cache.get(sessionId)

      expect(cachedSession).toBeNull()
    })
  })
})
