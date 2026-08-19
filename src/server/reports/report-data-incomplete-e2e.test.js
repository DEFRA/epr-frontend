import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, vi } from 'vitest'

// Setup-only mocks: fetchRegistrationAndAccreditation and fetchReportDetail are
// mocked so the crumb-priming GET renders. createReport is deliberately NOT
// mocked — this test drives the real create-report -> fetch-json client stack
// against an MSW-stubbed backend, so the whole wire-contract chain runs: a real
// 400 body becomes the Boom payload the controller detects, redirects on, and
// the screen renders. The other suites mock createReport and cover the render
// permutations; this is the end-to-end contract anchor.
vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/fetch-report-detail.js'))

const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
const { fetchReportDetail } = await import('./helpers/fetch-report-detail.js')

const backendUrl = config.get('eprBackendUrl')
const mockAuth = buildMockAuth()

const organisationId = 'org-123'
const registrationId = 'reg-001'
const periodUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1`
const backendPath = `/v1/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1`

const exporterRegistration = asRegistrationWithAccreditation({
  organisationData: { id: organisationId },
  registration: {
    id: registrationId,
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: undefined
})

const reportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  source: { summaryLogId: null, lastUploadedAt: null },
  details: { material: 'plastic', site: { address: {} } },
  recyclingActivity: {
    totalTonnageReceived: 0,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 0,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: []
  }
}

const incompletePayload = {
  reason: 'report_data_incomplete',
  total: 2,
  issues: [
    { sheet: 'Exported', rowId: '1001', field: 'SUPPLIER_NAME' },
    { sheet: 'Sent on', rowId: '4001', field: 'FINAL_DESTINATION_NAME' }
  ]
}

/**
 * Stubs the backend create call to return a real report_data_incomplete 400,
 * drives the create POST through the real client stack, and returns the
 * response plus the session cookie carrying the stored issue payload.
 * @param {HapiServer} server
 * @param {{ use: (...handlers: object[]) => void }} msw
 * @returns {Promise<{ created: object, sessionCookie: string }>}
 */
async function createAgainstIncompleteBackend(server, msw) {
  msw.use(
    http.post(`${backendUrl}${backendPath}`, () =>
      HttpResponse.json(incompletePayload, { status: 400 })
    )
  )

  const { cookie, crumb } = await getCsrfToken(server, periodUrl, {
    auth: mockAuth
  })

  const created = await server.inject({
    method: 'POST',
    url: periodUrl,
    auth: mockAuth,
    headers: { cookie },
    payload: { crumb }
  })

  const setCookies = created.headers['set-cookie']
  const sessionCookie =
    (Array.isArray(setCookies) ? setCookies : [setCookies])
      .filter(/** @returns {c is string} */ (c) => Boolean(c))
      .map((c) => c.split(';')[0])
      .join('; ') || cookie

  return { created, sessionCookie }
}

describe('report-data-incomplete (end to end via real backend client)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      exporterRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )
  })

  it('redirects to the screen on a real backend report_data_incomplete 400', async ({
    server,
    msw
  }) => {
    const { created } = await createAgainstIncompleteBackend(server, msw)

    expect(created.statusCode).toBe(statusCodes.found)
    expect(created.headers.location).toBe(`${periodUrl}/report-data-incomplete`)
  })

  it('renders the missing fields carried on the real 400 body', async ({
    server,
    msw
  }) => {
    const { sessionCookie } = await createAgainstIncompleteBackend(server, msw)

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: `${periodUrl}/report-data-incomplete`,
      auth: mockAuth,
      headers: { cookie: sessionCookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('We found 2 issues in your summary log.')
    expect(result).toContain('Row ID: 1001. Supplier name is missing')
    expect(result).toContain('Row ID: 4001. Final destination name is missing')
  })
})

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */
