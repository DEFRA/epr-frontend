import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

/**
 * @import { SetupServer } from 'msw/node'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'
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
      status: 'approved',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
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
const byNumbers = `/organisations/500118/registrations/${registrationNumber}`

const operator = buildMockAuth({ linkedOrganisationId: organisationId })

/**
 * @param {SetupServer} msw
 */
const backendHolds = (msw) =>
  msw.use(
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
      HttpResponse.json(organisation)
    ),
    http.post(`${backendUrl}${byNumbers}/accreditations/2026/summary-log`, () =>
      HttpResponse.json({
        summaryLogId: 'sl-1',
        uploadId: 'up-1',
        uploadUrl: 'http://cdp/upload',
        statusUrl: 'http://cdp/status'
      })
    )
  )

describe('old summary-log page URLs', () => {
  it('sends the upload page on to its number URL, which starts an accredited upload', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const redirect = await server.inject({
      method: 'GET',
      url: `${byIds}/summary-logs/upload`,
      auth: operator
    })
    const page = await server.inject({
      method: 'GET',
      url: /** @type {string} */ (redirect.headers.location),
      auth: operator
    })

    expect(redirect.statusCode).toBe(statusCodes.found)
    expect(redirect.headers.location).toBe(`${byNumbers}/summary-logs/upload`)
    expect(page.statusCode).toBe(statusCodes.ok)
    expect(page.result).toContain('http://cdp/upload')
  })

  it('sends an upload returning to an old status URL on, keeping Welsh', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const redirect = await server.inject({
      method: 'GET',
      url: `/cy${byIds}/summary-logs/sl-1`,
      auth: operator
    })

    expect(redirect.statusCode).toBe(statusCodes.found)
    expect(redirect.headers.location).toBe(`/cy${byNumbers}/summary-logs/sl-1`)
  })

  it('sends a submit posted to the old URL on with a 307', async ({
    server,
    msw
  }) => {
    backendHolds(msw)
    const { cookie, crumb } = await getCsrfToken(
      server,
      `${byNumbers}/summary-logs/upload`,
      { auth: operator }
    )

    const redirect = await server.inject({
      method: 'POST',
      url: `${byIds}/summary-logs/sl-1/submit`,
      auth: operator,
      headers: { cookie },
      payload: { crumb }
    })

    expect(redirect.statusCode).toBe(statusCodes.temporaryRedirect)
    expect(redirect.headers.location).toBe(
      `${byNumbers}/summary-logs/sl-1/submit`
    )
  })
})
