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
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationNumber = '500118'
const registrationNumber = 'R26ER5001180041PL'
const registrationPath = `/organisations/${organisationNumber}/registrations/${registrationNumber}`

// The fixture registration starts on this date and never ends, so this year is
// one it has run over whatever year the suite runs in. Fake timers are not used
// here: they stall `server.inject`.
const YEAR = 2026
const pathFor = (/** @type {number | string} */ year) =>
  `${registrationPath}/registered-only-periods/${year}`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

// Every regulator holds the ledger scope, so this case is only reachable here.
const regulatorWithoutLedgerScope = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'no.ledger@example.gov.uk' },
  role: IDENTITIES.regulator.role,
  scope: [SCOPES.organisationSearch]
})

/**
 * An accreditation approved on `approvedOn` and never cancelled.
 * @param {string} approvedOn
 * @returns {AccreditationView}
 */
const anAccreditation = (approvedOn) => ({
  accreditationNumber: 'A26ER5001180114PL',
  status: {
    current: 'approved',
    timeline: { [`${approvedOn}T09:00:00.000Z`]: { status: 'approved' } }
  }
})

/**
 * The first quarter of the page's year, reported. The seeded accreditation
 * starts in July, so this quarter was owed while registered-only.
 */
const aSubmittedFirstQuarter = /** @type {ReportingPeriod} */ (
  /** @type {unknown} */ ({
    year: YEAR,
    period: 1,
    submissionNumber: 1,
    startDate: `${YEAR}-01-01`,
    endDate: `${YEAR}-03-31`,
    dueDate: `${YEAR}-04-20`,
    periodStatus: 'submitted',
    report: { submittedAt: `${YEAR}-04-15T15:09:00.000Z` }
  })
)

/**
 * A registered-only submission, which the backend writes zero-delta.
 * @param {string} [createdAt]
 * @returns {LedgerEvent}
 */
const aLedgerEvent = (createdAt = `${YEAR}-05-04T09:00:00.000Z`) => ({
  kind: 'summary-log-submitted',
  createdAt,
  summaryLog: { id: 'log-1', creditTotal: 0 },
  balance: {
    opening: { total: 0, available: 0 },
    closing: { total: 0, available: 0 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
})

/**
 * Approved on 1 January 2026 and never cancelled.
 * @type {RegistrationView['status']}
 */
const approvedSinceYear = {
  current: 'approved',
  timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
}

/**
 * @param {{
 *   accreditations?: Record<string, AccreditationView>,
 *   status?: RegistrationView['status']
 * }} [overrides]
 * @returns {OrganisationView}
 */
const anOrganisation = ({
  accreditations = {},
  status = approvedSinceYear
} = {}) => ({
  organisationNumber: 500118,
  name: 'Kirkby Plastics Ltd',
  displayName: 'Kirkby Plastics Ltd',
  registrations: {
    [registrationNumber]: {
      status,
      validFrom: '2026-01-01',
      material: 'plastic',
      submittedToRegulator: { code: 'ea' },
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: { address: { fullAddress: 'North Road, Leeds' } },
      accreditations
    }
  }
})

/**
 * Answers the read model, the calendar and the year's ledger by number.
 * @param {SetupServer} msw
 * @param {{
 *   accreditations?: Record<string, AccreditationView>,
 *   status?: RegistrationView['status'],
 *   cadence?: CadenceValue,
 *   reportingPeriods?: ReportingPeriod[],
 *   calendarStatus?: number,
 *   ledgerEvents?: LedgerEvent[],
 *   ledgerStatus?: number
 * }} [overrides]
 * @returns {{ ledgerRequests: () => number }}
 */
const backendHolds = (
  msw,
  {
    accreditations,
    status,
    cadence = 'quarterly',
    reportingPeriods = [],
    calendarStatus = statusCodes.ok,
    ledgerEvents = [aLedgerEvent()],
    ledgerStatus = statusCodes.ok
  } = {}
) => {
  let ledgerRequests = 0

  msw.use(
    http.get(`${backendUrl}/organisations/${organisationNumber}`, () =>
      HttpResponse.json(anOrganisation({ accreditations, status }))
    ),
    http.get(`${backendUrl}${registrationPath}/reports/calendar`, () =>
      HttpResponse.json(
        { cadence, reportingPeriods },
        { status: calendarStatus }
      )
    ),
    http.get(`${backendUrl}${registrationPath}/ledger/${YEAR}`, () => {
      ledgerRequests += 1
      return HttpResponse.json(
        { events: ledgerEvents },
        { status: ledgerStatus }
      )
    })
  )

  return { ledgerRequests: () => ledgerRequests }
}

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 * @param {number | string} [year]
 * @param {string} [path]
 */
const visit = async (server, auth, year = YEAR, path = pathFor(year)) => {
  const response = await server.inject({ method: 'GET', url: path, auth })

  return { statusCode: response.statusCode, body: asHtml(response.result) }
}

/** @param {string} body */
const documentOf = (body) => new JSDOM(body).window.document.body

describe('the registered-only period page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.wasteRecordsDownload', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.wasteRecordsDownload', false)
  })

  it('names the year it covers in the heading', async ({ server, msw }) => {
    backendHolds(msw)

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
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'heading', { level: 1 }).textContent
    ).toContain('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  // The two sentences are alternatives to the page's content, so a year that
  // holds data must show neither.
  it('says the period holds nothing where the accreditation ran from the start', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: { 2026: anAccreditation('2026-01-01') }
    })

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
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: { 2026: anAccreditation('2026-03-01') }
    })

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      queryByText(document, /This registered-only period doesn’t have any data/)
    ).toBeNull()
    expect(
      queryByText(document, /If you’d like to see the accreditation details/)
    ).toBeNull()
  })

  // The quarters a registered-only operator owed are the point of the page, so
  // the real copy is asserted here rather than against a mocked localiser.
  it('lists the quarters the operator owed while registered-only', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: { 2026: anAccreditation('2026-07-01') },
      reportingPeriods: [aSubmittedFirstQuarter]
    })

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      getByRole(document, 'heading', { name: 'Reports', level: 2 })
    ).not.toBeNull()

    const table = document.querySelector('[data-testid="reports-table"]')

    expect(table?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Quarter 1, 2026'
    )
    expect(table?.textContent).toContain('20 Apr 2026')
    expect(table?.textContent).toContain('Submitted')
  })

  it('opens a submitted quarter at the report it holds, by number', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: { 2026: anAccreditation('2026-07-01') },
      reportingPeriods: [aSubmittedFirstQuarter]
    })

    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'link', {
        name: /^View\s*Quarter 1, 2026$/
      }).getAttribute('href')
    ).toBe(`${registrationPath}/reports/2026/quarterly/1/submissions/1/view`)
  })

  it('says so where the year holds registered-only time but no ended period', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, regulator)

    expect(
      queryByText(
        documentOf(body),
        /There are no reporting periods for this registered-only period yet/
      )
    ).not.toBeNull()
  })

  it('still renders where the calendar could not be read', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { calendarStatus: statusCodes.internalServerError })

    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      queryByText(
        documentOf(body),
        /There are no reporting periods for this registered-only period yet/
      )
    ).not.toBeNull()
  })

  // The empty state replaces the page's content rather than sitting above it.
  it('shows no reports section at all where the period holds nothing', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: { 2026: anAccreditation('2026-01-01') }
    })

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      document.querySelector('[data-testid="app-page-body"] h2')
    ).toBeNull()
  })

  it('offers a way back to the organisation and the registration, by number', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, regulator)

    expect(body).toContain(`href="/organisations/${organisationNumber}"`)
    expect(body).toContain(`href="${registrationPath}"`)
  })

  it('offers a regulator no control that changes the registration', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      document.querySelectorAll('#main-content button, #main-content form')
    ).toHaveLength(0)
  })

  it('does not exist for a year the registration never ran over', async ({
    server,
    msw
  }) => {
    backendHolds(msw)
    msw.use(
      http.get(`${backendUrl}${registrationPath}/ledger/2024`, () =>
        HttpResponse.json({ events: [] }, { status: statusCodes.notFound })
      )
    )

    const { statusCode } = await visit(server, regulator, 2024)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for a year the registration spent wholly cancelled', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      status: {
        current: 'cancelled',
        timeline: {
          '2025-01-01T00:00:00.000Z': { status: 'approved' },
          '2025-06-01T09:00:00.000Z': { status: 'cancelled' }
        }
      }
    })

    const { statusCode } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for an organisation number that is not digits', async ({
    server
  }) => {
    const { statusCode } = await visit(
      server,
      regulator,
      YEAR,
      `/organisations/500118x/registrations/${registrationNumber}/registered-only-periods/${YEAR}`
    )

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

  it('does not exist for an organisation number the backend does not know', async ({
    server,
    msw
  }) => {
    backendHolds(msw)
    const unknown = `/organisations/500999/registrations/${registrationNumber}`
    msw.use(
      http.get(`${backendUrl}/organisations/500999`, () =>
        HttpResponse.json({}, { status: statusCodes.notFound })
      ),
      http.get(`${backendUrl}${unknown}/reports/calendar`, () =>
        HttpResponse.json({}, { status: statusCodes.notFound })
      ),
      http.get(`${backendUrl}${unknown}/ledger/${YEAR}`, () =>
        HttpResponse.json({}, { status: statusCodes.notFound })
      )
    )

    const { statusCode } = await visit(
      server,
      regulator,
      YEAR,
      `${unknown}/registered-only-periods/${YEAR}`
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist for a registration number the organisation does not hold', async ({
    server,
    msw
  }) => {
    backendHolds(msw)
    const unknown = `/organisations/${organisationNumber}/registrations/R26ER5009990041PL`
    msw.use(
      http.get(`${backendUrl}${unknown}/reports/calendar`, () =>
        HttpResponse.json({}, { status: statusCodes.notFound })
      ),
      http.get(`${backendUrl}${unknown}/ledger/${YEAR}`, () =>
        HttpResponse.json({}, { status: statusCodes.notFound })
      )
    )

    const { statusCode } = await visit(
      server,
      regulator,
      YEAR,
      `${unknown}/registered-only-periods/${YEAR}`
    )

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

  describe('the waste balance ledger', () => {
    it('lists the ledger beneath the reports, under its four headings', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const { body } = await visit(server, regulator)
      const document = documentOf(body)

      expect(body.indexOf('data-testid="reports-table"')).toBeLessThan(
        body.indexOf('data-testid="waste-balance-ledger-table"')
      )
      expect(
        getByRole(document, 'heading', { level: 2, name: 'Ledger' })
      ).toBeDefined()
      expect(
        getAllByRole(
          getByTestId(document, 'waste-balance-ledger-table'),
          'columnheader'
        ).map((cell) => cell.textContent?.trim())
      ).toStrictEqual(['Date', 'Event', 'Who', 'Actions'])
    })

    it('states who submitted what, and nothing of a balance', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const { body } = await visit(server, regulator)
      const [, firstRow] = getAllByRole(
        getByTestId(documentOf(body), 'waste-balance-ledger-table'),
        'row'
      )

      expect(
        getAllByRole(firstRow, 'cell').map((cell) => cell.textContent?.trim())
      ).toStrictEqual([
        'Summary log submitted',
        'Ada Lovelace (ada@example.com)',
        'Download XLSX 4 May 2026, 10:00am\nDownload CSV 4 May 2026, 10:00am'
      ])
    })

    it('offers the submission itself, at its address by number', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const { body } = await visit(server, regulator)

      expect(
        getByRole(documentOf(body), 'link', {
          name: 'Download XLSX 4 May 2026, 10:00am'
        }).getAttribute('href')
      ).toBe(`${registrationPath}/summary-logs/files/log-1/download`)
    })

    it('offers the submission as records too, at its address by number', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const { body } = await visit(server, regulator)

      expect(
        getByRole(documentOf(body), 'link', {
          name: 'Download CSV 4 May 2026, 10:00am'
        }).getAttribute('href')
      ).toBe(`${registrationPath}/summary-logs/files/log-1/download.csv`)
    })

    it('offers no records link while the download is dark', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      config.set('featureFlags.wasteRecordsDownload', false)
      const { body } = await visit(server, regulator)
      config.set('featureFlags.wasteRecordsDownload', true)

      expect(
        queryByRole(documentOf(body), 'link', {
          name: 'Download CSV 4 May 2026, 10:00am'
        })
      ).toBeNull()
    })

    it('names no waste balance anywhere on the page', async ({
      server,
      msw
    }) => {
      backendHolds(msw)

      const { body } = await visit(server, regulator)

      expect(body).not.toContain('Waste balance available')
      expect(body).not.toContain('Waste balance ledger')
    })

    it('says nothing has moved the balance where the ledger holds no events', async ({
      server,
      msw
    }) => {
      backendHolds(msw, { ledgerEvents: [] })

      const { body } = await visit(server, regulator)

      expect(body).not.toContain('data-testid="waste-balance-ledger-table"')
      expect(
        queryByText(
          documentOf(body),
          'Nothing has changed this waste balance yet.'
        )
      ).not.toBeNull()
    })

    // A product decision: no ledger for the year reads as an empty one.
    it('says nothing has moved the balance where the backend has no ledger for the year', async ({
      server,
      msw
    }) => {
      backendHolds(msw, { ledgerStatus: statusCodes.notFound })

      const { statusCode, body } = await visit(server, regulator)

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        queryByText(
          documentOf(body),
          'Nothing has changed this waste balance yet.'
        )
      ).not.toBeNull()
    })

    it('fails the page where the ledger could not be read', async ({
      server,
      msw
    }) => {
      backendHolds(msw, { ledgerStatus: statusCodes.internalServerError })

      const { statusCode } = await visit(server, regulator)

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('shows no ledger at all where the year holds no registered-only time', async ({
      server,
      msw
    }) => {
      backendHolds(msw, {
        accreditations: { 2026: anAccreditation('2026-01-01') }
      })

      const { body } = await visit(server, regulator)

      expect(body).not.toContain('Waste balance ledger')
      expect(body).not.toContain('data-testid="waste-balance-ledger-table"')
      expect(body).not.toContain('data-testid="no-events"')
    })

    it('reads no ledger, and shows none, for a regulator granted no ledger scope', async ({
      server,
      msw
    }) => {
      const { ledgerRequests } = backendHolds(msw)

      const { body } = await visit(server, regulatorWithoutLedgerScope)

      expect(ledgerRequests()).toBe(0)
      expect(body).not.toContain('Waste balance ledger')
      expect(body).not.toContain('data-testid="waste-balance-ledger-table"')
    })

    it('reads the ledger for a regulator holding the ledger scope', async ({
      server,
      msw
    }) => {
      const { ledgerRequests } = backendHolds(msw)

      const { body } = await visit(server, regulator)

      expect(ledgerRequests()).toBe(1)
      expect(body).toContain('data-testid="waste-balance-ledger-table"')
    })
  })
})
