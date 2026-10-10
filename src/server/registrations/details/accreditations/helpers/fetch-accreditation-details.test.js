import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { beforeEach, it } from '#vite/fixtures/server.js'

import { fetchAccreditationDetails } from './fetch-accreditation-details.js'

/**
 * @import { SetupServerApi } from 'msw/node'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { ReportingCalendar } from './fetch-accreditation-details.js'
 */

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

  const unavailable = () => new HttpResponse(null, { status: 503 })

  /**
   * @param {SetupServerApi} msw
   * @param {{
   *   calendar?: () => Response,
   *   ledger?: () => Response,
   *   notes?: () => Response
   * }} [answers]
   */
  const backendAnswers = (
    msw,
    {
      calendar: calendarAnswer = () => HttpResponse.json(calendar),
      ledger: ledgerAnswer = () => HttpResponse.json({ events: ledgerEvents }),
      notes: notesAnswer = () => HttpResponse.json(packagingRecyclingNotes)
    } = {}
  ) => {
    /** @type {string[]} */
    const requestedPaths = []

    msw.use(
      http.get(/\/v1\/organisations\//, ({ request }) => {
        const { pathname } = new URL(request.url)
        requestedPaths.push(pathname)

        if (pathname.endsWith('/reports/calendar')) {
          return calendarAnswer()
        }

        if (pathname.endsWith('/waste-balance-ledger')) {
          return ledgerAnswer()
        }

        if (pathname.endsWith('/packaging-recycling-notes')) {
          return notesAnswer()
        }

        return HttpResponse.json(accreditation)
      })
    )

    return requestedPaths
  }

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

  beforeEach(({ msw }) => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    backendAnswers(msw)
    vi.mocked(getWasteBalance).mockResolvedValue(wasteBalance)
  })

  it('reads the accreditation, its calendar, ledger and notes from the paths the backend serves them at', async ({
    msw
  }) => {
    const requestedPaths = backendAnswers(msw)

    await fetchDetails()

    expect(requestedPaths.toSorted()).toStrictEqual(
      [
        '/v1/organisations/org-123/registrations/reg-456/accreditations/acc-789',
        '/v1/organisations/org-123/registrations/reg-456/accreditations/acc-789/packaging-recycling-notes',
        '/v1/organisations/org-123/registrations/reg-456/accreditations/acc-789/waste-balance-ledger',
        '/v1/organisations/org-123/registrations/reg-456/reports/calendar'
      ].toSorted()
    )
  })

  it('encodes URL path parameters with special characters', async ({ msw }) => {
    const requestedPaths = backendAnswers(msw)

    await fetchDetails({
      organisationId: 'org/123',
      registrationId: 'reg&456',
      accreditationId: 'acc?789'
    })

    expect(requestedPaths).toContain(
      '/v1/organisations/org%2F123/registrations/reg%26456/accreditations/acc%3F789'
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
      ledgerEvents,
      packagingRecyclingNotes
    })
  })

  it('reports a calendar it could not read as no periods rather than failing the page', async ({
    msw
  }) => {
    backendAnswers(msw, { calendar: unavailable })

    const result = await fetchDetails()

    expect(result.reportingPeriods).toStrictEqual([])
    expect(result.cadence).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
    expect(logger.error).toHaveBeenCalledWith({
      message: `Failed to fetch reporting periods for organisation ${organisationId} registration ${registrationId}`,
      err: expect.objectContaining({
        output: expect.objectContaining({ statusCode: 503 })
      })
    })
  })

  it('reports a balance it could not read as absent rather than failing the page', async () => {
    vi.mocked(getWasteBalance).mockResolvedValue(null)

    const result = await fetchDetails()

    expect(result.wasteBalance).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
  })

  describe('the packaging recycling notes', () => {
    it('reports notes it could not read as none rather than failing the page', async ({
      msw
    }) => {
      backendAnswers(msw, { notes: unavailable })

      const result = await fetchDetails()

      expect(result.packagingRecyclingNotes).toStrictEqual([])
      expect(logger.error).toHaveBeenCalledWith({
        message: `Failed to fetch packaging recycling notes for organisation ${organisationId} accreditation ${accreditationId}`,
        err: expect.objectContaining({
          output: expect.objectContaining({ statusCode: 503 })
        })
      })

      // The rest of the page is what a failed notes read must not cost.
      expect(result.accreditation).toStrictEqual(accreditation)
      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
      expect(result.reportingPeriods).toStrictEqual(reportingPeriods)
    })
  })

  describe('the waste balance ledger', () => {
    it('answers the events in the order the backend appended them', async () => {
      const result = await fetchDetails()

      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
    })

    it('asks for no ledger, and answers none, for a session that may not read one', async ({
      msw
    }) => {
      const requestedPaths = backendAnswers(msw)

      const result = await fetchDetails({ canReadLedger: false })

      expect(result.ledgerEvents).toBeNull()
      expect(requestedPaths).not.toContainEqual(
        expect.stringMatching(/waste-balance-ledger$/)
      )
    })

    it('fails the page for a ledger it could not read', async ({ msw }) => {
      backendAnswers(msw, { ledger: unavailable })

      await expect(fetchDetails()).rejects.toMatchObject({
        output: { statusCode: 503 }
      })
    })
  })
})
