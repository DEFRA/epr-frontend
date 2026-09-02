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
import { asOrganisation } from '#server/common/test-helpers/organisation-fixtures.js'
import { fetchAccreditationDetails } from './helpers/fetch-accreditation-details.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

/**
 * @import { AccreditationDetails } from './helpers/fetch-accreditation-details.js'
 */

vi.mock(import('./helpers/fetch-accreditation-details.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const accreditationId = 'acc-001'
const path = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/** @type {AccreditationDetails} */
const accreditationDetails = {
  organisation: asOrganisation({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  }),
  registration: /** @type {AccreditationDetails['registration']} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL'
    })
  ),
  accreditation: {
    id: accreditationId,
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved',
    reprocessingType: 'input',
    dateRange: { validFrom: '2026-07-01', validTo: '2026-12-31' },
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    }
  },
  wasteBalance: { amount: 1234.5, availableAmount: 987.25 }
}

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = async (server, auth) => {
  const response = await server.inject({ method: 'GET', url: path, auth })

  return { statusCode: response.statusCode, body: asHtml(response.result) }
}

/** @param {string} body */
const documentOf = (body) => new JSDOM(body).window.document.body

describe('the accreditation details page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchAccreditationDetails).mockResolvedValue(accreditationDetails)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('names the accreditation and its period in the heading', async ({
    server
  }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent?.replace(
        /\s+/g,
        ' '
      )
    ).toContain('Accreditation 1 July to 31 December 2026')
  })

  it('sets the caption a size down and the period on its own line', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const heading = getByRole(documentOf(body), 'heading', { level: 1 })

    expect(getByText(heading, /Kirkby Plastics Ltd/).className).toBe(
      'govuk-caption-m govuk-!-margin-bottom-4'
    )
    expect(getByText(heading, '1 July to 31 December 2026').className).toBe(
      'govuk-!-display-block govuk-!-font-size-36'
    )
  })

  it('shows the status and the number', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(body).toContain('Accreditation status')
    expect(body).toContain('Approved')
    expect(body).toContain('A26ER5001180114PL')
  })

  it('shows the balance still available, and not the total behind it', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(body).toContain('Waste balance available (tonnes)')
    expect(body).toContain('987.25')
    expect(body).not.toContain('1,234.50')
  })

  it('offers a way back to the registration', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(body).toContain(
      `/organisations/${organisationId}/registrations/${registrationId}`
    )
  })

  it('does not exist for an operator', async ({ server }) => {
    const { statusCode } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for a regulator while the surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const { statusCode } = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
