/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import {
  asOrganisation,
  findRegistrationAndAccreditation
} from '#server/common/test-helpers/organisation-fixtures.js'
import { fetchRegistrationDetails } from '#server/registrations/details/helpers/fetch-registration-details.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

/**
 * @import { RegistrationDetails } from './details/helpers/fetch-registration-details.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))
vi.mock(
  import('#server/registrations/details/helpers/fetch-registration-details.js')
)

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001-glass-approved'
const path = `/organisations/${organisationId}/registrations/${registrationId}`

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

/** @type {RegistrationDetails} */
const registrationDetails = {
  organisation: asOrganisation({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  }),
  registration: {
    id: registrationId,
    organisation: { id: organisationId },
    registrationNumber: 'R26ER5001180041PL',
    status: 'approved',
    material: 'plastic',
    reprocessingType: 'input',
    dateRange: { validFrom: '2026-01-01' },
    accreditations: [],
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
      site: { address: { line1: 'Unit 4 Mill Road', town: 'Leeds' } }
    }
  },
  accreditations: []
}

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = async (server, auth) => {
  const response = await server.inject({ method: 'GET', url: path, auth })

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

  beforeEach(() => {
    vi.mocked(fetchWasteBalances).mockResolvedValue({})
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      findRegistrationAndAccreditation(fixtureData, registrationId)
    )
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(registrationDetails)
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
