import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchAccreditationDetails } from './fetch-accreditation-details.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { ReportingCalendar } from './fetch-accreditation-details.js'
 */

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))
vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn()
  })
)
vi.mock(
  import('#server/common/helpers/waste-balance/get-waste-balance.js'),
  () => ({
    getWasteBalance: vi.fn()
  })
)

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
const { getWasteBalance } =
  await import('#server/common/helpers/waste-balance/get-waste-balance.js')

describe(fetchAccreditationDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'test-token'
  const logger = /** @type {TypedLogger} */ (
    /** @type {unknown} */ ({ error: vi.fn() })
  )

  const organisation = /** @type {Organisation} */ (
    /** @type {unknown} */ ({ id: organisationId, companyDetails: {} })
  )
  const registration = /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R123'
    })
  )
  const accreditation = { id: accreditationId, accreditationNumber: 'A123' }
  const wasteBalance = { amount: 120.5, availableAmount: 80.25 }
  /** @type {ReportingPeriod[]} */
  const reportingPeriods = [
    {
      year: 2026,
      period: 8,
      submissionNumber: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      dueDate: '2026-09-20',
      periodStatus: 'submitted',
      report: null
    }
  ]
  /** @type {ReportingCalendar} */
  const calendar = { cadence: 'monthly', reportingPeriods }
  /** @type {LedgerEvent[]} */
  const ledgerEvents = [
    {
      kind: 'prn-issued',
      createdAt: '2026-02-15T15:09:00.000Z',
      createdBy: { id: 'user-1', name: 'Ada Lovelace' },
      prn: { tonnage: 12.5 },
      balance: { closing: { total: 100, available: 87.5 } }
    }
  ]

  const isCalendarPath = (/** @type {string} */ path) =>
    path.endsWith('/reports/calendar')
  const isLedgerPath = (/** @type {string} */ path) =>
    path.endsWith('/waste-balance-ledger')

  /**
   * @param {{
   *   calendar?: Promise<ReportingCalendar>,
   *   ledger?: Promise<{ events: LedgerEvent[] }>
   * }} [answers]
   */
  const backendAnswers = ({
    calendar: calendarAnswer = Promise.resolve(calendar),
    ledger: ledgerAnswer = Promise.resolve({ events: ledgerEvents })
  } = {}) =>
    vi.mocked(fetchJsonFromBackend).mockImplementation((path) => {
      if (isCalendarPath(path)) {
        return calendarAnswer
      }

      if (isLedgerPath(path)) {
        return ledgerAnswer
      }

      return Promise.resolve(accreditation)
    })

  /**
   * @param {Partial<Parameters<typeof fetchAccreditationDetails>[0]>} [overrides]
   */
  const fetchDetails = (overrides) =>
    fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken,
      canReadLedger: true,
      logger,
      ...overrides
    })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    backendAnswers()
    vi.mocked(getWasteBalance).mockResolvedValue(wasteBalance)
  })

  it('reads the accreditation from the path the backend serves it at', async () => {
    await fetchDetails()

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    await fetchDetails({
      organisationId: 'org/123',
      registrationId: 'reg&456',
      accreditationId: 'acc?789'
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/accreditations/acc%3F789',
      expect.any(Object)
    )
  })

  it('reads the organisation and the registration alongside the accreditation', async () => {
    await fetchDetails()

    expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      backendToken
    )
  })

  it('reads the waste balance the accreditation holds', async () => {
    await fetchDetails()

    expect(getWasteBalance).toHaveBeenCalledWith(
      organisationId,
      accreditationId,
      backendToken,
      logger
    )
  })

  it('combines the organisation, the registration, the accreditation, its balance and its reporting calendar', async () => {
    const result = await fetchDetails()

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      wasteBalance,
      reportingPeriods,
      cadence: 'monthly',
      ledgerEvents
    })
  })

  it('reads the reporting calendar from the address the operator page reads it at', async () => {
    await fetchDetails()

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/reports/calendar`,
      expect.any(Object)
    )
  })

  it('reports a calendar it could not read as no periods rather than failing the page', async () => {
    const err = new Error('calendar unavailable')
    backendAnswers({ calendar: Promise.reject(err) })

    const result = await fetchDetails()

    expect(result.reportingPeriods).toStrictEqual([])
    expect(result.cadence).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
    expect(logger.error).toHaveBeenCalledWith({
      message: `Failed to fetch reporting periods for organisation ${organisationId} registration ${registrationId}`,
      err
    })
  })

  it('reports a balance it could not read as absent rather than failing the page', async () => {
    vi.mocked(getWasteBalance).mockResolvedValue(null)

    const result = await fetchDetails()

    expect(result.wasteBalance).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
  })

  describe('the waste balance ledger', () => {
    it('reads the ledger of the accreditation the address names', async () => {
      await fetchDetails()

      expect(fetchJsonFromBackend).toHaveBeenCalledWith(
        `/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/waste-balance-ledger`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${backendToken}`
          }
        }
      )
    })

    it('answers the events in the order the backend appended them', async () => {
      const result = await fetchDetails()

      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
    })

    it('asks for no ledger, and answers none, for a session that may not read one', async () => {
      const result = await fetchDetails({ canReadLedger: false })

      expect(result.ledgerEvents).toBeNull()
      expect(fetchJsonFromBackend).not.toHaveBeenCalledWith(
        expect.stringMatching(/waste-balance-ledger$/),
        expect.any(Object)
      )
    })

    it('fails the page for a ledger it could not read', async () => {
      const err = new Error('ledger unavailable')
      backendAnswers({ ledger: Promise.reject(err) })

      await expect(fetchDetails()).rejects.toBe(err)
    })
  })
})
