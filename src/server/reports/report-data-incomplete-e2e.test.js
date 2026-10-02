import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, vi } from 'vitest'

// Setup-only mock: fetchRegistrationAndAccreditation supplies the registration
// the detail page needs. fetchReportDetail is deliberately NOT mocked — this
// test drives the real fetch-report-detail -> fetch-report-backend client stack
// against an MSW-stubbed backend, so the whole wire contract runs: a real 200
// carrying incompleteSummaryLogRows becomes the signal the detail controller
// detects on the "Create draft" click, redirects on, and the screen renders.
// The controller/render permutations are covered by the other suites; this is
// the end-to-end contract anchor for the create-draft entry point.
vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

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

const incompletePreview = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  dueDate: '2026-05-31',
  source: { summaryLogId: null, lastUploadedAt: null },
  details: { material: 'plastic' },
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
  },
  incompleteSummaryLogRows: {
    total: 2,
    issues: [
      { sheet: 'Exported', rowId: '1001', field: 'SUPPLIER_NAME' },
      { sheet: 'Sent on', rowId: '4001', field: 'FINAL_DESTINATION_NAME' }
    ]
  }
}

/**
 * Stubs the backend report-detail GET to return a real 200 carrying
 * incompleteSummaryLogRows, drives the create-draft GET through the real client
 * stack, and returns the response plus the session cookie carrying the stored
 * issue payload.
 * @param {HapiServer} server
 * @param {{ use: (...handlers: object[]) => void }} msw
 * @returns {Promise<{ landed: object, sessionCookie: string }>}
 */
async function createDraftAgainstIncompleteBackend(server, msw) {
  msw.use(
    http.get(`${backendUrl}${backendPath}`, () =>
      HttpResponse.json(incompletePreview, { status: 200 })
    )
  )

  const landed = await server.inject({
    method: 'GET',
    url: periodUrl,
    auth: mockAuth
  })

  const setCookies = landed.headers['set-cookie']
  const sessionCookie =
    (Array.isArray(setCookies) ? setCookies : [setCookies])
      .filter(/** @returns {c is string} */ (c) => Boolean(c))
      .map((c) => c.split(';')[0])
      .join('; ') || ''

  return { landed, sessionCookie }
}

describe('report-data-incomplete (end to end via real backend client)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      exporterRegistration
    )
  })

  it('redirects the create-draft click to the screen on a real 200 carrying incompleteSummaryLogRows', async ({
    server,
    msw
  }) => {
    const { landed } = await createDraftAgainstIncompleteBackend(server, msw)

    expect(landed.statusCode).toBe(statusCodes.found)
    expect(landed.headers.location).toBe(`${periodUrl}/report-data-incomplete`)
  })

  it('renders the missing fields carried on the real preview body', async ({
    server,
    msw
  }) => {
    const { sessionCookie } = await createDraftAgainstIncompleteBackend(
      server,
      msw
    )

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: `${periodUrl}/report-data-incomplete`,
      auth: mockAuth,
      headers: { cookie: sessionCookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('We found 2 issues in your summary log.')
    expect(result).toContain('Row ID: 1001. Supplier name is missing')
    expect(result).toContain(
      'Row ID: 4001. Final destination facility name is missing'
    )
  })
})

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */
