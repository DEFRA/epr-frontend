import { fetchLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegisteredOnlyPeriod } from './fetch-registered-only-period.js'
import { fetchRegistrationDetails } from '../../helpers/fetch-registration-details.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationDetails } from '../../helpers/fetch-registration-details.js'
 */

vi.mock(import('../../helpers/fetch-registration-details.js'))
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))
vi.mock(
  import('#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js')
)

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

const ledgerEvents = /** @type {LedgerEvent[]} */ (
  /** @type {unknown} */ ([{ kind: 'summary-log-submitted' }])
)

const params = {
  organisationId,
  registrationId,
  backendToken,
  canReadLedger: true,
  logger
}

describe(fetchRegisteredOnlyPeriod, () => {
  beforeEach(() => {
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(details)
    vi.mocked(fetchReportingPeriods).mockResolvedValue({
      cadence: 'quarterly',
      reportingPeriods: [firstQuarter]
    })
    vi.mocked(fetchLedgerEvents).mockResolvedValue(ledgerEvents)
    error.mockClear()
  })

  it('returns the registration alongside the reporting calendar', async () => {
    await expect(fetchRegisteredOnlyPeriod(params)).resolves.toStrictEqual({
      ...details,
      cadence: 'quarterly',
      reportingPeriods: [firstQuarter],
      ledgerEvents
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
      reportingPeriods: [],
      ledgerEvents
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

  describe('the waste balance ledger', () => {
    it('reads the ledger the registration keeps before it is accredited', async () => {
      await fetchRegisteredOnlyPeriod(params)

      expect(fetchLedgerEvents).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        accreditationId: undefined,
        backendToken
      })
    })

    it('answers the events in the order the backend appended them', async () => {
      const result = await fetchRegisteredOnlyPeriod(params)

      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
    })

    it('asks for no ledger, and answers none, for a session that may not read one', async () => {
      const result = await fetchRegisteredOnlyPeriod({
        ...params,
        canReadLedger: false
      })

      expect(result.ledgerEvents).toBeNull()
      expect(fetchLedgerEvents).not.toHaveBeenCalled()
    })

    it('fails the page for a ledger it could not read', async () => {
      const err = new Error('ledger unavailable')
      vi.mocked(fetchLedgerEvents).mockRejectedValue(err)

      await expect(fetchRegisteredOnlyPeriod(params)).rejects.toBe(err)
    })
  })
})
