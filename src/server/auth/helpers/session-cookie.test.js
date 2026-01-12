import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import Iron from '@hapi/iron'
import { subMinutes } from 'date-fns'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

// Mock getVerifyToken to return a simple decoder that returns just the payload
vi.mock(import('#server/auth/helpers/verify-token.js'), () => ({
  getVerifyToken: vi.fn(async () => (token) => jose.decodeJwt(token))
}))

const loggedOutUrl = '/logged-out'

describe('#sessionCookie - integration', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server
  let mockOidcServer
  let defaultTokenHandler

  beforeAll(async () => {
    // Setup OIDC mock server
    mockOidcServer = createMockOidcServer('http://defra-id.auth')

    // Create and store the default token refresh handler
    defaultTokenHandler = http.post(
      'http://defra-id.auth/token',
      async ({ request }) => {
        const body = await request.text()
        const params = new URLSearchParams(body)

        if (params.get('grant_type') === 'refresh_token') {
          // Create a valid JWT structure (header.payload.signature)
          // We're using a fake but properly formatted JWT
          const mockJwtPayload = {
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

          // Create a fake JWT (base64 encoded header.payload.signature)
          const header = Buffer.from(
            JSON.stringify({ alg: 'RS256', typ: 'JWT' })
          ).toString('base64url')
          const payload = Buffer.from(JSON.stringify(mockJwtPayload)).toString(
            'base64url'
          )
          const signature = 'fake-signature'
          const mockIdToken = `${header}.${payload}.${signature}`

          return HttpResponse.json({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            id_token: mockIdToken,
            expires_in: 3600,
            token_type: 'Bearer'
          })
        }

        return HttpResponse.json({ error: 'invalid_grant' }, { status: 400 })
      }
    )

    // Add the handler to the server
    mockOidcServer.use(defaultTokenHandler)

    mockOidcServer.listen()

    // Configure auth
    config.load({
      defraId: {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        oidcConfigurationUrl:
          'http://defra-id.auth/.well-known/openid-configuration',
        serviceId: 'test-service-id'
      }
    })

    // Create and initialize server
    server = await createServer()
    await server.initialize()
  })

  afterEach(() => {
    mockOidcServer.resetHandlers(defaultTokenHandler)
  })

  afterAll(async () => {
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

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

    beforeAll(() => {
      // Add a test route that requires authentication
      server.route({
        method: 'GET',
        path: '/test-auth',
        options: {
          auth: 'session'
        },
        handler: (request) => {
          return {
            userId: request.auth.credentials.profile.id,
            email: request.auth.credentials.profile.email,
            idToken: request.auth.credentials.idToken
          }
        }
      })
    })

    it('should refresh token and continue when token is expired', async () => {
      const expiredAt = subMinutes(new Date(), 30).toISOString() // 30 mins ago, definitely expired
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-123',
        expiredAt
      )

      // Override some fields for this specific test
      sessionData.profile.enrolmentCount = 1
      sessionData.profile.relationships = ['rel-123']
      sessionData.profile.roles = ['role1']

      // Set session in cache
      await server.app.cache.set(sessionId, sessionData)

      // Create a properly sealed cookie using Iron
      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      // Make an authenticated request with the cookie - this will trigger the validate function
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

      // Decode the new token and verify its contents
      const token = jose.decodeJwt(payload.idToken)

      expect(token).toStrictEqual(
        expect.objectContaining({
          sub: 'user-123',
          email: 'test@example.com',
          serviceId: 'test-service-id'
        })
      )

      // Verify session was updated in cache
      const updatedSession = await server.app.cache.get(sessionId)

      expect(updatedSession.refreshToken).toBe('new-refresh-token')

      // expiresAt should be updated to a future time
      const newExpiresAt = new Date(updatedSession.expiresAt)

      expect(newExpiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should remove session when refresh fails', async () => {
      // Setup a mock that returns an error for token refresh
      mockOidcServer.use(
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

      // Create a properly sealed cookie using Iron
      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      // Make an authenticated request with the cookie
      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Should redirect to logged-out when refresh fails
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)

      // Session should be removed from cache
      const removedSession = await server.app.cache.get(sessionId)

      expect(removedSession).toBeNull()
    })

    it('should not refresh when token is still valid', async () => {
      const sessionId = 'test-session-789'
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes in future

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

      // Create a properly sealed cookie using Iron
      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      // Make an authenticated request with the cookie
      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      // Should still have the original valid token
      expect(payload.idToken).toBe('valid-id-token')

      // Session should remain unchanged
      const unchangedSession = await server.app.cache.get(sessionId)

      expect(unchangedSession.idToken).toBe('valid-id-token')
      expect(unchangedSession.refreshToken).toBe('valid-refresh-token')
    })

    it.each([
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
      async ({ firstName, lastName, expectedDisplayName }) => {
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

        // Override the mock to return JWT with the specified name fields
        mockOidcServer.use(
          http.post('http://defra-id.auth/token', async ({ request }) => {
            const body = await request.text()
            const params = new URLSearchParams(body)

            if (params.get('grant_type') === 'refresh_token') {
              const mockJwtPayload = {
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
              }

              const header = Buffer.from(
                JSON.stringify({ alg: 'RS256', typ: 'JWT' })
              ).toString('base64url')
              const payload = Buffer.from(
                JSON.stringify(mockJwtPayload)
              ).toString('base64url')
              const signature = 'fake-signature'
              const mockIdToken = `${header}.${payload}.${signature}`

              return HttpResponse.json({
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token',
                id_token: mockIdToken,
                expires_in: 3600,
                token_type: 'Bearer'
              })
            }

            return HttpResponse.json(
              { error: 'invalid_grant' },
              { status: 400 }
            )
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

        // Check that displayName is correct based on available name fields
        const updatedSession = await server.app.cache.get(sessionId)

        expect(updatedSession.profile.displayName).toBe(expectedDisplayName)
        expect(updatedSession.profile.firstName).toBe(firstName)
        expect(updatedSession.profile.lastName).toBe(lastName)
      }
    )

    it('should return invalid when session not found in cache', async () => {
      // Create a cookie with a sessionId that doesn't exist in cache
      const nonExistentSessionId = 'non-existent-session-id'

      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId: nonExistentSessionId },
        cookiePassword,
        Iron.defaults
      )

      // Make an authenticated request with the cookie
      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Should redirect to logged-out when session not found
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)
    })

    it('should return invalid and log error when token refresh throws exception', async () => {
      // Setup a mock that simulates a network error
      mockOidcServer.use(
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

      // Create a properly sealed cookie using Iron
      const cookiePassword = config.get('session.cookie.password')
      const sealedCookie = await Iron.seal(
        { sessionId },
        cookiePassword,
        Iron.defaults
      )

      // Make an authenticated request with the cookie
      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: `userSession=${sealedCookie}`
        }
      })

      // Should redirect to logged-out when refresh throws exception
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)

      // Verify session is cleaned up
      const cachedSession = await server.app.cache.get(sessionId)

      expect(cachedSession).toBeNull()
    })

    it('should return invalid when session is deleted during validation (race condition)', async () => {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes in future
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-race',
        futureExpiry
      )

      await server.app.cache.set(sessionId, sessionData)

      // Mock cache.get to return null on the second call (simulating race condition)
      const originalGet = server.app.cache.get
      let callCount = 0
      server.app.cache.get = async (key) => {
        callCount++
        // First call (in getUserSession) returns the session
        if (callCount === 1) {
          return originalGet.call(server.app.cache, key)
        }
        // Second call (after refresh check) returns null (simulating deletion)
        return null
      }

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

      // Should redirect to logged-out when session is deleted during validation
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(loggedOutUrl)

      // Restore original cache.get
      server.app.cache.get = originalGet
    })
  })
})
