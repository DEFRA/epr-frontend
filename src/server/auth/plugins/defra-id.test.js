import { config as appConfig } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { createDefraId } from './defra-id.js'

vi.mock(import('@hapi/bell'), () => ({
  default: {
    name: 'bell',
    register: vi.fn()
  }
}))

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({
    error: vi.fn()
  })
}))

describe('#defraId', () => {
  let mockServer
  let mockBell
  let mockVerifyToken
  let defraId

  beforeEach(async () => {
    vi.clearAllMocks()

    appConfig.set('defraId.clientId', 'test-client-id')
    appConfig.set('defraId.clientSecret', 'test-client-secret')
    appConfig.set(
      'defraId.oidcConfigurationUrl',
      'http://defra-id.auth/.well-known/openid-configuration'
    )
    appConfig.set('defraId.serviceId', 'test-service-id')
    appConfig.set(
      'session.cookie.password',
      'test-password-at-least-32-characters-long'
    )
    appConfig.set('session.cookie.secure', true)

    const bell = await import('@hapi/bell')
    mockBell = bell.default

    mockVerifyToken = vi.fn((token) => jose.decodeJwt(token))

    mockServer = {
      register: vi.fn().mockResolvedValue(undefined),
      auth: {
        strategy: vi.fn()
      },
      app: {}
    }

    defraId = createDefraId(mockVerifyToken)
  })

  afterEach(() => {
    vi.resetAllMocks()
    appConfig.reset('defraId.clientId')
    appConfig.reset('defraId.clientSecret')
    appConfig.reset('defraId.oidcConfigurationUrl')
    appConfig.reset('defraId.serviceId')
    appConfig.reset('session.cookie.password')
    appConfig.reset('session.cookie.secure')
  })

  describe('plugin metadata', () => {
    it('should have correct plugin name', () => {
      expect(defraId.plugin.name).toBe('defra-id')
    })
  })

  describe('getOidcConfiguration', () => {
    it('should throw error when OIDC configuration fetch fails', async ({
      msw
    }) => {
      msw.use(
        http.get(
          'http://defra-id.auth/.well-known/openid-configuration',
          () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
        )
      )

      await expect(defraId.plugin.register(mockServer)).rejects.toThrowError(
        'OIDC config fetch failed: 404 Not Found'
      )
    })

    it('should throw error when OIDC configuration fetch returns 500', async ({
      msw
    }) => {
      msw.use(
        http.get(
          'http://defra-id.auth/.well-known/openid-configuration',
          () =>
            new HttpResponse(null, {
              status: 500,
              statusText: 'Internal Server Error'
            })
        )
      )

      await expect(defraId.plugin.register(mockServer)).rejects.toThrowError(
        'OIDC config fetch failed: 500 Internal Server Error'
      )
    })
  })

  describe('plugin registration', () => {
    it('should register bell plugin', async () => {
      await defraId.plugin.register(mockServer)

      expect(mockServer.register).toHaveBeenCalledWith(mockBell)
    })

    it('should configure defra-id auth strategy', async () => {
      await defraId.plugin.register(mockServer)

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'defra-id',
        'bell',
        expect.objectContaining({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          cookie: 'bell-defra-id',
          isSecure: true,
          password: 'test-password-at-least-32-characters-long'
        })
      )
    })

    it('should configure bell with OIDC endpoints', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      expect(config.provider.auth).toBe('http://defra-id.auth/authorize')
      expect(config.provider.token).toBe('http://defra-id.auth/token')
    })

    it('should configure provider with correct settings', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      expect(config.provider.name).toBe('defra-id')
      expect(config.provider.protocol).toBe('oauth2')
      expect(config.provider.useParamsAuth).toBe(true)
      expect(config.provider.scope).toStrictEqual(['openid', 'offline_access'])
    })

    it('should include serviceId in provider params', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      const params = config.providerParams({ path: '/auth/login' })

      expect(params.serviceId).toBe('test-service-id')
    })

    it('should extract query parameters from authorization endpoint and add to providerParams', async ({
      msw
    }) => {
      msw.use(
        http.get('http://defra-id.auth/.well-known/openid-configuration', () =>
          HttpResponse.json({
            issuer: 'http://defra-id.auth',
            authorization_endpoint:
              'http://defra-id.auth/authorize?p=b2c_1a_signupsignin',
            token_endpoint: 'http://defra-id.auth/token',
            userinfo_endpoint: 'http://defra-id.auth/userinfo',
            end_session_endpoint: 'http://defra-id.auth/logout',
            jwks_uri: 'http://defra-id.auth/.well-known/jwks.json'
          })
        )
      )

      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      expect(config.provider.auth).toBe('http://defra-id.auth/authorize')

      const params = config.providerParams({ path: '/auth/login' })

      expect(params).toStrictEqual({
        serviceId: 'test-service-id',
        p: 'b2c_1a_signupsignin',
        forceReselection: false
      })
    })

    it('should handle multiple query parameters in authorization endpoint', async ({
      msw
    }) => {
      msw.use(
        http.get('http://defra-id.auth/.well-known/openid-configuration', () =>
          HttpResponse.json({
            issuer: 'http://defra-id.auth',
            authorization_endpoint:
              'http://defra-id.auth/authorize?p=b2c_1a_signupsignin&custom=value',
            token_endpoint: 'http://defra-id.auth/token',
            userinfo_endpoint: 'http://defra-id.auth/userinfo',
            end_session_endpoint: 'http://defra-id.auth/logout',
            jwks_uri: 'http://defra-id.auth/.well-known/jwks.json'
          })
        )
      )

      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      expect(config.provider.auth).toBe('http://defra-id.auth/authorize')

      const params = config.providerParams({ path: '/auth/login' })

      expect(params).toStrictEqual({
        serviceId: 'test-service-id',
        p: 'b2c_1a_signupsignin',
        custom: 'value',
        forceReselection: false
      })
    })
  })

  describe('location function', () => {
    it('should return auth callback URL derived from request', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]
      const locationFn = config.location

      const mockRequest = {
        info: { host: 'localhost:3000' },
        headers: {},
        server: { info: { protocol: 'http' } }
      }

      const result = locationFn(mockRequest)

      expect(result).toBe('http://localhost:3000/auth/callback')
    })

    it('should store referrer in flash when present', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]
      const locationFn = config.location

      const mockRequest = {
        info: {
          referrer: 'http://localhost:3000/dashboard',
          host: 'localhost:3000'
        },
        headers: {},
        server: { info: { protocol: 'http' } },
        yar: {
          flash: vi.fn()
        }
      }

      locationFn(mockRequest)

      expect(mockRequest.yar.flash).toHaveBeenCalledWith(
        'referrer',
        '/dashboard'
      )
    })

    it('should not store referrer in flash when referrer is callback URL', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]
      const locationFn = config.location

      const mockRequest = {
        info: {
          referrer: 'http://localhost:3000/auth/callback',
          host: 'localhost:3000'
        },
        headers: {},
        server: { info: { protocol: 'http' } },
        yar: {
          flash: vi.fn()
        }
      }

      locationFn(mockRequest)

      expect(mockRequest.yar.flash).not.toHaveBeenCalled()
    })
  })

  describe('profile function', () => {
    let profileFn

    beforeEach(async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]
      profileFn = config.provider.profile
    })

    it('should decode JWT token and extract user profile', async () => {
      const mockPayload = {
        sub: 'user-123',
        correlationId: 'corr-123',
        sessionId: 'sess-123',
        contactId: 'contact-123',
        serviceId: 'service-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        uniqueReference: 'ref-123',
        loa: 'substantial',
        aal: 'aal2',
        enrolmentCount: 2,
        enrolmentRequestCount: 1,
        currentRelationshipId: 'rel-123',
        relationships: ['rel-1', 'rel-2'],
        roles: ['admin', 'user'],
        exp: 1735689600 // 2025-01-01T00:00:00.000Z
      }

      mockVerifyToken.mockResolvedValue(mockPayload)

      const mockCredentials = {
        token: 'mock-access-token'
      }

      const mockParams = {
        id_token: 'mock-id-token'
      }

      await profileFn(mockCredentials, mockParams)

      expect(mockVerifyToken).toHaveBeenCalledWith('mock-id-token')
      expect(mockCredentials.profile).toStrictEqual({
        id: 'user-123',
        email: 'john.doe@example.com'
      })
      expect(mockCredentials.expiresAt).toBe('2025-01-01T00:00:00.000Z')
      expect(mockCredentials.idToken).toBe('mock-id-token')
      expect(mockCredentials.urls).toStrictEqual({
        token: 'http://defra-id.auth/token',
        logout: 'http://defra-id.auth/logout'
      })
    })

    it('should set all credential fields from OIDC response', async () => {
      const mockPayload = {
        sub: 'user-456',
        correlationId: 'corr-456',
        sessionId: 'sess-456',
        contactId: 'contact-456',
        serviceId: 'service-456',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        uniqueReference: 'ref-456',
        loa: 'high',
        aal: 'aal3',
        enrolmentCount: 5,
        enrolmentRequestCount: 3,
        currentRelationshipId: 'rel-456',
        relationships: ['rel-a', 'rel-b', 'rel-c'],
        roles: ['editor', 'viewer', 'admin'],
        exp: 1735693200 // 2025-01-01T01:00:00.000Z
      }

      mockVerifyToken.mockReturnValue(mockPayload)

      const mockCredentials = { token: 'access-token-456' }
      const mockParams = { id_token: 'id-token-456' }

      await profileFn(mockCredentials, mockParams)

      expect(mockCredentials.profile).toStrictEqual({
        id: 'user-456',
        email: 'alice@example.com'
      })
      expect(mockCredentials.expiresAt).toBe('2025-01-01T01:00:00.000Z')

      expect(mockCredentials.idToken).toBe('id-token-456')
      expect(mockCredentials.urls).toStrictEqual({
        token: 'http://defra-id.auth/token',
        logout: 'http://defra-id.auth/logout'
      })
    })
  })
})
