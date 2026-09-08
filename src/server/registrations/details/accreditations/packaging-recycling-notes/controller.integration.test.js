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
import { getAllByRole, getByRole, getByTestId } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { fetchPrnListDetails } from './helpers/fetch-prn-list-details.js'

/**
 * @import { PrnListDetails } from './helpers/fetch-prn-list-details.js'
 */

vi.mock(import('./helpers/fetch-prn-list-details.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const accreditationId = 'acc-001'
const accreditationPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`
const path = `${accreditationPath}/packaging-recycling-notes`

const operator = buildMockAuth()

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
  issuedAt: null,
  wasteProcessingType: 'reprocessor',
  processToBeUsed: '',
  isDecemberWaste: false,
  ...note
})

const packagingRecyclingNotes = [
  aNote({ status: 'awaiting_authorisation' }),
  aNote({ status: 'awaiting_cancellation' }),
  aNote({
    status: 'accepted',
    prnNumber: '240000123',
    issuedAt: '2026-01-28T09:00:00.000Z'
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
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      wasteProcessingType: 'reprocessor'
    })
  ),
  accreditation: /** @type {PrnListDetails['accreditation']} */ (
    /** @type {unknown} */ ({
      id: accreditationId,
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

  it('files each note under the table that draws it', async ({ server }) => {
    const { statusCode, body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(statusCode).toBe(statusCodes.ok)

    for (const testId of [
      'prns-awaiting-authorisation-table',
      'prns-awaiting-cancellation-table',
      'prns-issued-table',
      'prns-cancelled-table'
    ]) {
      expect(getAllByRole(getByTestId(document, testId), 'row')).toHaveLength(3)
    }
  })

  it('shows a regulator neither a draft note nor a discarded one', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(body).not.toContain('note-draft')
    expect(body).not.toContain('note-discarded')
  })

  it('numbers the issued and cancelled tables and dates them by issue', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const table = getByTestId(documentOf(body), 'prns-issued-table')

    expect(textOf(getAllByRole(table, 'columnheader'))).toStrictEqual([
      'Number',
      'Producer or compliance scheme',
      'Date issued',
      'Tonnage',
      'Status',
      'Actions'
    ])
  })

  it('gives the awaiting tables no number column, and dates them by creation', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const table = getByTestId(
      documentOf(body),
      'prns-awaiting-authorisation-table'
    )

    expect(textOf(getAllByRole(table, 'columnheader'))).toStrictEqual([
      'Producer or compliance scheme',
      'Date created',
      'Tonnage',
      'Status',
      'Actions'
    ])
  })

  it('carries no material column on any table', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(body).not.toContain('Material')
  })

  it('totals the tonnage of each table it draws', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const rows = getAllByRole(
      getByTestId(documentOf(body), 'prns-issued-table'),
      'row'
    )

    expect(textOf(getAllByRole(rows[2], 'cell'))).toStrictEqual([
      'Total',
      '',
      '',
      '20.00',
      '',
      ''
    ])
  })

  it('leaves the number and the issue date blank on a note the backend gave neither', async ({
    server
  }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      packagingRecyclingNotes: [
        aNote({ status: 'accepted', prnNumber: null, issuedAt: null })
      ]
    })

    const { body } = await visit(server, regulator)
    const rows = getAllByRole(
      getByTestId(documentOf(body), 'prns-issued-table'),
      'row'
    )

    // The number cell is empty rather than absent, so the row keeps the shape
    // of the table around it; the date falls back to when the note was made.
    expect(textOf(getAllByRole(rows[1], 'cell')).slice(0, 3)).toStrictEqual([
      '',
      'Radar Compliance PLC',
      '26 Jan 2026'
    ])
  })

  it('titles the page by the heading alone where the accreditation has no number', async ({
    server
  }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      accreditation: /** @type {PrnListDetails['accreditation']} */ ({
        ...details.accreditation,
        accreditationNumber: null
      })
    })

    const { body } = await visit(server, regulator)

    expect(documentOf(body).ownerDocument.title).toContain('PRNs')
  })

  it('says so in a tab that holds nothing while another holds notes', async ({
    server
  }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      packagingRecyclingNotes: [aNote({ status: 'awaiting_authorisation' })]
    })

    const { body } = await visit(server, regulator)

    expect(body).toContain('data-testid="prns-issued-table-none"')
    expect(body).toContain('data-testid="prns-cancelled-table-none"')
    expect(body).toContain('data-testid="prns-awaiting-authorisation-table"')
  })

  it('drops the tabs entirely where the accreditation has issued nothing', async ({
    server
  }) => {
    vi.mocked(fetchPrnListDetails).mockResolvedValue({
      ...details,
      packagingRecyclingNotes: [aNote({ status: 'draft' })]
    })

    const { body } = await visit(server, regulator)

    expect(body).toContain('data-testid="no-prns"')
    expect(body).not.toContain('govuk-tabs__list')
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

  it('offers a way back to the accreditation', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      document.querySelector('.govuk-back-link')?.getAttribute('href')
    ).toBe(accreditationPath)

    expect(
      textOf([...document.querySelectorAll('.govuk-breadcrumbs__list-item')])
    ).toStrictEqual([
      'All organisations',
      'Kirkby Plastics Ltd',
      'Registration details',
      'Accreditation details',
      'PRNs'
    ])
  })

  it('offers no way to change anything on the page', async ({ server }) => {
    const { body } = await visit(server, regulator)

    const main = documentOf(body).querySelector('#main-content')

    expect(main?.querySelectorAll('button, form')).toHaveLength(0)
    expect(main?.textContent).not.toContain('available waste balance')
  })

  describe('the fork with the operator list', () => {
    it('leaves an operator on their own list', async ({ server }) => {
      const { body } = await visit(server, operator)

      expect(body).not.toContain('data-testid="prns-detailed-view"')
      expect(fetchPrnListDetails).not.toHaveBeenCalled()
    })

    it('leaves a regulator on the operator list with the flag off', async ({
      server
    }) => {
      config.set('featureFlags.regulatorAccess', false)

      const { body } = await visit(server, regulator)

      expect(body).not.toContain('data-testid="prns-detailed-view"')
      expect(fetchPrnListDetails).not.toHaveBeenCalled()

      config.set('featureFlags.regulatorAccess', true)
    })
  })
})
