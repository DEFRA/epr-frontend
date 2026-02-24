import { describe, expect, it } from 'vitest'
import { getStatusConfig } from './get-status-config.js'

const localise = (key) => {
  const translations = {
    'prns:list:status:awaitingAuthorisation': 'Awaiting authorisation',
    'prns:list:status:awaitingAcceptance': 'Awaiting acceptance',
    'prns:list:status:awaitingCancellation': 'Awaiting cancellation',
    'prns:list:status:accepted': 'Accepted',
    'prns:list:status:cancelled': 'Cancelled'
  }
  return translations[key] ?? key
}

describe('#getStatusConfig', () => {
  it.each([
    ['awaiting_authorisation', 'Awaiting authorisation', 'govuk-tag--blue'],
    ['awaiting_acceptance', 'Awaiting acceptance', 'govuk-tag--purple'],
    ['awaiting_cancellation', 'Awaiting cancellation', 'govuk-tag--yellow'],
    ['accepted', 'Accepted', 'govuk-tag--green'],
    ['cancelled', 'Cancelled', 'govuk-tag--red']
  ])(
    'returns correct tag for %s status',
    (status, expectedText, expectedClass) => {
      const config = getStatusConfig(status, localise)

      expect(config.text).toBe(expectedText)
      expect(config.class).toContain(expectedClass)
    }
  )

  it('returns default tag with raw status text for unknown status', () => {
    const config = getStatusConfig('some_unknown_status', localise)

    expect(config.text).toBe('some_unknown_status')
    expect(config.class).toBe('epr-tag--no-max-width')
  })
})
