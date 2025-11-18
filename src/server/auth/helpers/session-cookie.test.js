import { config } from '#config/config.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import Iron from '@hapi/iron'
import jwt from '@hapi/jwt'
import { subMinutes } from 'date-fns'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('#sessionCookie - integration', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server
  let mockOidcServer

  beforeAll(async () => {
    // Setup OIDC mock server
    mockOidcServer = createMockOidcServer('http://defra-id.auth')

    // Add token refresh endpoint
    mockOidcServer.use(
      http.post('http://defra-id.auth/token', async ({ request }) => {
        const body = await request.text()
        const params = new URLSearchParams(body)

        if (params.get('grant_type') === 'refresh_token') {
          // Create a valid JWT structure (header.payload.signature)
          // We're using a fake but properly formatted JWT
          const mockJwtPayload = {
            sub: 'user-123',
            email: 'test@example.com',
            correlationId: 'corr-123',
            sessionId: 'sess-123',
            contactId: 'contact-123',
            serviceId: 'test-service-id',
            firstName: 'Test',
            lastName: 'User',
            uniqueReference: 'ref-123',
            loa: '2',
            aal: '1',
            enrolmentCount: 1,
            enrolmentRequestCount: 0,
            currentRelationshipId: 'rel-123',
            relationships: ['rel-123'],
            roles: ['role1']
          }

          // Create a fake JWT (base64 encoded header.payload.signature)
          const header = Buffer.from(
            JSON.stringify({ alg: 'RS256', typ: 'JWT' })
          ).toString('base64url')
          const payload = Buffer.from(JSON.stringify(mockJwtPayload)).toString(
            'base64url'
          )
          const signature = 'fake-signature'
          const mockAccessToken = `${header}.${payload}.${signature}`
          const mockIdToken = `${header}.${payload}.${signature}` // Same structure as access token

          return HttpResponse.json({
            access_token: mockAccessToken,
            refresh_token: 'new-refresh-token',
            id_token: mockIdToken,
            expires_in: 3600,
            token_type: 'Bearer'
          })
        }

        return HttpResponse.json({ error: 'invalid_grant' }, { status: 400 })
      })
    )

    mockOidcServer.listen({ onUnhandledRequest: 'bypass' })

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

    // Mock verifyToken to simply decode without verifying signature
    // This allows tests to use fake JWTs without needing valid signatures
    server.app.verifyToken = (token) => {
      return jwt.token.decode(token)
    }
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
        id: userId,
        email: `${userId}@example.com`,
        displayName: 'Test User',
        token: `old-access-token-${userId}`,
        refreshToken: `old-refresh-token-${userId}`,
        idToken: `old-id-token-${userId}`,
        expiresAt,
        expiresIn: 3600000,
        isAuthenticated: true,
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
        roles: [],
        tokenUrl: 'http://defra-id.auth/token',
        logoutUrl: 'http://defra-id.auth/logout'
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
            userId: request.auth.credentials.id,
            email: request.auth.credentials.email,
            token: request.auth.credentials.token
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
      sessionData.enrolmentCount = 1
      sessionData.relationships = ['rel-123']
      sessionData.roles = ['role1']

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
      const token = jwt.token.decode(payload.token).decoded.payload

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

      // Should return 401 when refresh fails
      expect(response.statusCode).toBe(401)

      // Session should be removed from cache
      const removedSession = await server.app.cache.get(sessionId)

      expect(removedSession).toBeNull()

      // Reset mock for other tests
      mockOidcServer.resetHandlers()
    })

    it('should not refresh when token is still valid', async () => {
      const sessionId = 'test-session-789'
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes in future

      const sessionData = {
        id: 'user-789',
        email: 'test3@example.com',
        displayName: 'Test User 3',
        token: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        idToken: 'valid-id-token',
        expiresAt: futureExpiry,
        expiresIn: 3600000,
        isAuthenticated: true,
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
        roles: ['role1'],
        tokenUrl: 'http://defra-id.auth/token',
        logoutUrl: 'http://defra-id.auth/logout'
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
      expect(payload.token).toBe('valid-access-token')

      // Session should remain unchanged
      const unchangedSession = await server.app.cache.get(sessionId)

      expect(unchangedSession.token).toBe('valid-access-token')
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
          id: 'user-name-test',
          email: 'test@example.com',
          displayName: expectedDisplayName,
          token: 'old-token',
          refreshToken: 'old-refresh',
          idToken: 'old-id',
          expiresAt: expiredAt,
          expiresIn: 3600000,
          isAuthenticated: true,
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
          tokenUrl: 'http://defra-id.auth/token',
          logoutUrl: 'http://defra-id.auth/logout'
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
                roles: []
              }

              const header = Buffer.from(
                JSON.stringify({ alg: 'RS256', typ: 'JWT' })
              ).toString('base64url')
              const payload = Buffer.from(
                JSON.stringify(mockJwtPayload)
              ).toString('base64url')
              const signature = 'fake-signature'
              const mockAccessToken = `${header}.${payload}.${signature}`
              const mockIdToken = `${header}.${payload}.${signature}` // Same structure as access token

              return HttpResponse.json({
                access_token: mockAccessToken,
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

        expect(updatedSession.displayName).toBe(expectedDisplayName)
        expect(updatedSession.firstName).toBe(firstName)
        expect(updatedSession.lastName).toBe(lastName)

        // Reset mock for other tests
        mockOidcServer.resetHandlers()
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

      // Should return 401 when session not found
      expect(response.statusCode).toBe(401)
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
        id: 'user-exception',
        email: 'exception@example.com',
        displayName: 'Exception User',
        token: 'old-access-token',
        refreshToken: 'old-refresh-token',
        idToken: 'old-id-token',
        expiresAt: expiredAt,
        expiresIn: 3600000,
        isAuthenticated: true,
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
        roles: [],
        tokenUrl: 'http://defra-id.auth/token',
        logoutUrl: 'http://defra-id.auth/logout'
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

      // Should return 401 when refresh throws exception
      expect(response.statusCode).toBe(401)

      // Verify session is cleaned up
      const cachedSession = await server.app.cache.get(sessionId)

      expect(cachedSession).toBeNull()

      // Reset mock for other tests
      mockOidcServer.resetHandlers()
    })

    it('should return invalid when session is deleted during validation (race condition)', async () => {
      const expiredAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes in future
      const { sessionId, sessionData } = createExpiredRefreshSessionData(
        'user-race',
        expiredAt
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

      // Should return 401 when session is deleted during validation
      expect(response.statusCode).toBe(401)

      // Restore original cache.get
      server.app.cache.get = originalGet
    })
  })
})
