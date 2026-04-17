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

  it('should return payload with consumed claims and pass through extras', async () => {
    const mockJWKS = {}
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      exp: 1735689600,
      correlationId: 'corr-123',
      relationships: ['rel-1']
    }
    mockJose.createRemoteJWKSet.mockReturnValue(mockJWKS)
    mockJose.jwtVerify.mockResolvedValue({ payload })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    const result = await verifyToken('mock.jwt.token')

    expect(mockJose.jwtVerify).toHaveBeenCalledWith(
      'mock.jwt.token',
      mockJWKS,
      { algorithms: ['RS256'] }
    )
    expect(result).toStrictEqual(payload)
  })

  it('should accept a payload with no email claim', async () => {
    mockJose.createRemoteJWKSet.mockReturnValue({})
    const payload = { sub: 'user-123', exp: 1735689600 }
    mockJose.jwtVerify.mockResolvedValue({ payload })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    const result = await verifyToken('mock.jwt.token')

    expect(result).toStrictEqual(payload)
  })

  it('should throw when payload is missing a required claim', async () => {
    mockJose.createRemoteJWKSet.mockReturnValue({})
    mockJose.jwtVerify.mockResolvedValue({
      payload: { sub: 'user-123', email: 'test@example.com' }
    })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    await expect(verifyToken('mock.jwt.token')).rejects.toThrow(
      /Invalid Defra ID JWT payload.*exp/
    )
  })

  it('should throw error when verification fails', async () => {
    const mockError = new Error('Invalid signature')
    mockJose.createRemoteJWKSet.mockReturnValue({})
    mockJose.jwtVerify.mockRejectedValue(mockError)

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    await expect(verifyToken('invalid.jwt.token')).rejects.toThrow(
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
    ).rejects.toThrow('Invalid URL')
  })
})
