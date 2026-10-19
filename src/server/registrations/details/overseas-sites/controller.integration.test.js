/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByTestId,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'

/**
 * @import { OrganisationView, OverseasSiteView, OverseasSitesByOrsId, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

vi.mock(import('#server/common/helpers/organisations/fetch-registration.js'))

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'

const organisationNumber = '500123'
const registrationNumber = 'R26ER5001180041PL'

const path = `/organisations/${organisationNumber}/registrations/${registrationNumber}/overseas-sites`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/** @type {OverseasSiteView} */
const bahiaPlasticos = {
  name: 'Bahia Plásticos',
  address: {
    country: 'Brazil',
    line1: 'Rua das Palmeiras 12',
    line2: 'Distrito Industrial',
    townOrCity: 'Salvador',
    stateOrRegion: 'Bahia',
    postcode: '40000-000'
  },
  coordinates: '-12.9777, -38.5016'
}

/**
 * @param {{ sites?: OverseasSitesByOrsId }} [overrides]
 * @returns {{ organisation: OrganisationView, registration: RegistrationView }}
 */
const overseasSitesDetails = ({ sites = { '007': bahiaPlasticos } } = {}) => {
  /** @type {RegistrationView} */
  const registration = {
    status: { current: 'approved', timeline: {} },
    validFrom: '2026-01-01',
    material: 'plastic',
    submittedToRegulator: { code: 'ea' },
    accreditations: {},
    wasteProcessingType: 'exporter',
    overseasSites: sites
  }

  return {
    organisation: {
      name: 'Kirkby Plastics Ltd',
      displayName: 'Kirkby Plastics Ltd',
      organisationNumber: 500123,
      registrations: { [registrationNumber]: registration }
    },
    registration
  }
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

/** @param {string} body */
const siteRows = (body) =>
  getAllByRole(getByTestId(documentOf(body), 'overseas-sites-table'), 'row')

describe('the overseas reprocessing sites page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchRegistration).mockResolvedValue(overseasSitesDetails())
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('names the sites it lists in the heading', async ({ server }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('Overseas reprocessing sites')
  })

  it('names the organisation and the registration above the heading', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  // The column order is the one the admin service already lists sites in, and
  // it is what a regulator reading both services expects to see twice.
  it('heads the table with the ten columns, in order', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const [headRow] = siteRows(body)

    expect(
      getAllByRole(headRow, 'columnheader').map((cell) =>
        cell.textContent?.trim()
      )
    ).toStrictEqual([
      'ORS ID',
      'Packaging waste category',
      'Destination country',
      'Overseas reprocessor name',
      'Address line 1',
      'Address line 2',
      'City or town',
      'State, province or region',
      'Postcode or similar',
      'Coordinates'
    ])
  })

  // The category is the registration's own material, which no site carries.
  it('reads a site across the row, category included', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const [, firstRow] = siteRows(body)

    expect(
      [
        ...getAllByRole(firstRow, 'rowheader'),
        ...getAllByRole(firstRow, 'cell')
      ].map((cell) => cell.textContent?.trim())
    ).toStrictEqual([
      '007',
      'Plastic',
      'Brazil',
      'Bahia Plásticos',
      'Rua das Palmeiras 12',
      'Distrito Industrial',
      'Salvador',
      'Bahia',
      '40000-000',
      '-12.9777, -38.5016'
    ])
  })

  it('lists the sites in ORS id order whatever order they arrive in', async ({
    server
  }) => {
    vi.mocked(fetchRegistration).mockResolvedValue(
      overseasSitesDetails({
        sites: {
          '021': { ...bahiaPlasticos, name: 'Third' },
          '003': { ...bahiaPlasticos, name: 'First' },
          '011': { ...bahiaPlasticos, name: 'Second' }
        }
      })
    )

    const { body } = await visit(server, regulator)
    const [, ...rows] = siteRows(body)

    expect(
      rows.map((row) => getAllByRole(row, 'rowheader')[0].textContent?.trim())
    ).toStrictEqual(['003', '011', '021'])
  })

  it('dashes the parts of an address a site leaves out', async ({ server }) => {
    vi.mocked(fetchRegistration).mockResolvedValue(
      overseasSitesDetails({
        sites: {
          '014': {
            ...bahiaPlasticos,
            address: {
              country: 'Brazil',
              line1: 'Rua das Palmeiras 12',
              townOrCity: 'Salvador'
            }
          }
        }
      })
    )

    const { body } = await visit(server, regulator)
    const [, firstRow] = siteRows(body)

    expect(
      getAllByRole(firstRow, 'cell')
        .slice(4, 8)
        .map((cell) => cell.textContent?.trim())
    ).toStrictEqual(['-', 'Salvador', '-', '-'])
  })

  // Approval is decided per accreditation and per scheme year, so it is not a
  // fact about a registration's site list. A column of dashes would assert one.
  it('shows no approval date anywhere on the page', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(queryByText(documentOf(body), /Valid from/)).toBeNull()
    expect(queryByText(documentOf(body), /Approv/)).toBeNull()
  })

  it('says so where the registration reprocesses overseas nowhere', async ({
    server
  }) => {
    vi.mocked(fetchRegistration).mockResolvedValue(
      overseasSitesDetails({ sites: {} })
    )

    const { body } = await visit(server, regulator)

    expect(body).not.toContain('data-testid="overseas-sites-table"')
    expect(
      queryByText(
        documentOf(body),
        'This registration holds no overseas reprocessing site.'
      )
    ).not.toBeNull()
  })

  it('offers a way back to the registration', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(body).toContain(
      `/organisations/${organisationNumber}/registrations/${registrationNumber}"`
    )
  })

  it('sends a regulator opening it by ids to its numbers', async ({
    server,
    msw
  }) => {
    msw.use(
      http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
        HttpResponse.json({
          id: organisationId,
          orgId: 500123,
          registrations: [{ id: registrationId, registrationNumber }],
          accreditations: []
        })
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: `/organisations/${organisationId}/registrations/${registrationId}/overseas-sites`,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(path)
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

  it('does not exist for an organisation number that is not digits, and reads nothing', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: `/organisations/5001x3/registrations/${registrationNumber}/overseas-sites`,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(fetchRegistration).not.toHaveBeenCalled()
  })

  it('does not exist for an operator', async ({ server }) => {
    const { statusCode } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('reads nothing from the backend for an operator', async ({ server }) => {
    await visit(server, operator)

    expect(fetchRegistration).not.toHaveBeenCalled()
  })

  // The two cases below are the gate's whole subject. A session's role and its
  // scopes are granted together in practice, so only a session holding one
  // without the other says which of them the page actually reads.
  it('does not exist for a regulator the backend grants no read scope', async ({
    server
  }) => {
    const { statusCode } = await visit(
      server,
      buildMockAuth({
        role: IDENTITIES.regulator.role,
        scope: [SCOPES.organisationSearch]
      })
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('exists for any session the backend grants the read scope', async ({
    server
  }) => {
    const { statusCode } = await visit(
      server,
      buildMockAuth({
        role: 'some_other_role',
        scope: [SCOPES.organisationRead]
      })
    )

    expect(statusCode).toBe(statusCodes.ok)
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
