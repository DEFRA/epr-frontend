import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { describe, expect, it } from 'vitest'
import { blockUnauthorisedWrites } from './block-unauthorised-writes.js'

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */

const h = /** @type {ResponseToolkit} */ (
  /** @type {unknown} */ ({ continue: Symbol('continue') })
)

const OPERATOR_SCOPES = [
  'organisation.linked.read',
  SCOPES.organisationLinkedWrite
]

const REGULATOR_SCOPES = ['organisation.read', SCOPES.regulator]

const forbidden = expect.objectContaining({
  output: expect.objectContaining({
    statusCode: statusCodes.forbidden
  })
})

/**
 * @param {string} method
 * @param {string[] | undefined} scope
 * @returns {Request}
 */
const requestWithSession = (method, scope) =>
  /** @type {Request} */ (
    /** @type {unknown} */ ({ method, auth: { credentials: { scope } } })
  )

/**
 * @param {string} method
 * @returns {Request}
 */
const requestWithoutSession = (method) =>
  /** @type {Request} */ (
    /** @type {unknown} */ ({ method, auth: { credentials: null } })
  )

describe(blockUnauthorisedWrites, () => {
  it('allows a write from an operator session holding the write scope', () => {
    const request = requestWithSession('post', OPERATOR_SCOPES)

    expect(blockUnauthorisedWrites(request, h)).toBe(h.continue)
  })

  it.for([
    { description: 'a regulator session', scope: REGULATOR_SCOPES },
    { description: 'a session the backend granted no scopes', scope: [] },
    { description: 'a session carrying no scopes at all', scope: undefined }
  ])('rejects a write from $description', ({ scope }) => {
    const request = requestWithSession('post', scope)

    expect(() => blockUnauthorisedWrites(request, h)).toThrow(forbidden)
  })

  it('rejects a write from a request with no session', () => {
    const request = requestWithoutSession('post')

    expect(() => blockUnauthorisedWrites(request, h)).toThrow(forbidden)
  })

  it('rejects an unrecognised method from a regulator session', () => {
    const request = requestWithSession('patch', REGULATOR_SCOPES)

    expect(() => blockUnauthorisedWrites(request, h)).toThrow(forbidden)
  })

  it.for(['get', 'head'])('allows a %s from a regulator session', (method) => {
    const request = requestWithSession(method, REGULATOR_SCOPES)

    expect(blockUnauthorisedWrites(request, h)).toBe(h.continue)
  })

  it('allows a read from a request with no session', () => {
    const request = requestWithoutSession('get')

    expect(blockUnauthorisedWrites(request, h)).toBe(h.continue)
  })
})
