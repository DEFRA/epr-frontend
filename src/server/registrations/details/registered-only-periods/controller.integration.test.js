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
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { fetchRegistrationDetails } from '../helpers/fetch-registration-details.js'

/**
 * @import { RegistrationDetails } from '../helpers/fetch-registration-details.js'
 * @import { AccreditationResource } from '../helpers/types.js'
 */

vi.mock(import('../helpers/fetch-registration-details.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'

// The fixture registration starts on this date and never ends, so this year is
// one it has run over whatever year the suite runs in. Fake timers are not used
// here: they stall `server.inject`.
const YEAR = 2026
const pathFor = (/** @type {number | string} */ year) =>
  `/organisations/${organisationId}/registrations/${registrationId}/registered-only-periods/${year}`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {string | null} validFrom
 * @param {string | null} [validTo]
 * @returns {AccreditationResource}
 */
const anAccreditation = (validFrom, validTo = null) =>
  /** @type {AccreditationResource} */ ({
    id: 'acc-001',
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved',
    reprocessingType: 'input',
    dateRange: { validFrom, validTo },
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    }
  })

/**
 * @param {{
 *   accreditations?: AccreditationResource[],
 *   registrationNumber?: string | null,
 *   validFrom?: string | null
 * }} [overrides]
 * @returns {RegistrationDetails}
 */
const registrationDetails = ({
  accreditations = [],
  registrationNumber = 'R26ER5001180041PL',
  validFrom = '2026-01-01'
} = {}) => ({
  organisation: asOrganisation({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  }),
  registration: /** @type {RegistrationDetails['registration']} */ ({
    id: registrationId,
    organisation: { id: organisationId },
    registrationNumber,
    status: 'approved',
    material: 'plastic',
    reprocessingType: 'input',
    dateRange: { validFrom, validTo: null },
    accreditations: [],
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
      site: null
    }
  }),
  accreditations
})

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 * @param {number | string} [year]
 */
const visit = async (server, auth, year = YEAR) => {
  const response = await server.inject({
    method: 'GET',
    url: pathFor(year),
    auth
  })

  return { statusCode: response.statusCode, body: asHtml(response.result) }
}

/** @param {string} body */
const documentOf = (body) => new JSDOM(body).window.document.body

describe('the registered-only period page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(registrationDetails())
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('names the year it covers in the heading', async ({ server }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent?.replace(
        /\s+/g,
        ' '
      )
    ).toContain('2026 Registered-only periods')
  })

  it('names the organisation and the registration above the heading', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  it('drops the number for a registration that holds none', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(
      registrationDetails({ registrationNumber: null })
    )

    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('Kirkby Plastics Ltd')
  })

  // The two sentences are alternatives to the page's content, so a year that
  // holds data must show neither.
  it('says the period holds nothing where the accreditation ran from the start', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(
      registrationDetails({ accreditations: [anAccreditation('2026-01-01')] })
    )

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      queryByText(document, /This registered-only period doesn’t have any data/)
    ).not.toBeNull()
    expect(
      queryByText(document, /If you’d like to see the accreditation details/)
    ).not.toBeNull()
  })

  it('says nothing of the sort where the year holds registered-only time', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationDetails).mockResolvedValue(
      registrationDetails({ accreditations: [anAccreditation('2026-03-01')] })
    )

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      queryByText(document, /This registered-only period doesn’t have any data/)
    ).toBeNull()
    expect(
      queryByText(document, /If you’d like to see the accreditation details/)
    ).toBeNull()
  })

  it('offers a way back to the registration', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(body).toContain(
      `/organisations/${organisationId}/registrations/${registrationId}"`
    )
  })

  it('offers a regulator no control that changes the registration', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      document.querySelectorAll('#main-content button, #main-content form')
    ).toHaveLength(0)
  })

  it('does not exist for a year the registration never ran over', async ({
    server
  }) => {
    const { statusCode } = await visit(server, regulator, 2024)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for a year outside the range the service answers for', async ({
    server
  }) => {
    const { statusCode } = await visit(server, regulator, 1999)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for a year that is not a number', async ({ server }) => {
    const { statusCode } = await visit(server, regulator, 'last-year')

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for an operator', async ({ server }) => {
    const { statusCode } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  // Route validation runs before the handler that gates on the role, so a
  // rejected year must answer the same way a valid one does. A 400 here would
  // tell an operator the address exists.
  it('answers an operator identically whether or not the year is well formed', async ({
    server
  }) => {
    const malformed = await visit(server, operator, 'last-year')
    const wellFormed = await visit(server, operator)

    expect(malformed.statusCode).toBe(statusCodes.notFound)
    expect(wellFormed.statusCode).toBe(statusCodes.notFound)
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
