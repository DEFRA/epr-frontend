import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { beforeEach, it } from '#vite/fixtures/server.js'

import { fetchReportListDetails } from './fetch-report-list-details.js'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { ReportListDetails } from './fetch-report-list-details.js'
 */

/**
 * @typedef {{ authorization: string | null, pathname: string }} Received
 */

/**
 * @param {Received} a
 * @param {Received} b
 */
const byPathname = (a, b) => a.pathname.localeCompare(b.pathname)

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

describe(fetchReportListDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'token'

  const organisation = /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      companyDetails: { name: 'Kirkby Plastics Ltd' }
    })
  )

  const registration = /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      wasteProcessingType: 'reprocessor'
    })
  )

  const accreditation = {
    id: accreditationId,
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved'
  }

  /** @type {ReportListDetails['reportingPeriods']} */
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

  /**
   * @param {SetupServer} msw
   * @param {() => Response} [answer]
   */
  const backendAnswers = (
    msw,
    answer = () => HttpResponse.json({ cadence: 'monthly', reportingPeriods })
  ) => {
    /** @type {Received[]} */
    const received = []

    msw.use(
      http.get(/\/v1\/organisations\//, ({ request }) => {
        const { pathname } = new URL(request.url)
        received.push({
          authorization: request.headers.get('authorization'),
          pathname
        })

        return pathname.endsWith('/reports/calendar')
          ? answer()
          : HttpResponse.json(accreditation)
      })
    )

    return received
  }

  /** @type {Received[]} */
  let requests

  const fetchDetails = () =>
    fetchReportListDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

  beforeEach(({ msw }) => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    requests = backendAnswers(msw)
  })

  it('reads what the page shows, and nothing else', async () => {
    const result = await fetchDetails()

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      cadence: 'monthly',
      reportingPeriods
    })

    expect(requests).toHaveLength(2)
  })

  it('reads the accreditation and the calendar with the session token, encoding the ids in each path', async () => {
    await fetchReportListDetails({
      organisationId: 'org/123',
      registrationId: 'reg 456',
      accreditationId: 'acc?789',
      backendToken
    })

    expect(requests.toSorted(byPathname)).toStrictEqual(
      [
        '/v1/organisations/org%2F123/registrations/reg%20456/accreditations/acc%3F789',
        '/v1/organisations/org%2F123/registrations/reg%20456/reports/calendar'
      ]
        .map((pathname) => ({ authorization: 'Bearer token', pathname }))
        .toSorted(byPathname)
    )
  })

  it('fails the page where the calendar could not be read', async ({ msw }) => {
    backendAnswers(msw, () => new HttpResponse(null, { status: 503 }))

    await expect(fetchDetails()).rejects.toMatchObject({
      output: { statusCode: 503 }
    })
  })
})
