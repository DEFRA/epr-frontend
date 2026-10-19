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
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

import organisationData from '#fixtures/organisation/organisationData.json' with { type: 'json' }

import { fetchPrnListDetails } from './helpers/fetch-prn-list-details.js'

/**
 * @import { PrnListDetails } from './helpers/fetch-prn-list-details.js'
 */

vi.mock(import('./helpers/fetch-prn-list-details.js'))

const organisationId = organisationData.id
const keys = {
  organisationNumber: '50002',
  registrationNumber: 'REG001234',
  year: '2026'
}
const organisationPath = '/organisations/50002'
const registrationPath = `${organisationPath}/registrations/REG001234`
const accreditationPath = `${registrationPath}/accreditations/2026`
const path = `${accreditationPath}/packaging-recycling-notes`

const operator = buildMockAuth({ linkedOrganisationId: organisationId })

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {Partial<PrnListDetails['packagingRecyclingNotes'][number]> & { status: string }} note
 * @returns {PrnListDetails['packagingRecyclingNotes'][number]}
 */
const aNote = (note) => ({
  id: `note-${note.status}`,
  prnNumber: null,
  issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
  tonnage: 20,
  material: 'plastic',
  createdAt: '2026-01-26T09:00:00.000Z',
  notes: null,
  issuedAt: null,
  issuedBy: null,
  wasteProcessingType: 'reprocessor',
  processToBeUsed: '',
  accreditationYear: 2026,
  isDecemberWaste: false,
  ...note
})

const packagingRecyclingNotes = [
  aNote({ status: 'awaiting_authorisation' }),
  aNote({ status: 'awaiting_cancellation' }),
  aNote({
    status: 'accepted',
    prnNumber: '240000123',
    issuedAt: '2026-01-28T09:00:00.000Z',
    isDecemberWaste: true
  }),
  aNote({
    status: 'cancelled',
    prnNumber: '240000124',
    issuedAt: '2026-01-29T09:00:00.000Z'
  }),
  aNote({ status: 'draft' }),
  aNote({ status: 'discarded' })
]

/** @type {PrnListDetails} */
const details = {
  organisation: asOrganisation({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  }),
  registration: /** @type {PrnListDetails['registration']} */ (
    /** @type {unknown} */ ({
      id: 'reg-001-glass-approved',
      registrationNumber: 'R26ER5001180041PL',
      wasteProcessingType: 'reprocessor'
    })
  ),
  accreditation: /** @type {PrnListDetails['accreditation']} */ (
    /** @type {unknown} */ ({
      id: 'acc-001-glass-approved',
      accreditationNumber: 'A26ER5001180114PL',
      status: 'approved'
    })
  ),
  packagingRecyclingNotes
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

/** @param {ReturnType<typeof getAllByRole>} cells */
const textOf = (cells) => cells.map((cell) => cell.textContent?.trim())

/**
 * @param {string} body
 * @param {string} panelId
 */
const panel = (body, panelId) =>
  /** @type {Parameters<typeof getAllByRole>[0]} */ (
    documentOf(body).querySelector(`#${panelId}`)
  )

describe('the regulator PRNs detailed view', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue(details)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('draws the same tabs and tables the operator is shown', async ({
    server
  }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)

    // Two tables in the awaiting-action tab, one in each of the others.
    expect(getAllByRole(panel(body, 'awaiting-action'), 'table')).toHaveLength(
      2
    )
    expect(getAllByRole(panel(body, 'issued'), 'table')).toHaveLength(1)
    expect(getAllByRole(panel(body, 'cancelled'), 'table')).toHaveLength(1)
  })

  it('heads the issued table as the operator does', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const table = getByRole(panel(body, 'issued'), 'table')

    expect(textOf(getAllByRole(table, 'columnheader'))).toStrictEqual([
      'PRN number',
      'Producer or compliance scheme',
      'Date issued',
      'Tonnage',
      'December waste?',
      'Status',
      'View in new tab'
    ])
  })

  it('shows December waste as Yes or No on the shared note-tables partial', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const table = getByRole(panel(body, 'issued'), 'table')
    const dataRow = getAllByRole(table, 'row')[1]

    expect(textOf(getAllByRole(dataRow, 'cell'))[4]).toBe('Yes')
  })

  it('shows a regulator neither a draft note nor a discarded one', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(body).not.toContain('note-draft')
    expect(body).not.toContain('note-discarded')
  })

  it('says so in a tab that holds nothing while another holds notes', async ({
    server
  }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      packagingRecyclingNotes: [aNote({ status: 'awaiting_authorisation' })]
    })

    const { body } = await visit(server, regulator)

    expect(getAllByRole(panel(body, 'awaiting-action'), 'table')).toHaveLength(
      1
    )
    expect(panel(body, 'issued').textContent).toContain('have been issued')
    expect(panel(body, 'cancelled').textContent).toContain('cancelled')
  })

  it('drops the tabs entirely where the accreditation has issued nothing', async ({
    server
  }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      packagingRecyclingNotes: []
    })

    const { body } = await visit(server, regulator)

    expect(body).not.toContain('govuk-tabs__list')
    expect(documentOf(body).textContent).toContain(
      'This accreditation has issued no PRNs'
    )
  })

  it('names the organisation, the registration and the accreditation', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(
      documentOf(body).querySelector('h1 [class^="govuk-caption-"]')
        ?.textContent
    ).toBe('Kirkby Plastics Ltd - R26ER5001180041PL - A26ER5001180114PL')
  })

  it('reads the details by the numbers and year in the address', async ({
    server
  }) => {
    await visit(server, regulator)

    expect(fetchPrnListDetails).toHaveBeenCalledWith({
      keys,
      credentials: regulator.credentials
    })
  })

  it("names an exporter's notes PERNs", async ({ server }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      registration: /** @type {PrnListDetails['registration']} */ ({
        ...details.registration,
        wasteProcessingType: 'exporter'
      })
    })

    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('PERNs')
  })

  it('walks back by the breadcrumbs, with no back link', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const document = documentOf(body)
    const crumbs = [
      ...document.querySelectorAll('.govuk-breadcrumbs__list-item')
    ]

    expect(document.querySelector('.govuk-back-link')).toBeNull()

    expect(textOf(crumbs)).toStrictEqual([
      'All organisations',
      'Kirkby Plastics Ltd',
      'Registration details',
      'Accreditation details',
      'PRNs'
    ])
    expect(
      crumbs.map((crumb) => crumb.querySelector('a')?.getAttribute('href'))
    ).toStrictEqual([
      '/regulators/home',
      organisationPath,
      registrationPath,
      accreditationPath,
      undefined
    ])
  })

  it('links each note by number', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(body).toContain(`${path}/note-accepted/view`)
  })

  it('offers none of the operator furniture', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const main = documentOf(body).querySelector('#main-content')

    expect(main?.querySelectorAll('button, form')).toHaveLength(0)
    expect(main?.textContent).not.toContain('available waste balance')
    expect(main?.textContent).not.toContain('Create a')
    expect(main?.textContent).not.toContain('You have not')
  })

  describe('the fork with the operator list', () => {
    beforeEach(({ msw }) => {
      const backendUrl = config.get('eprBackendUrl')
      const accreditedIn2026 = {
        ...organisationData,
        accreditations: organisationData.accreditations.map((accreditation) =>
          accreditation.id === 'acc-001-glass-approved'
            ? { ...accreditation, validFrom: '2026-01-01' }
            : accreditation
        )
      }

      msw.use(
        http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
          HttpResponse.json(accreditedIn2026)
        ),
        http.get(`${backendUrl}${organisationPath}/waste-balances/2026`, () =>
          HttpResponse.json({})
        ),
        http.get(`${backendUrl}${path}`, () =>
          HttpResponse.json({ items: [] })
        ),
        http.get(`${backendUrl}${path}/december-prn-eligibility`, () =>
          HttpResponse.json({ mode: 'pool', windowOpen: false })
        )
      )
    })

    it('leaves an operator on their own list', async ({ server }) => {
      const { statusCode, body } = await visit(server, operator)

      expect(statusCode).toBe(statusCodes.ok)
      expect(body).not.toContain('data-testid="prns-detailed-view"')
      expect(fetchPrnListDetails).not.toHaveBeenCalled()
    })

    it('leaves a regulator on the operator list with the flag off', async ({
      server
    }) => {
      config.set('featureFlags.regulatorAccess', false)

      const { body } = await visit(server, regulator)

      // The operator list refuses a session linked to no organisation.
      expect(body).not.toContain('data-testid="prns-detailed-view"')
      expect(fetchPrnListDetails).not.toHaveBeenCalled()

      config.set('featureFlags.regulatorAccess', true)
    })
  })
})
