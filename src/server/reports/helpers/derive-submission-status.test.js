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

  it('returns "due" when period has ended and no report exists', () => {
    expect(deriveSubmissionStatus('2026-02-28', null)).toBe(
      SUBMISSION_STATUS.DUE
    )
  })

  it('returns "due" when period ended long ago and no report exists', () => {
    expect(deriveSubmissionStatus('2025-12-31', null)).toBe(
      SUBMISSION_STATUS.DUE
    )
  })

  it('returns null when period has not ended', () => {
    expect(deriveSubmissionStatus('2026-03-31', null)).toBeNull()
  })

  it('returns null when period has not ended and end date is far in future', () => {
    expect(deriveSubmissionStatus('2026-12-31', null)).toBeNull()
  })

  it('returns report status when report exists', () => {
    const report = { id: 'report-123', status: 'in_progress' }
    expect(deriveSubmissionStatus('2026-01-31', report)).toBe('in_progress')
  })

  it('returns report status when report is submitted', () => {
    const report = { id: 'report-456', status: 'submitted' }
    expect(deriveSubmissionStatus('2026-01-31', report)).toBe('submitted')
  })

  it('returns null when period end date is in the future', () => {
    expect(deriveSubmissionStatus('2026-03-31', null)).toBeNull()
  })
})
