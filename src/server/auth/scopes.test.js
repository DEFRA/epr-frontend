import { describe, expect, it } from 'vitest'
import { isReadOnlySession, SCOPES } from './scopes.js'

/**
 * @param {string[]} [scope]
 */
const credentials = (scope) => ({ scope })

describe('the scopes the backend grants', () => {
  it('spells the write scope as the backend grants it', () => {
    expect(SCOPES.organisationLinkedWrite).toBe('organisation.linked.write')
  })

  it('spells the regulator scope as the backend grants it', () => {
    expect(SCOPES.regulator).toBe('regulator')
  })
})

describe(isReadOnlySession, () => {
  it('treats an operator holding the write scope as able to write', () => {
    expect(
      isReadOnlySession(
        credentials(['organisation.linked.read', 'organisation.linked.write'])
      )
    ).toBe(false)
  })

  it('treats a regulator as read-only', () => {
    expect(
      isReadOnlySession(credentials(['organisation.read', 'regulator']))
    ).toBe(true)
  })

  it('treats a session the backend granted nothing as read-only', () => {
    expect(isReadOnlySession(credentials([]))).toBe(true)
  })

  it('treats a session carrying no scopes at all as read-only', () => {
    expect(isReadOnlySession(credentials(undefined))).toBe(true)
  })

  it('treats a request with no session as read-only', () => {
    expect(isReadOnlySession(null)).toBe(true)
  })

  it('treats an absent argument as read-only', () => {
    expect(isReadOnlySession()).toBe(true)
  })

  it('does not take a read scope for a write scope', () => {
    expect(isReadOnlySession(credentials(['organisation.linked.read']))).toBe(
      true
    )
  })

  it('does not take an admin write scope for permission over operator data', () => {
    expect(isReadOnlySession(credentials(['admin.read', 'admin.write']))).toBe(
      true
    )
  })
})
