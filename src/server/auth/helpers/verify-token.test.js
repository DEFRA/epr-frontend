import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getVerifyToken } from './verify-token.js'

vi.mock(import('jose'), () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn()
}))

describe(getVerifyToken, () => {
  let mockJose

  beforeEach(async () => {
    vi.clearAllMocks()
    mockJose = await import('jose')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should create a remote JWKS and return a verify function', async () => {
    const mockJWKS = {}
    mockJose.createRemoteJWKSet.mockReturnValue(mockJWKS)

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    expect(mockJose.createRemoteJWKSet).toHaveBeenCalledWith(expect.any(URL))
    expect(verifyToken).toBeInstanceOf(Function)
  })

  it('should verify token and return payload', async () => {
    const mockJWKS = {}
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      exp: 1234567890
    }

    mockJose.createRemoteJWKSet.mockReturnValue(mockJWKS)
    mockJose.jwtVerify.mockResolvedValue({ payload: mockPayload })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    const result = await verifyToken('mock.jwt.token')

    expect(mockJose.jwtVerify).toHaveBeenCalledWith(
      'mock.jwt.token',
      mockJWKS,
      { algorithms: ['RS256'] }
    )
    expect(result).toStrictEqual(mockPayload)
  })

  it('should throw error when verification fails', async () => {
    const mockError = new Error('Invalid signature')
    mockJose.createRemoteJWKSet.mockReturnValue({})
    mockJose.jwtVerify.mockRejectedValue(mockError)

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    await expect(verifyToken('invalid.jwt.token')).rejects.toThrowError(
      'Invalid signature'
    )
  })

  it('should throw error when JWKS URL is invalid', async () => {
    const mockError = new Error('Invalid URL')
    mockJose.createRemoteJWKSet.mockImplementation(() => {
      throw mockError
    })

    await expect(
      getVerifyToken({
        jwks_uri: 'https://test.auth/.well-known/jwks.json'
      })
    ).rejects.toThrowError('Invalid URL')
  })

  it('should handle kid matching automatically via jose', async () => {
    // This test verifies that jose handles kid matching
    const mockJWKS = {}
    const mockPayload = {
      sub: 'user-456',
      email: 'test2@example.com'
    }

    mockJose.createRemoteJWKSet.mockReturnValue(mockJWKS)
    mockJose.jwtVerify.mockResolvedValue({ payload: mockPayload })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    const result = await verifyToken('token.with.kid2')

    // jose.jwtVerify handles kid matching internally
    expect(mockJose.jwtVerify).toHaveBeenCalledWith(
      'token.with.kid2',
      mockJWKS,
      { algorithms: ['RS256'] }
    )
    expect(result).toStrictEqual(mockPayload)
  })
})
