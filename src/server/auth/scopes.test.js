import { describe, expect, it } from 'vitest'
import { hasLedgerReadScope, hasWriteScope, SCOPES } from './scopes.js'

/**
 * @param {string[]} [scope]
 */
const credentials = (scope) => ({ scope })

describe('the scopes the backend grants', () => {
  it('spells the write scope as the backend grants it', () => {
    expect(SCOPES.organisationLinkedWrite).toBe('organisation.linked.write')
  })

  it('spells the waste balance ledger read scope as the backend grants it', () => {
    expect(SCOPES.wasteBalanceLedgerRead).toBe('waste-balance.ledger.read')
  })
})

describe(hasWriteScope, () => {
  it('treats an operator holding the write scope as able to write', () => {
    expect(
      hasWriteScope(
        credentials(['organisation.linked.read', 'organisation.linked.write'])
      )
    ).toBe(true)
  })

  it('refuses a regulator', () => {
    expect(
      hasWriteScope(
        credentials(['organisation.read', 'waste-balance.ledger.read'])
      )
    ).toBe(false)
  })

  it('refuses a session the backend granted nothing', () => {
    expect(hasWriteScope(credentials([]))).toBe(false)
  })

  it('refuses a session carrying no scopes at all', () => {
    expect(hasWriteScope(credentials(undefined))).toBe(false)
  })

  it('refuses a request with no session', () => {
    expect(hasWriteScope(null)).toBe(false)
  })

  it('refuses an absent argument', () => {
    expect(hasWriteScope()).toBe(false)
  })

  it('does not take a read scope for a write scope', () => {
    expect(hasWriteScope(credentials(['organisation.linked.read']))).toBe(false)
  })

  it('does not take an admin write scope for permission over operator data', () => {
    expect(hasWriteScope(credentials(['admin.read', 'admin.write']))).toBe(
      false
    )
  })
})

describe(hasLedgerReadScope, () => {
  it('admits a session the backend granted the ledger read scope', () => {
    expect(
      hasLedgerReadScope(
        credentials(['organisation.read', 'waste-balance.ledger.read'])
      )
    ).toBe(true)
  })

  it('refuses an operator holding read and write of its own organisation', () => {
    expect(
      hasLedgerReadScope(
        credentials(['organisation.linked.read', 'organisation.linked.write'])
      )
    ).toBe(false)
  })

  it('does not take the organisation read scope for the ledger scope', () => {
    expect(hasLedgerReadScope(credentials(['organisation.read']))).toBe(false)
  })

  it('refuses a session the backend granted nothing', () => {
    expect(hasLedgerReadScope(credentials([]))).toBe(false)
  })

  it('refuses a session carrying no scopes at all', () => {
    expect(hasLedgerReadScope(credentials(undefined))).toBe(false)
  })

  it('refuses a request with no session', () => {
    expect(hasLedgerReadScope(null)).toBe(false)
  })

  it('refuses an absent argument', () => {
    expect(hasLedgerReadScope()).toBe(false)
  })
})
