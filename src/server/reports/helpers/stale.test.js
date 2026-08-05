import { describe, it, expect } from 'vitest'
import {
  ReportStaleError,
  STALE_REASON,
  staleReasons,
  staleReasonsFromCode
} from './stale.js'

describe(ReportStaleError, () => {
  it('is an instance of Error', () => {
    const err = new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    expect(err).toBeInstanceOf(Error)
  })

  it('sets the message', () => {
    const err = new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    expect(err.message).toBe('Report is stale')
  })

  it('sets the name', () => {
    const err = new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    expect(err.name).toBe('ReportStaleError')
  })

  it('stores the reasons', () => {
    const err = new ReportStaleError([
      STALE_REASON.SUMMARY_LOG_CHANGED,
      STALE_REASON.PRN_CANCELLED
    ])
    expect(err.reasons).toStrictEqual([
      STALE_REASON.SUMMARY_LOG_CHANGED,
      STALE_REASON.PRN_CANCELLED
    ])
  })
})

// eslint-disable-next-line vitest/prefer-describe-function-title -- STALE_REASON is a frozen object, not a function; a string title is required here
describe('STALE_REASON', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(STALE_REASON)).toBe(true)
  })

  it('contains SUMMARY_LOG_CHANGED and PRN_CANCELLED', () => {
    expect(STALE_REASON.SUMMARY_LOG_CHANGED).toBe('summary_log_changed')
    expect(STALE_REASON.PRN_CANCELLED).toBe('prn_cancelled')
  })
})

describe(staleReasons, () => {
  it('returns [] for an empty stale object', () => {
    expect(staleReasons({})).toStrictEqual([])
  })

  it('returns [summary_log_changed] when only summaryLogChanged is set', () => {
    expect(
      staleReasons({ summaryLogChanged: { uploadedAt: '2026-01-01' } })
    ).toStrictEqual([STALE_REASON.SUMMARY_LOG_CHANGED])
  })

  it('returns [prn_cancelled] when only prnCancelled is set', () => {
    expect(
      staleReasons({ prnCancelled: { occurredAt: '2026-01-01' } })
    ).toStrictEqual([STALE_REASON.PRN_CANCELLED])
  })

  it('returns both reasons when both fields are set', () => {
    expect(
      staleReasons({
        summaryLogChanged: { uploadedAt: '2026-01-01' },
        prnCancelled: { occurredAt: '2026-01-01' }
      })
    ).toStrictEqual([
      STALE_REASON.SUMMARY_LOG_CHANGED,
      STALE_REASON.PRN_CANCELLED
    ])
  })
})

describe(staleReasonsFromCode, () => {
  it('returns the array unchanged when all codes are recognised', () => {
    expect(
      staleReasonsFromCode([
        STALE_REASON.SUMMARY_LOG_CHANGED,
        STALE_REASON.PRN_CANCELLED
      ])
    ).toStrictEqual([
      STALE_REASON.SUMMARY_LOG_CHANGED,
      STALE_REASON.PRN_CANCELLED
    ])
  })

  it('wraps a bare string code in an array, for backward compatibility with a pre-PAE-1698 backend', () => {
    expect(
      staleReasonsFromCode(STALE_REASON.SUMMARY_LOG_CHANGED)
    ).toStrictEqual([STALE_REASON.SUMMARY_LOG_CHANGED])
  })

  it('filters out codes that are not recognised stale reasons', () => {
    expect(
      staleReasonsFromCode(['version_conflict', STALE_REASON.PRN_CANCELLED])
    ).toStrictEqual([STALE_REASON.PRN_CANCELLED])
  })

  it('returns [] when no codes are recognised stale reasons', () => {
    expect(staleReasonsFromCode(['version_conflict'])).toStrictEqual([])
  })

  it('returns [] when code is missing', () => {
    expect(staleReasonsFromCode(undefined)).toStrictEqual([])
  })
})
