import { SUBMISSION_STATUS } from '#server/reports/constants.js'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

import { deriveSubmissionStatus } from './derive-submission-status.js'

describe('#deriveSubmissionStatus', () => {
  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date('2026-03-20T12:00:00Z'),
      toFake: ['Date']
    })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it.each(
    /** @type {Array<{ status: import('#server/reports/constants.js').SubmissionStatusValue }>} */ ([
      { status: SUBMISSION_STATUS.IN_PROGRESS },
      { status: SUBMISSION_STATUS.READY_TO_SUBMIT },
      { status: SUBMISSION_STATUS.SUBMITTED }
    ])
  )(
    'returns the persisted "$status" status even though the due date has passed',
    ({ status }) => {
      const report = { id: 'report-123', status }

      expect(deriveSubmissionStatus('2026-01-31', '2026-02-20', report)).toBe(
        status
      )
    }
  )

  it('returns null when period has not ended', () => {
    expect(deriveSubmissionStatus('2026-03-31', '2026-04-20', null)).toBeNull()
  })

  it('returns null when period has not ended and end date is far in future', () => {
    expect(deriveSubmissionStatus('2026-12-31', '2027-01-20', null)).toBeNull()
  })

  it('returns "due" when period has ended but due date has not passed', () => {
    expect(deriveSubmissionStatus('2026-02-28', '2026-03-20', null)).toBe(
      SUBMISSION_STATUS.DUE
    )
  })

  it('returns "overdue" when the due date has passed', () => {
    expect(deriveSubmissionStatus('2025-12-31', '2026-01-20', null)).toBe(
      SUBMISSION_STATUS.OVERDUE
    )
  })

  describe('due-to-overdue boundary', () => {
    afterAll(() => {
      vi.setSystemTime(new Date('2026-03-20T12:00:00Z'))
    })

    it('returns "due" at 23:59 on the due date (the 20th)', () => {
      vi.setSystemTime(new Date('2026-02-20T23:59:59.999Z'))

      expect(deriveSubmissionStatus('2026-01-31', '2026-02-20', null)).toBe(
        SUBMISSION_STATUS.DUE
      )
    })

    it('returns "overdue" at 00:00 on the 21st', () => {
      vi.setSystemTime(new Date('2026-02-21T00:00:00Z'))

      expect(deriveSubmissionStatus('2026-01-31', '2026-02-20', null)).toBe(
        SUBMISSION_STATUS.OVERDUE
      )
    })
  })
})
