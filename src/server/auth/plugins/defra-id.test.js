import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defraId } from './defra-id.js'

vi.mock(import('@hapi/bell'), () => ({
  default: {
    name: 'bell',
    register: vi.fn()
  }
}))

vi.mock(import('@hapi/jwt'), () => ({
  default: {
    token: {
      decode: vi.fn(),
      verify: vi.fn()
    }
  }
}))

vi.mock(import('node-fetch'), () => ({
  default: vi.fn()
}))

vi.mock(import('#config/config.js'), () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({
    error: vi.fn()
  })
}))

vi.mock(import('jwk-to-pem'), () => ({
  default: vi.fn(
    () => '-----BEGIN PUBLIC KEY-----\ntest-pem\n-----END PUBLIC KEY-----'
  )
}))

describe('#defraId', () => {
  let mockServer
  let mockFetch
  let mockJwt
  let mockConfig
  let mockBell

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import mocked modules
    const fetch = await import('node-fetch')
    mockFetch = fetch.default

    const jwt = await import('@hapi/jwt')
    mockJwt = jwt.default

    const bell = await import('@hapi/bell')
    mockBell = bell.default

    const { config } = await import('#config/config.js')
    mockConfig = config

    // Setup default mock implementations
    mockConfig.get.mockImplementation((key) => {
      const configMap = {
        'defraId.oidcConfigurationUrl':
          'http://test.auth/.well-known/openid-configuration',
        'defraId.serviceId': 'test-service-id',
        'defraId.clientId': 'test-client-id',
        'defraId.clientSecret': 'test-client-secret',
        appBaseUrl: 'http://localhost:3000',
        'session.cookie.password': 'test-password-at-least-32-characters-long',
        'session.cookie.secure': true
      }
      return configMap[key]
    })

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
      }
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
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

      await expect(defraId.plugin.register(mockServer)).rejects.toThrow(
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

      await expect(defraId.plugin.register(mockServer)).rejects.toThrow(
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
    it('should return auth callback URL', async () => {
      await defraId.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]
      const locationFn = config.location

      const mockRequest = {
        info: {}
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
          referrer: 'http://localhost:3000/dashboard'
        },
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
          referrer: 'http://localhost:3000/auth/callback'
        },
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
        roles: ['admin', 'user']
      }

      mockJwt.token.decode.mockReturnValue({
        decoded: {
          payload: mockPayload
        }
      })

      const mockCredentials = {
        token: 'mock-access-token'
      }

      const mockParams = {
        id_token: 'mock-id-token'
      }

      await profileFn(mockCredentials, mockParams)

      expect(mockJwt.token.decode).toHaveBeenCalledWith('mock-id-token')
      expect(mockCredentials.profile).toStrictEqual({
        id: 'user-123',
        correlationId: 'corr-123',
        sessionId: 'sess-123',
        contactId: 'contact-123',
        serviceId: 'service-123',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        uniqueReference: 'ref-123',
        loa: 'substantial',
        aal: 'aal2',
        enrolmentCount: 2,
        enrolmentRequestCount: 1,
        currentRelationshipId: 'rel-123',
        relationships: ['rel-1', 'rel-2'],
        roles: ['admin', 'user'],
        idToken: 'mock-id-token',
        tokenUrl: 'http://test.auth/token',
        logoutUrl: 'http://test.auth/logout'
      })
    })

    it('should include all required profile fields', async () => {
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
        roles: ['editor', 'viewer', 'admin']
      }

      mockJwt.token.decode.mockReturnValue({
        decoded: {
          payload: mockPayload
        }
      })

      const mockCredentials = { token: 'access-token-456' }
      const mockParams = { id_token: 'id-token-456' }

      await profileFn(mockCredentials, mockParams)

      // Verify all fields are correctly mapped
      expect(mockCredentials.profile).toStrictEqual({
        id: 'user-456',
        correlationId: 'corr-456',
        sessionId: 'sess-456',
        contactId: 'contact-456',
        serviceId: 'service-456',
        firstName: 'Alice',
        lastName: 'Johnson',
        displayName: 'Alice Johnson',
        email: 'alice@example.com',
        uniqueReference: 'ref-456',
        loa: 'high',
        aal: 'aal3',
        enrolmentCount: 5,
        enrolmentRequestCount: 3,
        currentRelationshipId: 'rel-456',
        relationships: ['rel-a', 'rel-b', 'rel-c'],
        roles: ['editor', 'viewer', 'admin'],
        idToken: 'id-token-456',
        tokenUrl: 'http://test.auth/token',
        logoutUrl: 'http://test.auth/logout'
      })
    })
  })
})
