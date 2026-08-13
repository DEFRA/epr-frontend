import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { describe, expect, it } from 'vitest'
import { blockRegulatorWrites } from './block-regulator-writes.js'

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */

const h = /** @type {ResponseToolkit} */ (
  /** @type {unknown} */ ({ continue: Symbol('continue') })
)

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

describe(blockRegulatorWrites, () => {
  it('rejects a write from a regulator session as forbidden', () => {
    const request = requestWithSession('post', [SCOPES.regulator])

    expect(() => blockRegulatorWrites(request, h)).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: statusCodes.forbidden
        })
      })
    )
  })

  it('allows a read from a regulator session', () => {
    const request = requestWithSession('get', [SCOPES.regulator])

    expect(blockRegulatorWrites(request, h)).toBe(h.continue)
  })

  it('allows a head request from a regulator session', () => {
    const request = requestWithSession('head', [SCOPES.regulator])

    expect(blockRegulatorWrites(request, h)).toBe(h.continue)
  })

  it('rejects an unrecognised method from a regulator session', () => {
    const request = requestWithSession('patch', [SCOPES.regulator])

    expect(() => blockRegulatorWrites(request, h)).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: statusCodes.forbidden
        })
      })
    )
  })

  it('allows a write from an operator session', () => {
    const request = requestWithSession('post', undefined)

    expect(blockRegulatorWrites(request, h)).toBe(h.continue)
  })

  it('allows a write from a request with no session', () => {
    const request = requestWithoutSession('post')

    expect(blockRegulatorWrites(request, h)).toBe(h.continue)
  })
})
