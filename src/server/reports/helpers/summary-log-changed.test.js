import { describe, it, expect } from 'vitest'
import { SummaryLogChangedError } from './summary-log-changed.js'

describe(SummaryLogChangedError, () => {
  it('is an instance of Error', () => {
    const err = new SummaryLogChangedError('summary_log_changed')
    expect(err).toBeInstanceOf(Error)
  })

  it('sets the message', () => {
    const err = new SummaryLogChangedError('summary_log_changed')
    expect(err.message).toBe('Summary log has changed')
  })

  it('sets the name', () => {
    const err = new SummaryLogChangedError('summary_log_changed')
    expect(err.name).toBe('SummaryLogChangedError')
  })

  it('stores the reason', () => {
    const err = new SummaryLogChangedError('summary_log_changed')
    expect(err.reason).toBe('summary_log_changed')
  })
})
