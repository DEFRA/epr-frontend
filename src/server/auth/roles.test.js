import {
  ADMIN_ROLES,
  holdsNoRole,
  REGULATOR_ROLE,
  seesRegulatorView
} from '#server/auth/roles.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { describe, expect, it } from 'vitest'

describe('the regulator role', () => {
  it('is the role string the backend resolves a regulator to', () => {
    expect(REGULATOR_ROLE).toBe('regulator_standard')
  })
})

describe('the admin roles', () => {
  it('are the tiers the backend resolves from its admin email lists', () => {
    expect(ADMIN_ROLES).toStrictEqual([
      'service_maintainer_write',
      'service_maintainer',
      'support'
    ])
  })
})

describe('#seesRegulatorView', () => {
  it('recognises a session holding the regulator role', () => {
    expect(seesRegulatorView({ role: REGULATOR_ROLE })).toBe(true)
  })

  it.for(ADMIN_ROLES)('recognises a session holding the %s role', (role) => {
    expect(seesRegulatorView({ role })).toBe(true)
  })

  it('does not recognise an operator', () => {
    expect(seesRegulatorView({ role: 'operator' })).toBe(false)
  })

  it('does not recognise a role this app renders no shell for', () => {
    expect(seesRegulatorView({ role: 'unknown_role' })).toBe(false)
  })

  it('does not recognise a session the backend granted no role', () => {
    expect(seesRegulatorView({ role: null })).toBe(false)
  })

  it('does not recognise an absent session', () => {
    expect(seesRegulatorView(null)).toBe(false)
  })

  it("reads the role and not the scopes, so a regulator's scopes alone are not an identity", () => {
    const credentials = {
      role: 'operator',
      scope: [...IDENTITIES.regulator.scopes]
    }

    expect(seesRegulatorView(credentials)).toBe(false)
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
