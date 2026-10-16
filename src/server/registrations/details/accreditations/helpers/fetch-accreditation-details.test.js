import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, vi } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { test } from '#vite/fixtures/server.js'

import { fetchAccreditationDetails } from './fetch-accreditation-details.js'

/**
 * @import { HttpHandler } from 'msw'
 * @import { SetupServer } from 'msw/node'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { ReportingCalendar } from './fetch-accreditation-details.js'
 */

const backendUrl = config.get('eprBackendUrl')

describe(fetchAccreditationDetails, () => {
  const keys = {
    organisationNumber: '500118',
    registrationNumber: 'R26ER5001180041PL',
    year: '2026'
  }
  const backendToken = 'test-token'
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const credentials = buildMockAuth({
    linkedOrganisationId: organisationId,
    backendToken
  }).credentials
  const logger = createMockLogger()

  const organisationUrl = `${backendUrl}/organisations/500118`
  const registrationUrl = `${organisationUrl}/registrations/R26ER5001180041PL`
  const balancesUrl = `${organisationUrl}/waste-balances/2026`
  const calendarUrl = `${registrationUrl}/reports/calendar`
  const ledgerUrl = `${registrationUrl}/accreditations/2026/ledger`
  const organisationRecordUrl = `${backendUrl}/v1/organisations/${organisationId}`
  const notesUrl = `${organisationRecordUrl}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

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
  const organisation = {
    organisationNumber: 500118,
    name: 'Acme Recycling Ltd',
    registrations: { [keys.registrationNumber]: registration }
  }
  const organisationRecord = {
    id: organisationId,
    orgId: 500118,
    registrations: [
      {
        id: registrationId,
        registrationNumber: keys.registrationNumber,
        accreditationId
      }
    ],
    accreditations: [
      {
        id: accreditationId,
        accreditationNumber: accreditation.accreditationNumber,
        validFrom: '2026-01-01'
      }
    ]
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

  const backendFailure = expect.objectContaining({
    output: expect.objectContaining({
      statusCode: statusCodes.internalServerError
    })
  })
  const notFound = expect.objectContaining({
    output: expect.objectContaining({ statusCode: statusCodes.notFound })
  })

  /** @param {string} url */
  const failing = (url) =>
    http.get(
      url,
      () => new HttpResponse(null, { status: statusCodes.internalServerError })
    )

  /**
   * The backend answers every read; a handler passed in takes precedence.
   * @param {SetupServer} msw
   * @param {HttpHandler[]} overrides
   */
  const backendHolds = (msw, ...overrides) =>
    msw.use(
      ...overrides,
      http.get(organisationUrl, () => HttpResponse.json(organisation)),
      http.get(balancesUrl, () =>
        HttpResponse.json({
          A26OTHER: { amount: 1, availableAmount: 1 },
          [accreditation.accreditationNumber]: wasteBalance
        })
      ),
      http.get(
        `${organisationUrl}/registrations/:registrationNumber/reports/calendar`,
        () => HttpResponse.json(calendar)
      ),
      http.get(
        `${organisationUrl}/registrations/:registrationNumber/accreditations/:year/ledger`,
        () => HttpResponse.json({ events: ledgerEvents })
      ),
      http.get(organisationRecordUrl, () =>
        HttpResponse.json(organisationRecord)
      ),
      http.get(notesUrl, () => HttpResponse.json(packagingRecyclingNotes))
    )

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
  })

  test('reads the organisation by number, without a year', async ({ msw }) => {
    /** @type {string | undefined} */
    let requested
    backendHolds(
      msw,
      http.get(organisationUrl, ({ request }) => {
        requested = request.url
        return HttpResponse.json(organisation)
      })
    )

    await fetchDetails()

    expect(requested).toBe(organisationUrl)
  })

  test('combines the records, the balance, the calendar, the ledger and the notes', async ({
    msw
  }) => {
    backendHolds(msw)

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

  test('is not found for a registration number the organisation does not hold', async ({
    msw
  }) => {
    backendHolds(msw)

    await expect(
      fetchDetails({ registrationNumber: 'R99XX' })
    ).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound }
    })
  })

  test('is not found for a year the registration holds no accreditation for', async ({
    msw
  }) => {
    backendHolds(msw)

    await expect(fetchDetails({ year: '2025' })).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound }
    })
  })

  test('lets the backend refusing the organisation number through', async ({
    msw
  }) => {
    backendHolds(
      msw,
      http.get(
        organisationUrl,
        () => new HttpResponse(null, { status: statusCodes.notFound })
      )
    )

    await expect(fetchDetails()).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound }
    })
  })

  test("reads the year's balance by accreditation number", async ({ msw }) => {
    let authorization
    backendHolds(
      msw,
      http.get(balancesUrl, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({
          [accreditation.accreditationNumber]: wasteBalance
        })
      })
    )

    const result = await fetchDetails()

    expect(result.wasteBalance).toStrictEqual(wasteBalance)
    expect(authorization).toBe(`Bearer ${backendToken}`)
  })

  test('reports a balance it could not read as absent rather than failing the page', async ({
    msw
  }) => {
    backendHolds(msw, failing(balancesUrl))

    const result = await fetchDetails()

    expect(result.wasteBalance).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
  })

  test('reads the reporting calendar by number', async ({ msw }) => {
    backendHolds(msw)

    const result = await fetchDetails()

    expect(result.reportingPeriods).toStrictEqual(reportingPeriods)
    expect(result.cadence).toBe('monthly')
  })

  test('reports a calendar it could not read as no periods rather than failing the page', async ({
    msw
  }) => {
    backendHolds(msw, failing(calendarUrl))

    const result = await fetchDetails()

    expect(result.reportingPeriods).toStrictEqual([])
    expect(result.cadence).toBeNull()
    expect(logger.error).toHaveBeenCalledWith({
      message:
        'Failed to fetch reporting periods for organisation 500118 registration R26ER5001180041PL',
      err: backendFailure
    })
  })

  describe('the packaging recycling notes', () => {
    test('reads the notes by the ids the numbers resolve to', async ({
      msw
    }) => {
      backendHolds(msw)

      const result = await fetchDetails()

      expect(result.packagingRecyclingNotes).toStrictEqual(
        packagingRecyclingNotes
      )
    })

    test('reports notes it could not read as none rather than failing the page', async ({
      msw
    }) => {
      backendHolds(msw, failing(notesUrl))

      const result = await fetchDetails()

      expect(result.packagingRecyclingNotes).toStrictEqual([])
      expect(logger.error).toHaveBeenCalledWith({
        message:
          'Failed to fetch packaging recycling notes for organisation org-123 accreditation acc-789',
        err: backendFailure
      })
      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
    })

    test('fails the page where the ids could not be found', async ({ msw }) => {
      backendHolds(
        msw,
        http.get(
          organisationRecordUrl,
          () => new HttpResponse(null, { status: statusCodes.notFound })
        )
      )

      await expect(fetchDetails()).rejects.toThrow(notFound)
    })
  })

  describe('the waste balance ledger', () => {
    test("reads the accreditation's ledger by number", async ({ msw }) => {
      let authorization
      backendHolds(
        msw,
        http.get(ledgerUrl, ({ request }) => {
          authorization = request.headers.get('Authorization')
          return HttpResponse.json({ events: ledgerEvents })
        })
      )

      const result = await fetchDetails()

      expect(result.ledgerEvents).toStrictEqual(ledgerEvents)
      expect(authorization).toBe(`Bearer ${backendToken}`)
    })

    test('asks for no ledger, and answers none, for a session that may not read one', async ({
      msw
    }) => {
      let ledgerRequested = false
      backendHolds(
        msw,
        http.get(ledgerUrl, () => {
          ledgerRequested = true
          return HttpResponse.json({ events: ledgerEvents })
        })
      )

      const result = await fetchDetails({ canReadLedger: false })

      expect(result.ledgerEvents).toBeNull()
      expect(ledgerRequested).toBe(false)
    })

    test('fails the page for a ledger it could not read', async ({ msw }) => {
      backendHolds(msw, failing(ledgerUrl))

      await expect(fetchDetails()).rejects.toThrow(backendFailure)
    })
  })
})
