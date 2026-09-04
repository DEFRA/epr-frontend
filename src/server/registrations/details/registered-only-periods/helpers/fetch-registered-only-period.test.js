import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegisteredOnlyPeriod } from './fetch-registered-only-period.js'
import { fetchRegistrationDetails } from '../../helpers/fetch-registration-details.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationDetails } from '../../helpers/fetch-registration-details.js'
 */

vi.mock(import('../../helpers/fetch-registration-details.js'))
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const backendToken = 'test-token'

const error = vi.fn()
const logger = /** @type {TypedLogger} */ (/** @type {unknown} */ ({ error }))

const details = /** @type {RegistrationDetails} */ (
  /** @type {unknown} */ ({
    organisation: { id: organisationId },
    registration: { id: registrationId },
    accreditations: []
  })
)

const firstQuarter = /** @type {ReportingPeriod} */ (
  /** @type {unknown} */ ({ year: 2026, period: 1 })
)

const params = {
  organisationId,
  registrationId,
  backendToken,
  logger
}

describe(fetchRegisteredOnlyPeriod, () => {
  beforeEach(() => {
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(details)
    vi.mocked(fetchReportingPeriods).mockResolvedValue({
      cadence: 'quarterly',
      reportingPeriods: [firstQuarter]
    })
    error.mockClear()
  })

  it('returns the registration alongside the reporting calendar', async () => {
    await expect(fetchRegisteredOnlyPeriod(params)).resolves.toStrictEqual({
      ...details,
      cadence: 'quarterly',
      reportingPeriods: [firstQuarter]
    })
  })

  // The same address the operator's own reports page reads, asked nothing
  // further: what a registration owes is the backend's to decide, and one
  // endpoint answering both audiences is what keeps them agreeing.
  it('asks the calendar the same question the operator page asks', async () => {
    await fetchRegisteredOnlyPeriod(params)

    expect(fetchReportingPeriods).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      backendToken
    )
  })

  it('costs the page its table rather than the whole page when the calendar fails', async () => {
    vi.mocked(fetchReportingPeriods).mockRejectedValue(new Error('boom'))

    await expect(fetchRegisteredOnlyPeriod(params)).resolves.toStrictEqual({
      ...details,
      cadence: null,
      reportingPeriods: []
    })
  })

  it('says in the log why the table came back empty', async () => {
    vi.mocked(fetchReportingPeriods).mockRejectedValue(new Error('boom'))

    await fetchRegisteredOnlyPeriod(params)

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('reporting calendar')
      })
    )
  })

  // A registration the regulator cannot read is still a not-found page, so
  // this failure is not swallowed the way the calendar's is.
  it('lets a missing registration surface', async () => {
    vi.mocked(fetchRegistrationDetails).mockRejectedValue(
      new Error('not found')
    )

    await expect(fetchRegisteredOnlyPeriod(params)).rejects.toThrow('not found')
  })
})
