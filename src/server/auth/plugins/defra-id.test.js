import { config } from '#config/config.js'
import * as jose from 'jose'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefraId } from './defra-id.js'

vi.mock(import('@hapi/bell'), () => ({
  default: {
    name: 'bell',
    register: vi.fn()
  }
}))

vi.mock(import('node-fetch'), () => ({
  default: vi.fn()
}))

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({
    error: vi.fn()
  })
}))

describe('#defraId', () => {
  let mockServer
  let mockFetch
  let mockBell
  let mockVerifyToken
  let defraId

  beforeEach(async () => {
    vi.clearAllMocks()

    // Set config values for tests
    config.set('defraId.clientId', 'test-client-id')
    config.set('defraId.clientSecret', 'test-client-secret')
    config.set(
      'defraId.oidcConfigurationUrl',
      'http://test.auth/.well-known/openid-configuration'
    )
    config.set('defraId.serviceId', 'test-service-id')
    config.set(
      'session.cookie.password',
      'test-password-at-least-32-characters-long'
    )
    config.set('session.cookie.secure', true)

    // Import mocked modules
    const fetch = await import('node-fetch')
    mockFetch = fetch.default

    const bell = await import('@hapi/bell')
    mockBell = bell.default

    // Create mock verifyToken function that returns just the payload
    mockVerifyToken = vi.fn((token) => jose.decodeJwt(token))

    mockFetch.mockImplementation((url) => {
      // Mock OIDC discovery endpoint
      if (url.includes('openid-configuration')) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            issuer: 'http://test.auth',
            authorization_endpoint: 'http://test.auth/authorize',
            token_endpoint: 'http://test.auth/token',
            userinfo_endpoint: 'http://test.auth/userinfo',
            end_session_endpoint: 'http://test.auth/logout',
            jwks_uri: 'http://test.auth/.well-known/jwks.json'
          })
        })
      }
      // Mock JWKS endpoint
      if (url.includes('jwks.json')) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            keys: [
              {
                kty: 'RSA',
                use: 'sig',
                kid: 'test-key-id',
                n: 'test-modulus',
                e: 'AQAB'
              }
            ]
          })
        })
      }
      return Promise.reject(new Error('Unmocked URL: ' + url))
    })

    mockServer = {
      register: vi.fn().mockResolvedValue(undefined),
      auth: {
        strategy: vi.fn()
      },
      app: {}
    }

    // Create defraId plugin with mock verifyToken
    defraId = createDefraId(mockVerifyToken)
  })

  afterEach(() => {
    vi.resetAllMocks()
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    config.reset('session.cookie.password')
    config.reset('session.cookie.secure')
  })

  describe('plugin metadata', () => {
    it('should have correct plugin name', () => {
      expect(defraId.plugin.name).toBe('defra-id')
    })
  })

  describe('getOidcConfiguration', () => {
    it('should fetch OIDC configuration successfully', async () => {
      await defraId.plugin.register(mockServer)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.auth/.well-known/openid-configuration'
      )
    })

    it('should throw error when OIDC configuration fetch fails', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('openid-configuration')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found'
          })
        }
        return Promise.reject(new Error('Unmocked URL: ' + url))
      })

      await expect(defraId.plugin.register(mockServer)).rejects.toThrowError(
        'OIDC config fetch failed: 404 Not Found'
      )
    })

    it('should throw error when OIDC configuration fetch returns 500', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('openid-configuration')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          })
        }
        return Promise.reject(new Error('Unmocked URL: ' + url))
      })

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

      expect(config.provider.auth).toBe('http://test.auth/authorize')
      expect(config.provider.token).toBe('http://test.auth/token')
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

      // providerParams is a function, call it with a mock request
      const params = config.providerParams({ path: '/auth/login' })

      expect(params.serviceId).toBe('test-service-id')
    })

    it('should extract query parameters from authorization endpoint and add to providerParams', async () => {
      // Mock OIDC config with Azure AD B2C style query parameters
      mockFetch.mockImplementation((url) => {
        if (url.includes('openid-configuration')) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              issuer: 'http://test.auth',
              authorization_endpoint:
                'http://test.auth/authorize?p=b2c_1a_signupsignin',
              token_endpoint: 'http://test.auth/token',
              userinfo_endpoint: 'http://test.auth/userinfo',
              end_session_endpoint: 'http://test.auth/logout',
              jwks_uri: 'http://test.auth/.well-known/jwks.json'
            })
          })
        }
        if (url.includes('jwks.json')) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              keys: [
                {
                  kty: 'RSA',
                  use: 'sig',
                  kid: 'test-key-id',
                  n: 'test-modulus',
                  e: 'AQAB'
                }
              ]
            })
          })
        }
        return Promise.reject(new Error('Unmocked URL: ' + url))
      })

      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      // Base URL should not have query parameters
      expect(config.provider.auth).toBe('http://test.auth/authorize')

      // Query parameters should be in providerParams
      const params = config.providerParams({ path: '/auth/login' })

      expect(params).toStrictEqual({
        serviceId: 'test-service-id',
        p: 'b2c_1a_signupsignin',
        forceReselection: false
      })
    })

    it('should handle multiple query parameters in authorization endpoint', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('openid-configuration')) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              issuer: 'http://test.auth',
              authorization_endpoint:
                'http://test.auth/authorize?p=b2c_1a_signupsignin&custom=value',
              token_endpoint: 'http://test.auth/token',
              userinfo_endpoint: 'http://test.auth/userinfo',
              end_session_endpoint: 'http://test.auth/logout',
              jwks_uri: 'http://test.auth/.well-known/jwks.json'
            })
          })
        }
        if (url.includes('jwks.json')) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              keys: [
                {
                  kty: 'RSA',
                  use: 'sig',
                  kid: 'test-key-id',
                  n: 'test-modulus',
                  e: 'AQAB'
                }
              ]
            })
          })
        }
        return Promise.reject(new Error('Unmocked URL: ' + url))
      })

      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]

      expect(config.provider.auth).toBe('http://test.auth/authorize')

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
        token: 'http://test.auth/token',
        logout: 'http://test.auth/logout'
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
        token: 'http://test.auth/token',
        logout: 'http://test.auth/logout'
      })
    })
  })
})
