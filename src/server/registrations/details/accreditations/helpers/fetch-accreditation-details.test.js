import Boom from '@hapi/boom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'

import { fetchAccreditationDetails } from './fetch-accreditation-details.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { ReportingCalendar } from './fetch-accreditation-details.js'
 */

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))
vi.mock(
  import('#server/common/helpers/natural-keys/find-record-ids.js'),
  () => ({ findRecordIds: vi.fn() })
)
vi.mock(
  import('#server/common/helpers/waste-balance/fetch-accreditation-balance.js'),
  () => ({ fetchAccreditationBalance: vi.fn() })
)

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { findRecordIds } =
  await import('#server/common/helpers/natural-keys/find-record-ids.js')
const { fetchAccreditationBalance } =
  await import('#server/common/helpers/waste-balance/fetch-accreditation-balance.js')

describe(fetchAccreditationDetails, () => {
  const keys = {
    organisationNumber: '500118',
    registrationNumber: 'R26ER5001180041PL',
    year: '2026'
  }
  const registrationPath =
    '/organisations/500118/registrations/R26ER5001180041PL'
  const backendToken = 'test-token'
  const credentials = /** @type {UserSession} */ (
    /** @type {unknown} */ ({ backendToken })
  )
  const logger = /** @type {TypedLogger} */ (
    /** @type {unknown} */ ({ error: vi.fn() })
  )

  const accreditation = {
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved',
    statusTimeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
  }
  const registration = {
    status: 'approved',
    validFrom: '2026-01-01',
    material: 'plastic',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'exporter',
    accreditations: { 2026: accreditation }
  }
  const organisation = /** @type {OrganisationView} */ (
    /** @type {unknown} */ ({
      organisationNumber: 500118,
      name: 'Acme Recycling Ltd',
      registrations: { [keys.registrationNumber]: registration }
    })
  )
  const ids = {
    organisationId: 'org-123',
    registrationId: 'reg-456',
    accreditationId: 'acc-789',
    registration: /** @type {Registration} */ (/** @type {unknown} */ ({}))
  }
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
      prn: { id: 'prn-001', prnNumber: '240000123', tonnage: 12.5 },
      balance: {
        opening: { total: 100, available: 87.5 },
        closing: { total: 87.5, available: 87.5 }
      }
    }
  ]
  /** @type {PackagingRecyclingNote[]} */
  const packagingRecyclingNotes = [
    {
      id: 'prn-001',
      prnNumber: '240000123',
      issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
      tonnage: 12.5,
      material: 'paper',
      status: 'accepted',
      createdAt: '2026-02-14T15:09:00.000Z',
      issuedAt: '2026-02-15T15:09:00.000Z',
      wasteProcessingType: 'reprocessor',
      processToBeUsed: '',
      isDecemberWaste: false
    }
  ]

  /**
   * @param {{
   *   calendar?: () => Promise<ReportingCalendar>,
   *   ledger?: () => Promise<{ events: LedgerEvent[] }>,
   *   notes?: () => Promise<PackagingRecyclingNote[]>
   * }} [answers]
   */
  const backendAnswers = ({
    calendar: calendarAnswer = () => Promise.resolve(calendar),
    ledger: ledgerAnswer = () => Promise.resolve({ events: ledgerEvents }),
    notes: notesAnswer = () => Promise.resolve(packagingRecyclingNotes)
  } = {}) =>
    vi.mocked(fetchJsonFromBackend).mockImplementation((path) => {
      if (path.endsWith('/reports/calendar')) {
        return calendarAnswer()
      }

      if (path.endsWith('/ledger')) {
        return ledgerAnswer()
      }

      if (path.endsWith('/packaging-recycling-notes')) {
        return notesAnswer()
      }

      return Promise.resolve(organisation)
    })

  /**
   * @param {Partial<Parameters<typeof fetchAccreditationDetails>[0]>} [overrides]
   */
  const fetchDetails = (overrides) =>
    fetchAccreditationDetails({
      ...keys,
      credentials,
      canReadLedger: true,
      logger,
      ...overrides
    })

  beforeEach(() => {
    vi.clearAllMocks()
    backendAnswers()
    vi.mocked(findRecordIds).mockResolvedValue(ids)
    vi.mocked(fetchAccreditationBalance).mockResolvedValue(wasteBalance)
  })

  it('reads the organisation by number, without a year', async () => {
    await fetchDetails()

    expect(fetchJsonFromBackend).toHaveBeenCalledWith('/organisations/500118', {
      method: 'GET',
      headers: { Authorization: `Bearer ${backendToken}` }
    })
  })

  it('combines the records, the balance, the calendar, the ledger and the notes', async () => {
    const result = await fetchDetails()

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      wasteBalance,
      reportingPeriods,
      cadence: 'monthly',
      ledgerEvents,
      packagingRecyclingNotes
    })
  })

  it('is not found for a registration number the organisation does not hold', async () => {
    await expect(
      fetchDetails({ registrationNumber: 'R99XX' })
    ).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound }
    })
  })

  it('is not found for a year the registration holds no accreditation for', async () => {
    await expect(fetchDetails({ year: '2025' })).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound }
    })
  })

  it('lets the backend refusing the organisation number through', async () => {
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(Boom.notFound())

    await expect(fetchDetails()).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound }
    })
  })

  it("reads the year's balance by accreditation number", async () => {
    await fetchDetails()

    expect(fetchAccreditationBalance).toHaveBeenCalledWith({
      organisationNumber: 500118,
      year: 2026,
      accreditationNumber: 'A26ER5001180114PL',
      backendToken,
      logger
    })
  })

  it('reports a balance it could not read as absent rather than failing the page', async () => {
    vi.mocked(fetchAccreditationBalance).mockResolvedValue(null)

    const result = await fetchDetails()

    expect(result.wasteBalance).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
  })

  it('reads the reporting calendar by number', async () => {
    await fetchDetails()

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `${registrationPath}/reports/calendar`,
      expect.any(Object)
    )
  })

  it('reports a calendar it could not read as no periods rather than failing the page', async () => {
    const err = new Error('calendar unavailable')
    backendAnswers({ calendar: () => Promise.reject(err) })

    const result = await fetchDetails()

    expect(result.reportingPeriods).toStrictEqual([])
    expect(result.cadence).toBeNull()
    expect(logger.error).toHaveBeenCalledWith({
      message:
        'Failed to fetch reporting periods for organisation 500118 registration R26ER5001180041PL',
      err
    })
  })

  describe('the packaging recycling notes', () => {
    it('reads the notes by the ids the numbers resolve to', async () => {
      const result = await fetchDetails()

      expect(findRecordIds).toHaveBeenCalledWith(keys, credentials)
      expect(fetchJsonFromBackend).toHaveBeenCalledWith(
        '/v1/organisations/org-123/registrations/reg-456/accreditations/acc-789/packaging-recycling-notes',
        expect.anything()
      )
      expect(result.packagingRecyclingNotes).toStrictEqual(
        packagingRecyclingNotes
      )
    })

    it('reports notes it could not read as none rather than failing the page', async () => {
      const err = new Error('nope')
      backendAnswers({ notes: () => Promise.reject(err) })

      const result = await fetchDetails()

      expect(result.packagingRecyclingNotes).toStrictEqual([])
      expect(logger.error).toHaveBeenCalledWith({
        message:
          'Failed to fetch packaging recycling notes for organisation org-123 accreditation acc-789',
        err
      })
      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
    })

    it('fails the page where the ids could not be found', async () => {
      const err = Boom.notFound()
      vi.mocked(findRecordIds).mockRejectedValue(err)

      await expect(fetchDetails()).rejects.toBe(err)
    })
  })

  describe('the waste balance ledger', () => {
    it("reads the accreditation's ledger by number", async () => {
      const result = await fetchDetails()

      expect(fetchJsonFromBackend).toHaveBeenCalledWith(
        `${registrationPath}/accreditations/2026/ledger`,
        { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
      )
      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
    })

    it('asks for no ledger, and answers none, for a session that may not read one', async () => {
      const result = await fetchDetails({ canReadLedger: false })

      expect(result.ledgerEvents).toBeNull()
      expect(fetchJsonFromBackend).not.toHaveBeenCalledWith(
        expect.stringMatching(/\/ledger$/),
        expect.any(Object)
      )
    })

    it('fails the page for a ledger it could not read', async () => {
      const err = new Error('ledger unavailable')
      backendAnswers({ ledger: () => Promise.reject(err) })

      await expect(fetchDetails()).rejects.toBe(err)
    })
  })
})
