import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getVerifyToken } from './verify-token.js'

vi.mock(import('node-fetch'), () => ({
  default: vi.fn()
}))

vi.mock(import('@hapi/jwt'), () => ({
  default: {
    token: {
      decode: vi.fn(),
      verify: vi.fn()
    }
  }
}))

vi.mock(import('jwk-to-pem'), () => ({
  default: vi.fn()
}))

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn()
  }))
}))

describe(getVerifyToken, () => {
  let mockFetch
  let mockJwt
  let mockJwkToPem
  let mockCreateLogger

  beforeEach(async () => {
    vi.clearAllMocks()

    const fetch = await import('node-fetch')
    mockFetch = fetch.default

    const jwt = await import('@hapi/jwt')
    mockJwt = jwt.default

    const jwkToPem = await import('jwk-to-pem')
    mockJwkToPem = jwkToPem.default

    const { createLogger } = await import(
      '#server/common/helpers/logging/logger.js'
    )
    mockCreateLogger = createLogger
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should fetch JWKS and return a verify function', async () => {
    const mockKeys = [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'test-key-id',
        n: 'test-modulus',
        e: 'AQAB'
      }
    ]

    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ keys: mockKeys })
    })

    mockJwkToPem.mockReturnValue(
      '-----BEGIN PUBLIC KEY-----\ntest-pem\n-----END PUBLIC KEY-----'
    )

    const verifyToken = await getVerifyToken({
      jwks_uri: 'http://test.auth/.well-known/jwks.json'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test.auth/.well-known/jwks.json'
    )
    expect(mockJwkToPem).toHaveBeenCalledWith(mockKeys[0])
    expect(verifyToken).toBeInstanceOf(Function)
  })

  it('should return a function that decodes and verifies tokens', async () => {
    const mockKeys = [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'test-key-id',
        n: 'test-modulus',
        e: 'AQAB'
      }
    ]

    const mockPem =
      '-----BEGIN PUBLIC KEY-----\ntest-pem\n-----END PUBLIC KEY-----'
    const mockDecoded = {
      decoded: {
        payload: {
          sub: 'user-123',
          email: 'test@example.com'
        }
      }
    }

    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ keys: mockKeys })
    })

    mockJwkToPem.mockReturnValue(mockPem)
    mockJwt.token.decode.mockReturnValue(mockDecoded)

    const verifyToken = await getVerifyToken({
      jwks_uri: 'http://test.auth/.well-known/jwks.json'
    })

    const result = verifyToken('mock-token')

    expect(mockJwt.token.decode).toHaveBeenCalledWith('mock-token')
    expect(mockJwt.token.verify).toHaveBeenCalledWith(mockDecoded, {
      key: mockPem,
      algorithm: 'RS256'
    })
    expect(result).toStrictEqual(mockDecoded)
  })

  it('should log error and throw when JWKS fetch fails', async () => {
    const mockError = new Error('Network error')
    mockFetch.mockRejectedValue(mockError)

    const mockLogger = {
      error: vi.fn()
    }
    mockCreateLogger.mockReturnValue(mockLogger)

    await expect(
      getVerifyToken({
        jwks_uri: 'http://test.auth/.well-known/jwks.json'
      })
    ).rejects.toThrow('Network error')

    expect(mockCreateLogger).toHaveBeenCalledWith()
    expect(mockLogger.error).toHaveBeenCalledWith(
      mockError,
      'Failed to verify token'
    )
  })

  it('should log error and throw when JSON parsing fails', async () => {
    const mockError = new Error('Invalid JSON')
    mockFetch.mockResolvedValue({
      json: vi.fn().mockRejectedValue(mockError)
    })

    const mockLogger = {
      error: vi.fn()
    }
    mockCreateLogger.mockReturnValue(mockLogger)

    await expect(
      getVerifyToken({
        jwks_uri: 'http://test.auth/.well-known/jwks.json'
      })
    ).rejects.toThrow('Invalid JSON')

    expect(mockCreateLogger).toHaveBeenCalledWith()
    expect(mockLogger.error).toHaveBeenCalledWith(
      mockError,
      'Failed to verify token'
    )
  })

  it('should log error and throw when jwkToPem fails', async () => {
    const mockError = new Error('Invalid JWK')
    const mockKeys = [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'test-key-id',
        n: 'test-modulus',
        e: 'AQAB'
      }
    ]

    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ keys: mockKeys })
    })

    mockJwkToPem.mockImplementation(() => {
      throw mockError
    })

    const mockLogger = {
      error: vi.fn()
    }
    mockCreateLogger.mockReturnValue(mockLogger)

    await expect(
      getVerifyToken({
        jwks_uri: 'http://test.auth/.well-known/jwks.json'
      })
    ).rejects.toThrow('Invalid JWK')

    expect(mockCreateLogger).toHaveBeenCalledWith()
    expect(mockLogger.error).toHaveBeenCalledWith(
      mockError,
      'Failed to verify token'
    )
  })
})
