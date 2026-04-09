import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { Metrics } from '@defra/cdp-metrics'
import Iron from '@hapi/iron'
import { addSeconds } from 'date-fns'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/verify-token.js'), () => ({
  getVerifyToken: vi.fn(async () => (token) => jose.decodeJwt(token))
}))

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

/**
 * @param {string} userId
 * @param {string} expiresAt
 */
const createExpiredSessionData = (userId, expiresAt) => ({
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

/**
 * @param {string} sessionId
 * @returns {Promise<string>}
 */
const sealCookie = (sessionId) =>
  Iron.seal({ sessionId }, config.get('session.cookie.password'), Iron.defaults)

describe('/auth/refresh - integration', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should refresh token and redirect to returnTo on success', async ({
    server,
    msw
  }) => {
    const timerSpy = vi.spyOn(Metrics.prototype, 'timer')

    msw.use(
      ((jwtPayload) =>
        http.post('http://defra-id.auth/token', async () =>
          HttpResponse.json({
            expires_in: 3600,
            id_token: createFakeJwt(jwtPayload),
            refresh_token: 'refreshed-new-token',
            token_type: 'Bearer'
          })
        ))(defaultJwtPayload)
    )

    const expiresAt = addSeconds(new Date(), 5).toISOString()
    const { sessionId, sessionData } = createExpiredSessionData(
      'user-refresh',
      expiresAt
    )

    sessionData.profile.enrolmentCount = 1
    sessionData.profile.relationships = ['rel-123']
    sessionData.profile.roles = ['role1']

    await server.app.cache.set(sessionId, sessionData)
    const sealedCookie = await sealCookie(sessionId)

    const response = await server.inject({
      method: 'GET',
      url: '/auth/refresh?returnTo=%2Fsome-page',
      headers: {
        cookie: `userSession=${sealedCookie}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/some-page')

    const updatedSession = await server.app.cache.get(sessionId)
    expect(updatedSession.refreshToken).toBe('refreshed-new-token')

    expect(timerSpy).toHaveBeenCalledExactlyOnceWith(
      'tokenRefreshDuration',
      expect.any(Function),
      { type: 'blocking' }
    )
  })

  it('should redirect to /logged-out when refresh fails', async ({
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

    const expiresAt = addSeconds(new Date(), 5).toISOString()
    const { sessionId, sessionData } = createExpiredSessionData(
      'user-refresh-fail',
      expiresAt
    )

    await server.app.cache.set(sessionId, sessionData)
    const sealedCookie = await sealCookie(sessionId)

    const response = await server.inject({
      method: 'GET',
      url: '/auth/refresh?returnTo=%2Fsome-page',
      headers: {
        cookie: `userSession=${sealedCookie}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/logged-out')

    const removedSession = await server.app.cache.get(sessionId)
    expect(removedSession).toBeNull()
  })

  it('should use / as default when returnTo is missing', async ({
    server,
    msw
  }) => {
    msw.use(
      ((jwtPayload) =>
        http.post('http://defra-id.auth/token', async () =>
          HttpResponse.json({
            expires_in: 3600,
            id_token: createFakeJwt(jwtPayload),
            refresh_token: 'refreshed-default',
            token_type: 'Bearer'
          })
        ))(defaultJwtPayload)
    )

    const expiresAt = addSeconds(new Date(), 5).toISOString()
    const { sessionId, sessionData } = createExpiredSessionData(
      'user-no-return',
      expiresAt
    )

    sessionData.profile.enrolmentCount = 1
    sessionData.profile.relationships = ['rel-123']
    sessionData.profile.roles = ['role1']

    await server.app.cache.set(sessionId, sessionData)
    const sealedCookie = await sealCookie(sessionId)

    const response = await server.inject({
      method: 'GET',
      url: '/auth/refresh',
      headers: {
        cookie: `userSession=${sealedCookie}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/')
  })

  it('should reject absolute URL in returnTo', async ({ server, msw }) => {
    msw.use(
      ((jwtPayload) =>
        http.post('http://defra-id.auth/token', async () =>
          HttpResponse.json({
            expires_in: 3600,
            id_token: createFakeJwt(jwtPayload),
            refresh_token: 'refreshed-safe',
            token_type: 'Bearer'
          })
        ))(defaultJwtPayload)
    )

    const expiresAt = addSeconds(new Date(), 5).toISOString()
    const { sessionId, sessionData } = createExpiredSessionData(
      'user-open-redirect',
      expiresAt
    )

    sessionData.profile.enrolmentCount = 1
    sessionData.profile.relationships = ['rel-123']
    sessionData.profile.roles = ['role1']

    await server.app.cache.set(sessionId, sessionData)
    const sealedCookie = await sealCookie(sessionId)

    const response = await server.inject({
      method: 'GET',
      url: '/auth/refresh?returnTo=https://evil.com',
      headers: {
        cookie: `userSession=${sealedCookie}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/')
  })

  it('should reject protocol-relative URL in returnTo', async ({
    server,
    msw
  }) => {
    msw.use(
      ((jwtPayload) =>
        http.post('http://defra-id.auth/token', async () =>
          HttpResponse.json({
            expires_in: 3600,
            id_token: createFakeJwt(jwtPayload),
            refresh_token: 'refreshed-safe-2',
            token_type: 'Bearer'
          })
        ))(defaultJwtPayload)
    )

    const expiresAt = addSeconds(new Date(), 5).toISOString()
    const { sessionId, sessionData } = createExpiredSessionData(
      'user-proto-relative',
      expiresAt
    )

    sessionData.profile.enrolmentCount = 1
    sessionData.profile.relationships = ['rel-123']
    sessionData.profile.roles = ['role1']

    await server.app.cache.set(sessionId, sessionData)
    const sealedCookie = await sealCookie(sessionId)

    const response = await server.inject({
      method: 'GET',
      url: '/auth/refresh?returnTo=//evil.com',
      headers: {
        cookie: `userSession=${sealedCookie}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/')
  })

  it('should skip refresh when idTokenRefreshInProgress is set and redirect to returnTo', async ({
    server
  }) => {
    const timerSpy = vi.spyOn(Metrics.prototype, 'timer')

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
    const sealedCookie = await sealCookie(sessionId)

    const response = await server.inject({
      method: 'GET',
      url: '/auth/refresh?returnTo=%2Foriginal-page',
      headers: {
        cookie: `userSession=${sealedCookie}`
      }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/original-page')

    // Session unchanged: refresh was skipped because it was already in progress
    const unchangedSession = await server.app.cache.get(sessionId)
    expect(unchangedSession.idToken).toBe('old-id-token-in-progress')
    expect(unchangedSession.refreshToken).toBe('old-refresh-token-in-progress')

    expect(timerSpy).toHaveBeenCalledExactlyOnceWith(
      'tokenRefreshDuration',
      expect.any(Function),
      { type: 'blocking' }
    )
  })
})
