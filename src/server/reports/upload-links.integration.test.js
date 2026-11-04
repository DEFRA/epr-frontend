import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const backendUrl = config.get('eprBackendUrl')
const operator = buildMockAuth()

const organisationNumber = '500001'
const registeredOnly = 'R25SR500030912PA'
const accredited = 'R25SR500030913PA'
const accreditationCancelled = 'R25SR500030914PA'

/**
 * @param {string} current
 * @param {string} accreditationNumber
 */
const accreditationIn2025 = (current, accreditationNumber) => ({
  2025: {
    accreditationNumber,
    status: {
      current,
      timeline: [{ status: current, at: '2025-01-01T00:00:00.000Z' }]
    }
  }
})

/** @param {object} accreditations */
const registrationSince2025 = (accreditations) => ({
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2025-01-01T00:00:00.000Z' }]
  },
  validFrom: '2025-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: {
    address: { line1: 'North Road', town: 'Leeds', postcode: 'LS1 1AA' }
  },
  accreditations
})

const organisationView = {
  organisationNumber: 500001,
  name: 'Acme Recycling Ltd',
  registrations: {
    [registeredOnly]: registrationSince2025({}),
    [accredited]: registrationSince2025(
      accreditationIn2025('approved', 'A25ER5000010001PL')
    ),
    [accreditationCancelled]: registrationSince2025(
      accreditationIn2025('cancelled', 'A25ER5000010002PL')
    )
  }
}

/** @param {string} registrationNumber */
const registrationUrl = (registrationNumber) =>
  `/organisations/${organisationNumber}/registrations/${registrationNumber}`

/** @param {string} registrationNumber */
const quarterlyReport = (registrationNumber) =>
  `${registrationUrl(registrationNumber)}/reports/2025/quarterly/1/submissions/1`

/** @param {string} registrationNumber */
const monthlyReport = (registrationNumber) =>
  `${registrationUrl(registrationNumber)}/accreditations/2025/reports/monthly/3/submissions/1`

/** @param {string} registrationNumber */
const registeredOnlyUpload = (registrationNumber) =>
  `${registrationUrl(registrationNumber)}/2025/summary-logs/upload`

/** @param {string} registrationNumber */
const accreditedUpload = (registrationNumber) =>
  `${registrationUrl(registrationNumber)}/accreditations/2025/summary-logs/upload`

const draft = {
  status: 'not_started',
  submissionNumber: 1,
  canRequestResubmission: false,
  year: 2025,
  startDate: '2025-03-01',
  endDate: '2025-03-31',
  dueDate: '2025-04-30',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2025-03-15T15:09:00.000Z' },
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

const monthlyDraft = { ...draft, cadence: 'monthly', period: 3 }
const quarterlyDraft = {
  ...draft,
  cadence: 'quarterly',
  period: 1,
  startDate: '2025-01-01'
}

const missingRows = {
  total: 1,
  issues: [{ sheet: 'Received', rowId: '1001', field: 'SUPPLIER_NAME' }]
}

/**
 * @param {SetupServer} msw
 * @param {string} reportUrl
 * @param {object} report
 */
const backendHolds = (msw, reportUrl, report) =>
  msw.use(
    http.get(`${backendUrl}/organisations/${organisationNumber}`, () =>
      HttpResponse.json(organisationView)
    ),
    http.get(`${backendUrl}${reportUrl}`, () => HttpResponse.json(report))
  )

/**
 * @param {HapiServer} server
 * @param {string} url
 * @param {string} [cookie]
 */
const pageBody = async (server, url, cookie) => {
  const { result } = await server.inject({
    method: 'GET',
    url,
    auth: operator,
    headers: cookie ? { cookie } : {}
  })

  return new JSDOM(result).window.document.body
}

/**
 * @param {Awaited<ReturnType<typeof pageBody>>} body
 * @param {RegExp} name
 */
const buttonHref = (body, name) =>
  getByRole(body, 'button', { name }).getAttribute('href')

/**
 * @param {string | string[] | undefined} setCookies
 * @returns {string}
 */
const sessionCookie = (setCookies) =>
  (Array.isArray(setCookies) ? setCookies : [setCookies])
    .filter(/** @returns {c is string} */ (c) => Boolean(c))
    .map((c) => c.split(';')[0])
    .join('; ')

/**
 * @param {Awaited<ReturnType<typeof pageBody>>} body
 */
const reportDataIncompleteLinks = (body) => [
  getByRole(body, 'link', { name: /choose the file again/ }).getAttribute(
    'href'
  ),
  buttonHref(body, /Upload a new summary log/)
]

describe("report pages link to the upload page for the report's year", () => {
  describe('make changes', () => {
    it('links a quarterly report to the registered-only upload page', async ({
      server,
      msw
    }) => {
      const report = quarterlyReport(registeredOnly)
      backendHolds(msw, report, {
        ...quarterlyDraft,
        status: 'submitted',
        canRequestResubmission: true
      })

      const body = await pageBody(server, `${report}/make-changes`)

      expect(buttonHref(body, /Upload new summary log/)).toBe(
        registeredOnlyUpload(registeredOnly)
      )
    })

    it('links a monthly report to the accredited upload page even when its accreditation is cancelled', async ({
      server,
      msw
    }) => {
      const report = monthlyReport(accreditationCancelled)
      backendHolds(msw, report, {
        ...monthlyDraft,
        status: 'submitted',
        canRequestResubmission: true
      })

      const body = await pageBody(server, `${report}/make-changes`)

      expect(buttonHref(body, /Upload new summary log/)).toBe(
        accreditedUpload(accreditationCancelled)
      )
    })
  })

  it('links a monthly draft report to the accredited upload page', async ({
    server,
    msw
  }) => {
    const report = monthlyReport(accredited)
    backendHolds(msw, report, monthlyDraft)

    const body = await pageBody(server, report)

    expect(buttonHref(body, /Upload new summary log/)).toBe(
      accreditedUpload(accredited)
    )
  })

  describe('report data incomplete', () => {
    it('links a quarterly report reached by viewing it to the registered-only upload page', async ({
      server,
      msw
    }) => {
      const report = quarterlyReport(registeredOnly)
      backendHolds(msw, report, {
        ...quarterlyDraft,
        incompleteSummaryLogRows: missingRows
      })

      const viewed = await server.inject({
        method: 'GET',
        url: report,
        auth: operator
      })
      const body = await pageBody(
        server,
        `${report}/report-data-incomplete`,
        sessionCookie(viewed.headers['set-cookie'])
      )

      expect(reportDataIncompleteLinks(body)).toStrictEqual([
        registeredOnlyUpload(registeredOnly),
        registeredOnlyUpload(registeredOnly)
      ])
    })

    it('links a monthly report reached by creating its draft to the accredited upload page', async ({
      server,
      msw
    }) => {
      const report = monthlyReport(accredited)
      backendHolds(msw, report, monthlyDraft)
      msw.use(
        http.post(`${backendUrl}${report}`, () =>
          HttpResponse.json(
            { reason: 'report_data_incomplete', ...missingRows },
            { status: statusCodes.badRequest }
          )
        )
      )
      const { cookie, crumb } = await getCsrfToken(server, report, {
        auth: operator
      })

      const created = await server.inject({
        method: 'POST',
        url: report,
        auth: operator,
        headers: { cookie },
        payload: { crumb }
      })
      const body = await pageBody(
        server,
        `${report}/report-data-incomplete`,
        sessionCookie(created.headers['set-cookie']) || cookie
      )

      expect(reportDataIncompleteLinks(body)).toStrictEqual([
        accreditedUpload(accredited),
        accreditedUpload(accredited)
      ])
    })
  })
})
