import Boom from '@hapi/boom'
import { describe, expect, it } from 'vitest'

import { validateCadenceForRegistration } from './validate-cadence.js'

describe('#validateCadenceForRegistration', () => {
  it('should not throw when accredited registration uses monthly cadence', () => {
    const accreditation = { id: 'acc-001' }

    expect(() =>
      validateCadenceForRegistration('monthly', accreditation)
    ).not.toThrow()
  })

  it('should not throw when registered-only registration uses quarterly cadence', () => {
    expect(() =>
      validateCadenceForRegistration('quarterly', undefined)
    ).not.toThrow()
  })

  it('should throw 404 when accredited registration uses quarterly cadence', () => {
    const accreditation = { id: 'acc-001' }

    expect(() =>
      validateCadenceForRegistration('quarterly', accreditation)
    ).toThrow(Boom.notFound())
  })

  it('should throw 404 when registered-only registration uses monthly cadence', () => {
    expect(() => validateCadenceForRegistration('monthly', undefined)).toThrow(
      Boom.notFound()
    )
  })
})
