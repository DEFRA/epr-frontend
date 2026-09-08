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
import { asOrganisation } from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByTestId,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { fetchOverseasSites } from './helpers/fetch-overseas-sites.js'

/**
 * @import { OverseasSiteDetail, OverseasSitesById, OverseasSitesDetails } from './helpers/fetch-overseas-sites.js'
 */

vi.mock(import('./helpers/fetch-overseas-sites.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'

const path = `/organisations/${organisationId}/registrations/${registrationId}/overseas-sites`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/** @type {OverseasSiteDetail} */
const bahiaPlasticos = {
  name: 'Bahia Plásticos',
  country: 'Brazil',
  address: {
    line1: 'Rua das Palmeiras 12',
    line2: 'Distrito Industrial',
    townOrCity: 'Salvador',
    stateOrRegion: 'Bahia',
    postcode: '40000-000'
  },
  coordinates: '-12.9777, -38.5016'
}

/** @type {OverseasSitesById} */
const aResolvedSite = { '007': bahiaPlasticos }

/**
 * @param {{
 *   registrationNumber?: string | null,
 *   sites?: OverseasSitesById
 * }} [overrides]
 * @returns {OverseasSitesDetails}
 */
const overseasSitesDetails = ({
  registrationNumber = 'R26ER5001180041PL',
  sites = aResolvedSite
} = {}) => ({
  organisation: asOrganisation({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  }),
  registration: /** @type {OverseasSitesDetails['registration']} */ ({
    id: registrationId,
    registrationNumber,
    status: 'approved',
    material: 'plastic'
  }),
  sites
})

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
    vi.mocked(fetchOverseasSites).mockResolvedValue(overseasSitesDetails())
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

  it('drops the number for a registration that holds none', async ({
    server
  }) => {
    vi.mocked(fetchOverseasSites).mockResolvedValue(
      overseasSitesDetails({ registrationNumber: null })
    )

    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('Kirkby Plastics Ltd')
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
    vi.mocked(fetchOverseasSites).mockResolvedValue(
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

  // A site the register holds no record of still names an id the registration
  // reprocesses through, so the row is shown with nothing filled in.
  it('dashes every value a site the register cannot resolve would carry', async ({
    server
  }) => {
    vi.mocked(fetchOverseasSites).mockResolvedValue(
      overseasSitesDetails({
        sites: {
          '014': {
            name: null,
            country: null,
            address: null,
            coordinates: null
          }
        }
      })
    )

    const { body } = await visit(server, regulator)
    const [, firstRow] = siteRows(body)

    expect(
      getAllByRole(firstRow, 'cell').map((cell) => cell.textContent?.trim())
    ).toStrictEqual(['Plastic', '-', '-', '-', '-', '-', '-', '-', '-'])
  })

  it('dashes the parts of an address a site leaves out', async ({ server }) => {
    vi.mocked(fetchOverseasSites).mockResolvedValue(
      overseasSitesDetails({
        sites: {
          '014': {
            ...bahiaPlasticos,
            address: {
              line1: 'Rua das Palmeiras 12',
              line2: null,
              townOrCity: 'Salvador',
              stateOrRegion: null,
              postcode: null
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
    vi.mocked(fetchOverseasSites).mockResolvedValue(
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

  it('does not exist for an operator', async ({ server }) => {
    const { statusCode } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('reads nothing from the backend for an operator', async ({ server }) => {
    await visit(server, operator)

    expect(fetchOverseasSites).not.toHaveBeenCalled()
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
