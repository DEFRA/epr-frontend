import { describe, expect, it } from 'vitest'

import { formatSubmittedDateTime } from './format-submitted-date-time.js'

describe(formatSubmittedDateTime, () => {
  it('reads a submission as its date and the time of day', () => {
    expect(formatSubmittedDateTime('2026-02-05T18:22:00.000Z')).toBe(
      '5 Feb 2026, 6:22pm'
    )
  })

  it('names the same day in both halves for a summer evening, which UTC has already carried into tomorrow', () => {
    expect(formatSubmittedDateTime('2026-07-31T23:30:00.000Z')).toBe(
      '1 Aug 2026, 12:30am'
    )
  })

  it('says nothing about a period that was never submitted', () => {
    expect(formatSubmittedDateTime(null)).toBe('')
  })

  it('says nothing when no timestamp is given at all', () => {
    expect(formatSubmittedDateTime(undefined)).toBe('')
  })
})
