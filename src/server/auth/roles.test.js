import { holdsNoRole, isRegulator, REGULATOR_ROLE } from '#server/auth/roles.js'
import { SCOPES } from '#server/auth/scopes.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { describe, expect, it } from 'vitest'

describe('the regulator role', () => {
  it('is the role string the backend resolves a regulator to', () => {
    expect(REGULATOR_ROLE).toBe('regulator_standard')
  })
})

describe('#isRegulator', () => {
  it('recognises a session holding the regulator role', () => {
    expect(isRegulator({ role: REGULATOR_ROLE })).toBe(true)
  })

  it('does not recognise an operator', () => {
    expect(isRegulator({ role: 'operator' })).toBe(false)
  })

  it('does not recognise a role this app renders no shell for', () => {
    expect(isRegulator({ role: 'service_maintainer' })).toBe(false)
  })

  it('does not recognise a session the backend granted no role', () => {
    expect(isRegulator({ role: null })).toBe(false)
  })

  it('does not recognise an absent session', () => {
    expect(isRegulator(null)).toBe(false)
  })

  it('reads the role and not the scopes, so the regulator scope alone is not an identity', () => {
    const credentials = { role: 'operator', scope: [SCOPES.regulator] }

    expect(isRegulator(credentials)).toBe(false)
  })
})

describe('#holdsNoRole', () => {
  it('recognises the identity the backend grants no role', () => {
    expect(holdsNoRole(IDENTITIES.unrecognised)).toBe(true)
  })

  it('does not recognise an operator', () => {
    expect(holdsNoRole(IDENTITIES.operator)).toBe(false)
  })

  it('does not recognise a regulator', () => {
    expect(holdsNoRole(IDENTITIES.regulator)).toBe(false)
  })
})
