/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { fetchAccreditationDetails } from '#server/registrations/details/accreditations/helpers/fetch-accreditation-details.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/registrations/details/accreditations/helpers/fetch-accreditation-details.js')
)

const backendUrl = config.get('eprBackendUrl')
const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001-plastic-approved'
const registrationNumber = 'R26ER5001180041PL'
const path = `/organisations/500118/registrations/${registrationNumber}`

const operator = buildMockAuth()

const operatorWithoutWrite = buildMockAuth({
  ...sessionIdentity(IDENTITIES.operatorWithoutWrite)
})

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * The Entra callback refuses to mint this session, so it cannot arrive in
 * service. The branch is asserted against it anyway, because a predicate that
 * reads "not an operator" as "a regulator" would send exactly this session to
 * the wrong page.
 */
const unrecognised = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'nobody@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.unrecognised)
})

const registeredOnly = {
  status: {
    current: 'approved',
    timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: {
    address: { line1: 'Unit 4 Mill Road', town: 'Leeds', postcode: 'LS1 1AA' }
  },
  accreditations: {}
}

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 * @param {string} [url]
 */
const visit = async (server, auth, url = path) => {
  const response = await server.inject({ method: 'GET', url, auth })

  return {
    statusCode: response.statusCode,
    body: asHtml(response.result)
  }
}

/**
 * @param {string} body
 */
const headingOf = (body) =>
  getByRole(new JSDOM(body).window.document.body, 'heading', {
    level: 1
  }).textContent?.trim()

describe('who a registration renders for', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/500118`, () =>
        HttpResponse.json({
          organisationNumber: 500118,
          name: 'Kirkby Plastics Ltd',
          registrations: { [registrationNumber]: registeredOnly }
        })
      )
    )
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('gives a regulator the registration details page', async ({ server }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).toContain('Registration details')
  })

  it('gives an operator their own page, not the regulator one', async ({
    server
  }) => {
    const { statusCode, body } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).not.toContain('Registration details')
    expect(
      queryByRole(new JSDOM(body).window.document.body, 'heading', {
        name: 'Accredited periods'
      })
    ).toBeNull()
  })

  it.for([
    { name: 'a regulator', auth: regulator },
    { name: 'an operator', auth: operator }
  ])(
    'is not found for $name at a registration number the organisation does not hold',
    async ({ auth }, { server }) => {
      const { statusCode } = await visit(
        server,
        auth,
        '/organisations/500118/registrations/R99XX'
      )

      expect(statusCode).toBe(statusCodes.notFound)
    }
  )

  it.for([
    { name: 'a regulator', auth: regulator },
    { name: 'an operator', auth: operator }
  ])(
    'is not found for $name at an organisation number that is not digits',
    async ({ auth }, { server }) => {
      const { statusCode } = await visit(
        server,
        auth,
        `/organisations/500118x/registrations/${registrationNumber}`
      )

      expect(statusCode).toBe(statusCodes.notFound)
    }
  )

  it('renders an operator the identical page whether the regulator surface is on or off', async ({
    server
  }) => {
    const surfaceOn = await visit(server, operator)

    config.set('featureFlags.regulatorAccess', false)
    const surfaceOff = await visit(server, operator)
    config.set('featureFlags.regulatorAccess', true)

    expect(surfaceOff.statusCode).toBe(surfaceOn.statusCode)
    expect(surfaceOff.body).toBe(surfaceOn.body)
  })

  it('renders an operator who holds no write scope the identical page either way', async ({
    server
  }) => {
    const surfaceOn = await visit(server, operatorWithoutWrite)

    config.set('featureFlags.regulatorAccess', false)
    const surfaceOff = await visit(server, operatorWithoutWrite)
    config.set('featureFlags.regulatorAccess', true)

    expect(surfaceOff.body).toBe(surfaceOn.body)
  })

  it('keeps a session the backend named nobody on the operator page', async ({
    server
  }) => {
    const { body } = await visit(server, unrecognised)

    expect(headingOf(body)).not.toContain('Registration details')
  })

  it('gives a regulator the operator page while the regulator surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const { statusCode, body } = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).not.toContain('Registration details')
  })
})

describe('who an accreditation renders for', () => {
  const accreditationNumber = 'A26ER5001180114PL'
  const accreditationPath = `/organisations/500118/registrations/${registrationNumber}/accreditations/2026`
  const accreditation = {
    accreditationNumber,
    status: {
      current: 'approved',
      timeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
    }
  }
  const registration = {
    status: { current: 'approved', timeline: {} },
    validFrom: '2026-01-01',
    material: 'plastic',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'reprocessor',
    reprocessingType: 'input',
    site: { address: { line1: 'Unit 4 Mill Road' } },
    accreditations: { 2026: accreditation }
  }

  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchAccreditationDetails).mockResolvedValue(
      /** @type {Awaited<ReturnType<typeof fetchAccreditationDetails>>} */ (
        /** @type {unknown} */ ({
          organisation: {
            organisationNumber: 500118,
            name: 'Kirkby Plastics Ltd',
            registrations: {}
          },
          registration,
          accreditation,
          wasteBalance: null,
          reportingPeriods: [],
          cadence: null,
          ledgerEvents: null,
          packagingRecyclingNotes: []
        })
      )
    )
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('gives a regulator the accreditation page', async ({ server }) => {
    const { statusCode, body } = await visit(
      server,
      regulator,
      accreditationPath
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).toContain('Accreditation')
  })

  it("gives an operator their registration page for that year's accreditation", async ({
    server,
    msw
  }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/500118`, () =>
        HttpResponse.json({
          organisationNumber: 500118,
          name: 'Kirkby Plastics Ltd',
          registrations: { [registrationNumber]: registration }
        })
      ),
      http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
        HttpResponse.json({
          id: organisationId,
          orgId: 500118,
          registrations: [
            {
              id: registrationId,
              registrationNumber,
              accreditationId: 'acc-1',
              material: 'plastic'
            }
          ],
          accreditations: [
            { id: 'acc-1', accreditationNumber, validFrom: '2026-01-01' }
          ]
        })
      ),
      http.get(`${backendUrl}/organisations/500118/waste-balances/2026`, () =>
        HttpResponse.json({})
      ),
      http.get(
        `${backendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/acc-1/packaging-recycling-notes/december-prn-eligibility`,
        () => HttpResponse.json({ mode: 'pool', windowOpen: false })
      )
    )

    const { statusCode, body } = await visit(
      server,
      buildMockAuth({ linkedOrganisationId: organisationId }),
      accreditationPath
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(fetchAccreditationDetails).not.toHaveBeenCalled()
    expect(headingOf(body)).toContain('Plastic')
    expect(body).toContain(accreditationNumber)
  })
})
