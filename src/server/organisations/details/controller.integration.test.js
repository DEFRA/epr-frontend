/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
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
  queryAllByRole,
  queryByRole,
  within
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const path = `/organisations/${organisationId}`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

const unrecognised = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'nobody@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.unrecognised)
})

const approvedGlass = {
  id: 'reg-001',
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  material: 'glass',
  glassRecyclingProcess: ['glass_re_melt'],
  accreditationId: 'acc-001',
  submittedToRegulator: 'ea',
  wasteProcessingType: 'reprocessor',
  site: { address: { line1: 'Site name A' } }
}

const rejectedAluminium = {
  id: 'reg-002',
  status: 'rejected',
  material: 'aluminium',
  submittedToRegulator: 'sepa',
  wasteProcessingType: 'reprocessor',
  site: { address: { line1: 'Site name A' } }
}

const exportedPaper = {
  id: 'reg-003',
  registrationNumber: 'R26EX5001180041PA',
  status: 'approved',
  material: 'paper',
  submittedToRegulator: 'ea',
  wasteProcessingType: 'exporter'
}

const organisation = asOrganisation({
  id: organisationId,
  companyDetails: { name: 'Kirkby Plastics Ltd' },
  registrations: [approvedGlass, rejectedAluminium, exportedPaper],
  accreditations: [{ id: 'acc-001', status: 'approved' }]
})

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

/** @param {string} body */
const documentOf = (body) => new JSDOM(body).window.document.body

/** @param {string} body */
const headingOf = (body) =>
  getByRole(documentOf(body), 'heading', { level: 1 }).textContent?.trim()

/** @param {string} body */
const rowsOf = (body) =>
  getAllByRole(within(documentOf(body)).getByRole('table'), 'row')
    .slice(1)
    .map((row) =>
      [...queryAllByRole(row, 'rowheader'), ...queryAllByRole(row, 'cell')].map(
        (cell) => cell.textContent?.trim()
      )
    )

describe('the organisation homepage a regulator reads', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchWasteBalances).mockResolvedValue({})
    vi.mocked(fetchOrganisationById).mockResolvedValue(organisation)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('heads the page with the organisation it is about', async ({ server }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).toContain('Organisation homepage')
    expect(documentOf(body).textContent).toContain('Kirkby Plastics Ltd')
  })

  it('names the columns the design asks for', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(
      getAllByRole(
        within(documentOf(body)).getByRole('table'),
        'columnheader'
      ).map((cell) => cell.textContent?.trim())
    ).toEqual([
      'Registration number',
      'Registration status',
      'Material',
      'Regulator',
      'Accreditation',
      'Actions'
    ])
  })

  it('reads each registration out of the record', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(rowsOf(body)).toEqual([
      [
        'R26ER5001180041PL',
        'Approved',
        'Glass remelt',
        'EA',
        'Approved',
        'View registration R26ER5001180041PL'
      ],
      [
        'Not applicable',
        'Rejected',
        'Aluminium',
        'SEPA',
        'Not applicable',
        'View registration Aluminium, Rejected'
      ]
    ])
  })

  it('opens a registration from the row that names it', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'link', {
        name: /^View registration\s*R26ER5001180041PL$/
      }).getAttribute('href')
    ).toBe(`/organisations/${organisationId}/registrations/reg-001`)
  })

  it('walks back to the organisation list', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'link', {
        name: 'All organisations'
      }).getAttribute('href')
    ).toBe('/regulators/home')
  })

  it('separates what the organisation exports from what it reprocesses', async ({
    server
  }) => {
    const { body } = await visit(server, regulator, `${path}/exporting`)

    expect(rowsOf(body).map(([number]) => number)).toEqual([
      'R26EX5001180041PA'
    ])
  })
})

describe('who the organisation page renders for', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchWasteBalances).mockResolvedValue({})
    vi.mocked(fetchOrganisationById).mockResolvedValue(organisation)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('gives an operator their own page, not the regulator one', async ({
    server
  }) => {
    const { statusCode, body } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).not.toContain('Organisation homepage')
    expect(
      queryByRole(documentOf(body), 'columnheader', { name: 'Regulator' })
    ).toBeNull()
  })

  it('renders an operator the identical page whether the regulator surface is on or off', async ({
    server
  }) => {
    const surfaceOn = await visit(server, operator)

    config.set('featureFlags.regulatorAccess', false)
    const surfaceOff = await visit(server, operator)
    config.set('featureFlags.regulatorAccess', true)

    expect(surfaceOn.statusCode).toBe(statusCodes.ok)
    expect(surfaceOff.statusCode).toBe(statusCodes.ok)
    expect(surfaceOff.body).toBe(surfaceOn.body)
  })

  it('keeps a session the backend named nobody on the operator page', async ({
    server
  }) => {
    const { body } = await visit(server, unrecognised)

    expect(headingOf(body)).not.toContain('Organisation homepage')
  })

  it('gives a regulator the operator page while the regulator surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const { statusCode, body } = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).not.toContain('Organisation homepage')
  })
})
