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

const regulatorWithoutLedgerScope = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'no.ledger@example.gov.uk' },
  role: IDENTITIES.regulator.role,
  scope: [SCOPES.organisationSearch]
})

/** @type {AccreditationDetails['ledgerEvents']} */
const ledgerEvents = [
  {
    kind: 'summary-log-submitted',
    createdAt: '2026-01-04T09:00:00.000Z',
    createdBy: { id: 'system' },
    summaryLog: { creditTotal: 100 },
    balance: { closing: { total: 100, available: 100 } }
  },
  {
    kind: 'prn-issued',
    createdAt: '2026-02-15T15:09:00.000Z',
    createdBy: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com'
    },
    prn: { tonnage: 12.5 },
    balance: { closing: { total: 100, available: 87.5 } }
  }
]

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
  wasteBalance: { amount: 1234.5, availableAmount: 987.25 },
  cadence: 'monthly',
  reportingPeriods: [
    /** @type {AccreditationDetails['reportingPeriods'][number]} */ (
      /** @type {unknown} */ ({
        year: 2026,
        period: 8,
        submissionNumber: 1,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        dueDate: '2026-09-20',
        periodStatus: 'submitted',
        report: { submittedAt: '2026-09-15T15:09:00.000Z' }
      })
    ),
    /** @type {AccreditationDetails['reportingPeriods'][number]} */ (
      /** @type {unknown} */ ({
        year: 2026,
        period: 7,
        submissionNumber: 1,
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        dueDate: '2026-08-20',
        periodStatus: 'overdue',
        report: null
      })
    )
  ],
  ledgerEvents
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

/**
 * @param {ReturnType<typeof documentOf>} body
 * @param {string} selector
 */
const cellsOf = (body, selector) =>
  [...body.querySelectorAll(selector)].map((cell) => cell.textContent?.trim())

/**
 * The ledger read follows the session: the helper is asked to read it only
 * where the session may, and answers none where it was not asked.
 */
const detailsForTheSession = () =>
  vi
    .mocked(fetchAccreditationDetails)
    .mockImplementation(async ({ canReadLedger }) => ({
      ...accreditationDetails,
      ledgerEvents: canReadLedger ? ledgerEvents : null
    }))

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

  it('lists the reporting periods below the summary, under their five headings', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    const table = documentOf(body).querySelector(
      '[data-testid="reports-table"]'
    )
    const headings = [...(table?.querySelectorAll('thead th') ?? [])].map(
      (cell) => cell.textContent?.trim()
    )

    expect(body.indexOf('govuk-summary-list')).toBeLessThan(
      body.indexOf('data-testid="reports-table"')
    )
    expect(headings).toStrictEqual([
      'Period',
      'Due date',
      'Submission date',
      'Status',
      'Actions'
    ])
  })

  it('reads a submitted period, its period naming the row', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    const firstRow = documentOf(body).querySelector(
      '[data-testid="reports-table"] tbody tr'
    )
    const cells = [...(firstRow?.querySelectorAll('th, td') ?? [])].map(
      (cell) => cell.textContent?.trim()
    )

    expect(firstRow?.firstElementChild?.tagName).toBe('TH')
    expect(cells).toStrictEqual([
      'August, 2026',
      '20 Sept 2026',
      '15 Sept 2026, 4:09pm',
      'Submitted',
      'View report August, 2026'
    ])
    expect(body).toContain(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/8/submissions/1/view`
    )
  })

  it('says why the table is empty rather than showing an empty table', async ({
    server
  }) => {
    vi.mocked(fetchAccreditationDetails).mockResolvedValue({
      ...accreditationDetails,
      cadence: null,
      reportingPeriods: []
    })

    const { body } = await visit(server, regulator)

    expect(body).not.toContain('data-testid="reports-table"')
    expect(body).toContain('data-testid="no-reports"')
    expect(body).toContain('There are no reporting periods')
  })

  it('lists the waste balance ledger beneath the reports, under its six headings', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(body.indexOf('data-testid="reports-table"')).toBeLessThan(
      body.indexOf('data-testid="waste-balance-ledger-table"')
    )
    expect(
      getByRole(document, 'heading', { level: 2, name: 'Waste balance ledger' })
    ).toBeDefined()
    expect(
      cellsOf(document, '[data-testid="waste-balance-ledger-table"] thead th')
    ).toStrictEqual([
      'Date and time',
      'Event',
      'Tonnage',
      'Balance',
      'Available',
      'Who'
    ])
  })

  it('reads the ledger newest first', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(
      cellsOf(
        documentOf(body),
        '[data-testid="waste-balance-ledger-table"] tbody tr:first-child td'
      )
    ).toStrictEqual([
      '15 February 2026, 3:09pm',
      'PRN issued',
      '12.50',
      '100.00',
      '87.50',
      'Ada Lovelace (ada@example.com)'
    ])
  })

  it('says so where nothing has moved the balance yet', async ({ server }) => {
    vi.mocked(fetchAccreditationDetails).mockResolvedValue({
      ...accreditationDetails,
      ledgerEvents: []
    })

    const { body } = await visit(server, regulator)

    expect(body).not.toContain('data-testid="waste-balance-ledger-table"')
    expect(
      getByText(documentOf(body), 'Nothing has changed this waste balance yet.')
    ).toBeDefined()
  })

  it('reads no ledger, and shows none, for a regulator the backend granted no ledger scope', async ({
    server
  }) => {
    detailsForTheSession()

    const { statusCode, body } = await visit(
      server,
      regulatorWithoutLedgerScope
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(fetchAccreditationDetails).toHaveBeenCalledWith(
      expect.objectContaining({ canReadLedger: false })
    )
    expect(body).not.toContain('Waste balance ledger')
    expect(body).not.toContain('Nothing has changed this waste balance yet.')
  })

  it('reads the ledger for a regulator holding the ledger scope', async ({
    server
  }) => {
    detailsForTheSession()

    const { body } = await visit(server, regulator)

    expect(fetchAccreditationDetails).toHaveBeenCalledWith(
      expect.objectContaining({ canReadLedger: true })
    )
    expect(body).toContain('data-testid="waste-balance-ledger-table"')
  })

  it('offers no way to change anything on the page', async ({ server }) => {
    const { body } = await visit(server, regulator)

    const main = documentOf(body).querySelector('#main-content')

    expect(main?.querySelectorAll('button, form')).toHaveLength(0)
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
