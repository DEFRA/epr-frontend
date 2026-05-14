import { describe, it, expect } from 'vitest'

import { getStatusTagClass } from './get-status-tag-class.js'

describe('get-status-tag-class', () => {
  describe('#getStatusTagClass', () => {
    it.each([
      { status: 'due', expected: 'govuk-tag--orange' },
      { status: 'in_progress', expected: 'govuk-tag--yellow' },
      { status: 'ready_to_submit', expected: '' },
      { status: 'submitted', expected: 'govuk-tag--green' }
    ])(
      'returns "$expected" modifier class for "$status" status',
      ({ status, expected }) => {
        expect(getStatusTagClass(status)).toBe(expected)
      }
    )

    it('returns empty string for null status', () => {
      expect(getStatusTagClass(null)).toBe('')
    })

    it('returns empty string for unrecognised status', () => {
      expect(getStatusTagClass('unknown')).toBe('')
    })
  })
})
