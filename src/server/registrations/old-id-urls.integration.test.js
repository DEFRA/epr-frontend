import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'
const organisationNumber = '500118'
const registrationNumber = 'R26ER5001180041PL'

const byIds = `/organisations/${organisationId}/registrations/${registrationId}`
const byNumbers = `/organisations/${organisationNumber}/registrations/${registrationNumber}`

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

const organisationView = {
  organisationNumber: 500118,
  name: 'Acme Recycling Ltd',
  registrations: {
    [registrationNumber]: {
      status: 'approved',
      validFrom: '2026-01-01',
      material: 'plastic',
      submittedToRegulator: { code: 'ea' },
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: { address: { fullAddress: 'North Road, Leeds' } },
      accreditations: {
        2026: {
          accreditationNumber: 'A26ER5001180114PL',
          status: 'approved',
          statusTimeline: { '2026-07-01T09:00:00.000Z': { status: 'approved' } }
        }
      }
    }
  }
}

const operator = buildMockAuth({ linkedOrganisationId: organisationId })

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * Answers the id lookup and regulator search the redirect makes, and the
 * natural-key reads the pages make.
 * @param {SetupServer} msw
 */
const backendHolds = (msw) =>
  msw.use(
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
      HttpResponse.json(organisation)
    ),
    http.get(`${backendUrl}/v1/organisations`, () =>
      HttpResponse.json({
        items: [{ id: organisationId, orgId: 500118 }],
        page: 1,
        pageSize: 1
      })
    ),
    http.get(`${backendUrl}/organisations/${organisationNumber}`, () =>
      HttpResponse.json(organisationView)
    ),
    http.get(`${backendUrl}${byNumbers}/reports/calendar`, () =>
      HttpResponse.json({ cadence: 'monthly', reportingPeriods: [] })
    ),
    http.get(`${backendUrl}${byNumbers}/ledger/2026`, () =>
      HttpResponse.json({ events: [] })
    )
  )

/**
 * @param {HapiServer} server
 * @param {string} url
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = (server, url, auth) => server.inject({ method: 'GET', url, auth })

describe('old registration and accreditation page URLs', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  describe('the registered-only period page', () => {
    const oldUrl = `${byIds}/registered-only-periods/2026`
    const newUrl = `${byNumbers}/registered-only-periods/2026`

    it('sends a regulator from the id URL to the number URL', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const redirect = await visit(server, oldUrl, regulator)
      const page = await visit(
        server,
        /** @type {string} */ (redirect.headers.location),
        regulator
      )

      expect(redirect.statusCode).toBe(statusCodes.found)
      expect(redirect.headers.location).toBe(newUrl)
      expect(page.statusCode).toBe(statusCodes.ok)
    })

    it('sends an operator from the id URL to the number URL, which is not found for them', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const redirect = await visit(server, oldUrl, operator)
      const page = await visit(
        server,
        /** @type {string} */ (redirect.headers.location),
        operator
      )

      expect(redirect.statusCode).toBe(statusCodes.found)
      expect(redirect.headers.location).toBe(newUrl)
      expect(page.statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('the accreditation reports page', () => {
    const oldUrl = `${byIds}/accreditations/${accreditationId}/reports`
    const newUrl = `${byNumbers}/accreditations/2026/reports`

    it('sends a regulator from the id URL to the number URL', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const redirect = await visit(server, oldUrl, regulator)
      const page = await visit(
        server,
        /** @type {string} */ (redirect.headers.location),
        regulator
      )

      expect(redirect.statusCode).toBe(statusCodes.found)
      expect(redirect.headers.location).toBe(newUrl)
      expect(page.statusCode).toBe(statusCodes.ok)
    })

    it('sends an operator from the id URL to the number URL, which is not found for them', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const redirect = await visit(server, oldUrl, operator)
      const page = await visit(
        server,
        /** @type {string} */ (redirect.headers.location),
        operator
      )

      expect(redirect.statusCode).toBe(statusCodes.found)
      expect(redirect.headers.location).toBe(newUrl)
      expect(page.statusCode).toBe(statusCodes.notFound)
    })
  })
})
