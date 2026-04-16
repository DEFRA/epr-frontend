import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getVerifyToken } from './verify-token.js'

vi.mock(import('jose'), () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn()
}))

const validAzureB2CPayload = {
  sub: 'user-123',
  email: 'test@example.com',
  correlationId: 'corr-123',
  sessionId: 'sess-123',
  contactId: 'contact-123',
  serviceId: 'service-123',
  firstName: 'John',
  lastName: 'Doe',
  uniqueReference: 'ref-123',
  loa: 2,
  aal: 'aal2',
  enrolmentCount: 1,
  enrolmentRequestCount: 0,
  currentRelationshipId: 'rel-123',
  relationships: ['rel-1'],
  exp: 1735689600,
  iat: 1735686000,
  nbf: 1735686000,
  iss: 'https://defra-id.example.com',
  aud: 'test-client-id'
}

const validStubPayload = {
  id: 'user-456',
  sub: 'user-456',
  aud: 'test-client-id',
  iss: 'http://stub.local',
  nbf: 1735686000,
  exp: 1735689600,
  iat: 1735686000,
  email: 'stub@example.com',
  correlationId: 'corr-456',
  sessionId: 'sess-456',
  contactId: 'contact-456',
  serviceId: 'service-456',
  firstName: 'Jane',
  lastName: 'Smith',
  uniqueReference: 'ref-456',
  loa: 'substantial',
  aal: 'aal2',
  enrolmentCount: '1',
  enrolmentRequestCount: '0',
  currentRelationshipId: 'rel-456',
  relationships: ['rel-a'],
  roles: ['admin']
}

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

  it('should return payload when jose verifies a valid Azure B2C token', async () => {
    const mockJWKS = {}
    mockJose.createRemoteJWKSet.mockReturnValue(mockJWKS)
    mockJose.jwtVerify.mockResolvedValue({ payload: validAzureB2CPayload })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    const result = await verifyToken('mock.jwt.token')

    expect(mockJose.jwtVerify).toHaveBeenCalledWith(
      'mock.jwt.token',
      mockJWKS,
      { algorithms: ['RS256'] }
    )
    expect(result).toStrictEqual(validAzureB2CPayload)
  })

  it('should return payload when jose verifies a valid stub token', async () => {
    mockJose.createRemoteJWKSet.mockReturnValue({})
    mockJose.jwtVerify.mockResolvedValue({ payload: validStubPayload })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    const result = await verifyToken('stub.jwt.token')

    expect(result).toStrictEqual(validStubPayload)
  })

  it('should throw when payload does not match the Defra ID JWT shape', async () => {
    mockJose.createRemoteJWKSet.mockReturnValue({})
    mockJose.jwtVerify.mockResolvedValue({
      payload: { sub: 'user-123', email: 'test@example.com', exp: 1234567890 }
    })

    const verifyToken = await getVerifyToken({
      jwks_uri: 'https://test.auth/.well-known/jwks.json'
    })

    await expect(verifyToken('mock.jwt.token')).rejects.toThrow(
      /does not match any of the allowed types/
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
