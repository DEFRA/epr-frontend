import { buildUserProfile, getTokenExpiresAt } from './build-session.js'
import { describe, expect, it } from 'vitest'

describe('#buildUserProfile', () => {
  it('should extract id and email from JWT payload', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    }

    const profile = buildUserProfile(payload)

    expect(profile).toStrictEqual({
      id: 'user-123',
      email: 'test@example.com'
    })
  })

  it('should only include id and email, ignoring other JWT claims', () => {
    const payload = {
      sub: 'user-456',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['admin', 'user'],
      correlationId: 'corr-123',
      sessionId: 'sess-123'
    }

    const profile = buildUserProfile(payload)

    expect(profile).toStrictEqual({
      id: 'user-456',
      email: 'user@example.com'
    })
    expect(profile).not.toHaveProperty('roles')
    expect(profile).not.toHaveProperty('firstName')
  })
})

describe('#getTokenExpiresAt', () => {
  it('should convert JWT exp claim to ISO date string', () => {
    const exp = 1706475600 // 2024-01-28T21:00:00.000Z
    const payload = { exp }

    const expiresAt = getTokenExpiresAt(payload)

    expect(expiresAt).toBe('2024-01-28T21:00:00.000Z')
  })
})
