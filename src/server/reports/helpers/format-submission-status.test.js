import { describe, expect, it } from 'vitest'

import { getStatusTagClass } from './format-submission-status.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 */

describe('#format-submission-status', () => {
  describe('#getStatusTagClass', () => {
    it.each(
      /** @type {Array<{ status: SubmissionStatusValue, expected: string }>} */ ([
        { status: 'due', expected: 'govuk-tag--orange' },
        { status: 'overdue', expected: 'govuk-tag--red' },
        { status: 'in_progress', expected: 'govuk-tag--yellow' },
        { status: 'ready_to_submit', expected: '' },
        { status: 'submitted', expected: 'govuk-tag--green' },
        {
          status: 'requires_resubmission',
          expected: 'govuk-tag--purple epr-tag--no-max-width'
        }
      ])
    )(
      'returns "$expected" modifier class for "$status" status',
      ({ status, expected }) => {
        expect(getStatusTagClass(status)).toBe(expected)
      }
    )
  })
})
