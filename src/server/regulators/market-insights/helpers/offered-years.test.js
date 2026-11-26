import { afterEach, describe, expect, it, vi } from 'vitest'

import { offeredYears } from './offered-years.js'

/** @param {string} iso */
const at = (iso) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

describe(offeredYears, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers only 2026 during 2026', () => {
    at('2026-11-24T09:00:00.000Z')

    expect(offeredYears()).toStrictEqual([2026])
  })

  it('does not offer a year before it has a finished month', () => {
    at('2027-01-31T12:00:00.000Z')

    expect(offeredYears()).toStrictEqual([2026])
  })

  it('offers a year once its first month has finished in the UK, newest first', () => {
    at('2027-02-01T00:30:00.000Z')

    expect(offeredYears()).toStrictEqual([2027, 2026])
  })
})
