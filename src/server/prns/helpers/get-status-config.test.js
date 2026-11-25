import { describe, expect, it } from 'vitest'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { getStatusConfig } from './get-status-config.js'

const localise = createMockLocalise()

describe('#getStatusConfig', () => {
  it.each([
    ['awaiting_authorisation', 'govuk-tag--blue'],
    ['awaiting_acceptance', 'govuk-tag--purple'],
    ['awaiting_cancellation', 'govuk-tag--yellow'],
    ['accepted', 'govuk-tag--green'],
    ['cancelled', 'govuk-tag--red']
  ])('returns correct tag for %s status', (status, expectedClass) => {
    const config = getStatusConfig(status, localise)

    expect(config.class).toContain(expectedClass)
  })

  it('returns default tag with raw status text for unknown status', () => {
    const config = getStatusConfig('some_unknown_status', localise)

    expect(config.text).toBe('some_unknown_status')
    expect(config.class).toBe('epr-tag--no-max-width')
  })
})
