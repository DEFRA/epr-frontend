import { describe, expect, it } from 'vitest'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { getStatusConfig } from './get-status-config.js'

/**
 * @import { PrnStatus } from '#server/common/constants/statuses.js'
 */

const localise = createMockLocalise()

describe('#getStatusConfig', () => {
  it.each(
    /** @type {[PrnStatus, string][]} */ ([
      ['awaiting_authorisation', 'govuk-tag--blue'],
      ['awaiting_acceptance', 'govuk-tag--purple'],
      ['awaiting_cancellation', 'govuk-tag--yellow'],
      ['accepted', 'govuk-tag--green'],
      ['cancelled', 'govuk-tag--red']
    ])
  )('returns correct tag for %s status', (status, expectedClass) => {
    const config = getStatusConfig(status, localise)

    expect(config.class).toContain(expectedClass)
  })

  it('returns default tag with raw status text for a status it has no tag for', () => {
    const config = getStatusConfig('discarded', localise)

    expect(config.text).toBe('discarded')
    expect(config.class).toBe('epr-tag--no-max-width')
  })
})
