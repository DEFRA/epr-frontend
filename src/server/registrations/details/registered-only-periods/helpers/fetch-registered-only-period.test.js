import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import Boom from '@hapi/boom'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchRegisteredOnlyLedgerEvents } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
import { fetchYearCalendar } from '#server/reports/helpers/fetch-reporting-periods.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegisteredOnlyPeriod } from './fetch-registered-only-period.js'

/**
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 */

vi.mock(import('#server/common/helpers/organisations/fetch-organisation.js'))
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))
vi.mock(
  import('#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js')
)

const organisationNumber = toOrganisationNumber('500118')
const registrationNumber = toRegistrationNumber('R26ER5001180041PL')
const backendToken = toBackendToken('test-token')

const error = vi.fn()
const info = vi.fn()
const logger = /** @type {TypedLogger} */ (
  /** @type {unknown} */ ({ error, info })
)

const registration = /** @type {RegistrationView} */ (
  /** @type {unknown} */ ({
    status: { current: 'approved', timeline: [] },
    accreditations: {}
  })
)

/** @type {OrganisationView} */
const organisation = {
  organisationNumber: toOrganisationNumber('500118'),
  name: 'Kirkby Plastics Ltd',
  displayName: 'Kirkby Plastics Ltd',
  registrations: { [registrationNumber]: registration }
}

const firstQuarter = /** @type {ReportingPeriod} */ (
  /** @type {unknown} */ ({ year: 2026, cadence: 'quarterly', period: 1 })
)

const january = /** @type {ReportingPeriod} */ (
  /** @type {unknown} */ ({ year: 2026, cadence: 'monthly', period: 1 })
)

const ledgerEvents = /** @type {LedgerEvent[]} */ (
  /** @type {unknown} */ ([{ kind: 'summary-log-submitted' }])
)

const keys = { organisationNumber, registrationNumber }

const params = {
  ...keys,
  year: 2026,
  backendToken,
  canReadLedger: true,
  logger
}

describe(fetchRegisteredOnlyPeriod, () => {
  beforeEach(() => {
    vi.mocked(fetchOrganisation).mockResolvedValue(organisation)
    vi.mocked(fetchYearCalendar).mockResolvedValue({
      year: 2026,
      registeredOnly: { reportingPeriods: [firstQuarter] },
      accredited: {
        accreditationNumber: 'A26ER5001180114PL',
        reportingPeriods: [january]
      }
    })
    vi.mocked(fetchRegisteredOnlyLedgerEvents).mockResolvedValue(ledgerEvents)
    error.mockClear()
    info.mockClear()
  })

  it("returns the registration from the read model alongside the year's registered-only periods", async () => {
    await expect(fetchRegisteredOnlyPeriod(params)).resolves.toStrictEqual({
      organisation,
      registration,
      reportingPeriods: [firstQuarter],
      ledgerEvents
    })
  })

  it('reads the organisation by its number', async () => {
    await fetchRegisteredOnlyPeriod(params)

    expect(fetchOrganisation).toHaveBeenCalledWith('500118', backendToken)
  })

  // The calendar the operator's own reports page reads, asked nothing
  // further: what a registration owes is the backend's to decide.
  it("asks the calendar for the page's year", async () => {
    await fetchRegisteredOnlyPeriod(params)

    expect(fetchYearCalendar).toHaveBeenCalledWith(
      { ...keys, year: 2026 },
      backendToken
    )
  })

  it('shows no periods for a year with no registered-only periods', async () => {
    vi.mocked(fetchYearCalendar).mockResolvedValue({ year: 2026 })

    await expect(fetchRegisteredOnlyPeriod(params)).resolves.toMatchObject({
      reportingPeriods: []
    })
  })

  it('costs the page its table rather than the whole page when the calendar fails', async () => {
    vi.mocked(fetchYearCalendar).mockRejectedValue(new Error('boom'))

    await expect(fetchRegisteredOnlyPeriod(params)).resolves.toStrictEqual({
      organisation,
      registration,
      reportingPeriods: [],
      ledgerEvents
    })
  })

  it('says in the log why the table came back empty', async () => {
    vi.mocked(fetchYearCalendar).mockRejectedValue(new Error('boom'))

    await fetchRegisteredOnlyPeriod(params)

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('reporting calendar')
      })
    )
  })

  it('is a registration not found for an organisation the backend does not know', async () => {
    vi.mocked(fetchOrganisation).mockRejectedValue(Boom.notFound())

    await expect(fetchRegisteredOnlyPeriod(params)).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: errorCodes.registrationNotFound
    })
  })

  it('lets any other failure reading the organisation surface', async () => {
    const err = Boom.internal('organisation unavailable')
    vi.mocked(fetchOrganisation).mockRejectedValue(err)

    await expect(fetchRegisteredOnlyPeriod(params)).rejects.toBe(err)
  })

  it('is not found for a registration number the organisation does not hold', async () => {
    await expect(
      fetchRegisteredOnlyPeriod({
        ...params,
        registrationNumber: toRegistrationNumber('R26XX1')
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } })
  })

  describe('the waste balance ledger', () => {
    it("reads the year's registered-only ledger by number", async () => {
      await fetchRegisteredOnlyPeriod(params)

      expect(fetchRegisteredOnlyLedgerEvents).toHaveBeenCalledWith(
        { ...keys, year: '2026' },
        backendToken
      )
    })

    it('asks for no ledger, and answers none, for a session that may not read one', async () => {
      const result = await fetchRegisteredOnlyPeriod({
        ...params,
        canReadLedger: false
      })

      expect(result.ledgerEvents).toBeNull()
      expect(fetchRegisteredOnlyLedgerEvents).not.toHaveBeenCalled()
    })

    it('answers an empty ledger for a year the backend has none for', async () => {
      vi.mocked(fetchRegisteredOnlyLedgerEvents).mockRejectedValue(
        Boom.notFound()
      )

      const result = await fetchRegisteredOnlyPeriod(params)

      expect(result.ledgerEvents).toStrictEqual([])
    })

    it('logs which ledger the backend had none for', async () => {
      vi.mocked(fetchRegisteredOnlyLedgerEvents).mockRejectedValue(
        Boom.notFound()
      )

      await fetchRegisteredOnlyPeriod(params)

      expect(info).toHaveBeenCalledWith({
        message: 'No registered-only ledger for the year, showing it empty',
        event: {
          action: 'fetch_registered_only_ledger',
          reason: `organisationNumber=${organisationNumber} registrationNumber=${registrationNumber} year=2026`
        }
      })
    })

    it('fails the page for a ledger it could not read', async () => {
      const err = Boom.internal('ledger unavailable')
      vi.mocked(fetchRegisteredOnlyLedgerEvents).mockRejectedValue(err)

      await expect(fetchRegisteredOnlyPeriod(params)).rejects.toBe(err)
    })
  })
})
