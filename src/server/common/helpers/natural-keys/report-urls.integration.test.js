import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { CADENCE } from '#server/reports/constants.js'
import { buildPeriodPath } from '#server/reports/helpers/build-period-path.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'
const organisationNumber = '500118'
const registrationNumber = 'R26ER5001180041PL'

const organisation = {
  id: organisationId,
  orgId: 500118,
  companyDetails: { name: 'Acme Recycling Ltd' },
  registrations: [
    {
      id: registrationId,
      registrationNumber,
      accreditationId,
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
      site: {
        address: { line1: 'North Road', town: 'Leeds', postcode: 'LS1 1AA' }
      }
    }
  ],
  accreditations: [
    {
      id: accreditationId,
      accreditationNumber: 'A26ER5001180114PL',
      validFrom: '2026-07-01',
      status: 'approved'
    }
  ]
}

const byIds = `/organisations/${organisationId}/registrations/${registrationId}`
const byNumbers = `/organisations/${organisationNumber}/registrations/${registrationNumber}`
const quarterlyPage = `${byNumbers}/reports/2026/quarterly/1/submissions/1`
const accreditedPage = `${byNumbers}/accreditations/2026/reports/monthly/8/submissions/1`
const oldQuarterly = `${byIds}/reports/2026/quarterly/1/submissions/1`
const oldMonthly = `${byIds}/reports/2026/monthly/8/submissions/1`

const submittedReport = {
  status: 'submitted',
  createdAt: '2026-09-01T10:00:00.000Z',
  createdBy: { name: 'Ada Lovelace', position: 'Director' },
  submittedAt: '2026-09-02T10:00:00.000Z',
  submittedBy: { name: 'Ada Lovelace', position: 'Director' },
  version: 2,
  canRequestResubmission: false,
  recyclingActivity: {
    suppliers: [],
    totalTonnageReceived: 0,
    tonnageRecycled: 0,
    tonnageNotRecycled: 0
  },
  wasteSent: {
    tonnageSentToReprocessor: 0,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: []
  },
  prn: {
    issuedTonnage: 0,
    freeTonnage: 0,
    totalRevenue: 0,
    averagePricePerTonne: 0
  }
}

const operator = buildMockAuth({ linkedOrganisationId: organisationId })

/**
 * @param {SetupServer} msw
 */
const backendHolds = (msw) =>
  msw.use(
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
      HttpResponse.json(organisation)
    ),
    http.get(`${backendUrl}${quarterlyPage}`, () =>
      HttpResponse.json(submittedReport)
    ),
    http.get(`${backendUrl}${accreditedPage}`, () =>
      HttpResponse.json(submittedReport)
    )
  )

/**
 * Follows redirects, recording each hop's status and location.
 * @param {HapiServer} server
 * @param {string} url
 * @param {{ method?: string, auth?: object, headers?: object, payload?: object }} [options]
 */
const follow = async (server, url, { method = 'GET', ...options } = {}) => {
  const hops = []
  let response = await server.inject({
    method,
    url,
    auth: operator,
    ...options
  })

  while (
    [statusCodes.found, statusCodes.temporaryRedirect].includes(
      response.statusCode
    )
  ) {
    hops.push({
      status: response.statusCode,
      location: response.headers.location
    })
    response = await server.inject({
      method,
      url: /** @type {string} */ (response.headers.location),
      auth: operator,
      ...options
    })
  }

  return { hops, final: response }
}

describe('old report page URLs', () => {
  it('sends an old quarterly id URL to the registered-only page in one hop', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { hops, final } = await follow(server, `${oldQuarterly}/view`)

    expect(hops).toStrictEqual([
      { status: statusCodes.found, location: `${quarterlyPage}/view` }
    ])
    expect(final.statusCode).toBe(statusCodes.ok)
  })

  it('sends an old monthly id URL to the accredited page in two hops', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { hops, final } = await follow(server, `${oldMonthly}/view`)

    expect(hops).toStrictEqual([
      {
        status: statusCodes.found,
        location: `${byNumbers}/reports/2026/monthly/8/submissions/1/view`
      },
      { status: statusCodes.found, location: `${accreditedPage}/view` }
    ])
    expect(final.statusCode).toBe(statusCodes.ok)
  })

  it('keeps Welsh and the query string across both hops', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { hops } = await follow(server, `/cy${oldMonthly}/view?tab=x`)

    expect(hops.map(({ location }) => location)).toStrictEqual([
      `/cy${byNumbers}/reports/2026/monthly/8/submissions/1/view?tab=x`,
      `/cy${accreditedPage}/view?tab=x`
    ])
  })

  it('sends a POST to an old monthly URL on with a 307 at each hop', async ({
    server,
    msw
  }) => {
    backendHolds(msw)
    const { cookie, crumb } = await getCsrfToken(server, `${oldMonthly}/view`, {
      auth: operator
    })
    const payload = { supportingInformation: 'notes', action: 'save', crumb }

    const hop1 = await server.inject({
      method: 'POST',
      url: `${oldMonthly}/supporting-information`,
      auth: operator,
      headers: { cookie },
      payload
    })
    const hop2 = await server.inject({
      method: 'POST',
      url: /** @type {string} */ (hop1.headers.location),
      auth: operator,
      headers: { cookie },
      payload
    })

    expect([hop1.statusCode, hop2.statusCode]).toStrictEqual([
      statusCodes.temporaryRedirect,
      statusCodes.temporaryRedirect
    ])
    expect(hop2.headers.location).toBe(
      `${accreditedPage}/supporting-information`
    )
  })

  it("sends the registration page's id link to the reports list to R/reports", async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const response = await server.inject({
      method: 'GET',
      url: `${byIds}/reports`,
      auth: operator
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(`${byNumbers}/reports`)
  })

  describe('for a regulator', () => {
    const regulator = buildMockAuth({
      ...sessionIdentity(IDENTITIES.regulator)
    })

    beforeAll(() => {
      config.set('featureFlags.regulatorAccess', true)
    })

    afterAll(() => {
      config.set('featureFlags.regulatorAccess', false)
    })

    it('sends a monthly id link from the report tables to the accredited view', async ({
      server,
      msw
    }) => {
      backendHolds(msw)
      msw.use(
        http.get(`${backendUrl}/v1/organisations`, () =>
          HttpResponse.json({
            items: [{ id: organisationId, orgId: 500118 }],
            page: 1,
            pageSize: 1
          })
        )
      )
      const link = buildPeriodPath({
        organisationId,
        registrationId,
        period: /** @type {ReportingPeriod} */ (
          /** @type {unknown} */ ({
            year: 2026,
            period: 8,
            submissionNumber: 1
          })
        ),
        cadence: CADENCE.MONTHLY
      })

      const { hops, final } = await follow(server, `${link}/view`, {
        auth: regulator
      })

      expect(hops.at(-1)?.location).toBe(`${accreditedPage}/view`)
      expect(final.statusCode).toBe(statusCodes.ok)
    })
  })
})
