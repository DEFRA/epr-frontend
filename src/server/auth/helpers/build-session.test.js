import { addSeconds, fromUnixTime } from 'date-fns'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buildSessionFromProfile,
  buildUserProfile,
  calculateExpiry
} from './build-session.js'

describe('#calculateExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  test('should use expiresIn when provided', () => {
    const expiresIn = 3600 // 1 hour in seconds
    const jwtExp = undefined

    const result = calculateExpiry(expiresIn, jwtExp)

    expect(result.expiresAt).toStrictEqual(addSeconds(new Date(), 3600))
    expect(result.expiresInMs).toBe(3600 * 1000)
  })

  test('should fallback to JWT exp claim when expiresIn is null', () => {
    const expiresIn = null
    const jwtExp = Math.floor(Date.now() / 1000) + 7200 // 2 hours from now

    const result = calculateExpiry(expiresIn, jwtExp)

    expect(result.expiresAt).toStrictEqual(fromUnixTime(jwtExp))
    expect(result.expiresInMs).toBeCloseTo(7200 * 1000, -2)
  })

  test('should fallback to JWT exp claim when expiresIn is undefined', () => {
    const expiresIn = undefined
    const jwtExp = Math.floor(Date.now() / 1000) + 1800 // 30 mins from now

    const result = calculateExpiry(expiresIn, jwtExp)

    expect(result.expiresAt).toStrictEqual(fromUnixTime(jwtExp))
    expect(result.expiresInMs).toBeCloseTo(1800 * 1000, -2)
  })

  test('should fallback to JWT exp claim when expiresIn is 0', () => {
    const expiresIn = 0
    const jwtExp = Math.floor(Date.now() / 1000) + 900 // 15 mins from now

    const result = calculateExpiry(expiresIn, jwtExp)

    expect(result.expiresAt).toStrictEqual(fromUnixTime(jwtExp))
    expect(result.expiresInMs).toBeCloseTo(900 * 1000, -2)
  })

  test('should default to 1 hour when neither expiresIn nor jwtExp is available', () => {
    const expiresIn = null
    const jwtExp = undefined

    const result = calculateExpiry(expiresIn, jwtExp)

    expect(result.expiresAt).toStrictEqual(addSeconds(new Date(), 3600))
    expect(result.expiresInMs).toBe(3600 * 1000)
  })
})

describe('#buildUserProfile', () => {
  const mockPayload = {
    sub: 'user-123',
    correlationId: 'corr-456',
    sessionId: 'sess-789',
    contactId: 'contact-001',
    serviceId: 'service-002',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    uniqueReference: 'ref-123',
    loa: 'high',
    aal: 'aal2',
    enrolmentCount: 1,
    enrolmentRequestCount: 0,
    currentRelationshipId: 'rel-001',
    relationships: ['rel-001'],
    roles: ['admin'],
    exp: 1704110400 // Unix timestamp
  }

  test('should build user profile with jwtExp from payload', () => {
    const result = buildUserProfile({
      payload: mockPayload,
      idToken: 'id-token-123',
      tokenUrl: 'https://example.com/token',
      logoutUrl: 'https://example.com/logout'
    })

    expect(result).toMatchObject({
      id: 'user-123',
      correlationId: 'corr-456',
      sessionId: 'sess-789',
      contactId: 'contact-001',
      serviceId: 'service-002',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      idToken: 'id-token-123',
      tokenUrl: 'https://example.com/token',
      logoutUrl: 'https://example.com/logout',
      jwtExp: 1704110400
    })
  })
})

describe('#buildSessionFromProfile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  const createMockProfile = (jwtExp) => ({
    id: 'user-123',
    correlationId: 'corr-456',
    sessionId: 'sess-789',
    contactId: 'contact-001',
    serviceId: 'service-002',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    email: 'john.doe@example.com',
    uniqueReference: 'ref-123',
    loa: 'high',
    aal: 'aal2',
    enrolmentCount: 1,
    enrolmentRequestCount: 0,
    currentRelationshipId: 'rel-001',
    relationships: ['rel-001'],
    roles: ['admin'],
    idToken: 'id-token-123',
    tokenUrl: 'https://example.com/token',
    logoutUrl: 'https://example.com/logout',
    jwtExp
  })

  test('should use credentials.expiresIn when available', () => {
    const jwtExp = Math.floor(Date.now() / 1000) + 3600
    const mockProfile = createMockProfile(jwtExp)
    const credentials = {
      token: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 7200 // 2 hours
    }

    const result = buildSessionFromProfile({
      credentials,
      isAuthenticated: true,
      profile: mockProfile
    })

    expect(result.expiresIn).toBe(7200 * 1000)
    expect(result.expiresAt).toStrictEqual(addSeconds(new Date(), 7200))
    expect(result.token).toBe('access-token-123')
    expect(result.refreshToken).toBe('refresh-token-123')
    expect(result.isAuthenticated).toBe(true)
  })

  test('should fallback to jwtExp when expiresIn is null', () => {
    const jwtExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const mockProfile = createMockProfile(jwtExp)
    const credentials = {
      token: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: null
    }

    const result = buildSessionFromProfile({
      credentials,
      isAuthenticated: true,
      profile: mockProfile
    })

    expect(result.expiresAt).toStrictEqual(fromUnixTime(jwtExp))
    expect(result.expiresIn).toBeCloseTo(3600 * 1000, -2)
  })
})
