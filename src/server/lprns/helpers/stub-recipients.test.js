import { describe, it, expect } from 'vitest'
import { STUB_RECIPIENTS, getRecipientDisplayName } from './stub-recipients.js'

describe('#stub-recipients', () => {
  describe('#STUB_RECIPIENTS', () => {
    it('contains expected stub recipients', () => {
      expect(STUB_RECIPIENTS).toHaveLength(5)
      expect(STUB_RECIPIENTS.map((r) => r.value)).toStrictEqual([
        'producer-1',
        'producer-2',
        'producer-3',
        'scheme-1',
        'scheme-2'
      ])
    })
  })

  describe('#getRecipientDisplayName', () => {
    it('returns display name for known stub ID', () => {
      expect(getRecipientDisplayName('producer-1')).toBe('Acme Packaging Ltd')
      expect(getRecipientDisplayName('scheme-2')).toBe(
        'National Packaging Scheme'
      )
    })

    it('returns the original ID when not found in stub list', () => {
      expect(getRecipientDisplayName('unknown-id')).toBe('unknown-id')
    })

    it('returns the original value when given a display name (passthrough)', () => {
      expect(getRecipientDisplayName('Acme Packaging Ltd')).toBe(
        'Acme Packaging Ltd'
      )
    })
  })
})
