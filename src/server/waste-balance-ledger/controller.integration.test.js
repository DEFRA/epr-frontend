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
import {
  buildAccreditationView,
  buildOrganisationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, queryByText } from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

const backendUrl = config.get('eprBackendUrl')

const registeredOnlyRegistration = buildRegistrationView({
  accreditations: {}
})

const organisation = buildOrganisationView({
  organisationNumber: 50002,
  name: 'ACME ltd',
  displayName: 'ACME ltd',
  registrations: {
    REG001234: buildRegistrationView({
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: { address: { fullAddress: '1 Glass Street, Leeds' } },
      accreditations: {
        2026: buildAccreditationView({ accreditationNumber: 'ACC001234' })
      }
    }),
    REG006789: registeredOnlyRegistration,
    'REG&1': registeredOnlyRegistration
  }
})

const readsOrganisation = vi.fn()

const organisationPath = '/organisations/50002'
const accreditedRegistrationPath = `${organisationPath}/registrations/REG001234`
const accreditationPath = `${accreditedRegistrationPath}/accreditations/2026`
const registeredOnlyRegistrationPath = `${organisationPath}/registrations/REG006789`

const accreditedPath = `${accreditationPath}/waste-balance-ledger`
const registeredOnlyPath = `${registeredOnlyRegistrationPath}/waste-balance-ledger`

const accreditedLedgerUrl = `${backendUrl}${accreditationPath}/ledger`
const registeredOnlyLedgerUrl = `${backendUrl}${registeredOnlyRegistrationPath}/ledger/2026`

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'regulator@example.com' },
  backendToken: 'regulator-backend-token',
  ...sessionIdentity(IDENTITIES.regulator)
})

const operator = buildMockAuth()

const regulatorWithoutLedgerScope = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'no.ledger@example.com' },
  role: IDENTITIES.regulator.role,
  scope: [SCOPES.organisationSearch]
})

const prnCreated = {
  number: 2,
  kind: 'prn-created',
  createdAt: '2026-02-01T10:30:00.000Z',
  prn: { id: 'prn-1', prnNumber: null, tonnage: 12.5 },
  balance: {
    opening: { total: 100, available: 100 },
    closing: { total: 100, available: 87.5 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
}

const prnIssued = {
  number: 3,
  kind: 'prn-issued',
  createdAt: '2026-02-15T15:09:00.000Z',
  prn: { id: 'prn-1', prnNumber: '240000123', tonnage: 12.5 },
  balance: {
    opening: { total: 100, available: 87.5 },
    closing: { total: 87.5, available: 87.5 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
}

const summaryLogSubmitted = {
  number: 1,
  kind: 'summary-log-submitted',
  createdAt: '2026-01-04T09:00:00.000Z',
  summaryLog: { id: 'log-1', creditTotal: 100 },
  balance: {
    opening: { total: 0, available: 0 },
    closing: { total: 100, available: 100 }
  },
  createdBy: { id: 'system', name: 'backfill' }
}

/**
 * @param {unknown[]} events
 * @returns {{ events: unknown[] }}
 */
const ledgerOf = (events) => ({ events })

/**
 * @param {string} html
 */
const documentOf = (html) => new JSDOM(html).window.document.body

/**
 * @param {ReturnType<typeof documentOf>} body
 * @returns {string[][]}
 */
const rowsOf = (body) =>
  Array.from(body.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) =>
      cell.textContent.trim()
    )
  )

/**
 * @param {ReturnType<typeof documentOf>} body
 */
const crumbsOf = (body) =>
  Array.from(body.querySelectorAll('.govuk-breadcrumbs__list-item'))

/**
 * @param {ReturnType<typeof crumbsOf>} crumbs
 * @returns {(string | undefined)[]}
 */
const textOf = (crumbs) => crumbs.map((crumb) => crumb.textContent?.trim())

describe('the waste balance ledger page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.wasteRecordsDownload', true)
  })

  beforeEach(({ msw }) => {
    msw.use(
      http.get(`${backendUrl}${organisationPath}`, () => {
        readsOrganisation()
        return HttpResponse.json(organisation)
      })
    )
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.wasteRecordsDownload', false)
  })

  describe('a regulator', () => {
    it('reads the ledger of the accreditation the address names, each event stating what it moved', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(
            ledgerOf([summaryLogSubmitted, prnCreated, prnIssued])
          )
        )
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(rowsOf(documentOf(asHtml(result)))).toStrictEqual([
        [
          '15 February 2026, 3:09pm',
          'PRN issued\n240000123',
          'N/A',
          '87.50',
          'Ada Lovelace (ada@example.com)',
          'View 240000123'
        ],
        [
          '1 February 2026, 10:30am',
          'PRN created',
          '-12.50',
          '87.50',
          'Ada Lovelace (ada@example.com)',
          'View 1 February 2026, 10:30am'
        ],
        [
          '4 January 2026, 9:00am',
          'Summary log submitted',
          '+100.00',
          '100.00',
          'System',
          'Download XLSX 4 January 2026, 9:00am\nDownload CSV 4 January 2026, 9:00am'
        ]
      ])
    })

    it('offers the workbook alone while the records are dark', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(ledgerOf([summaryLogSubmitted]))
        )
      )
      config.set('featureFlags.wasteRecordsDownload', false)

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      config.set('featureFlags.wasteRecordsDownload', true)

      expect(
        rowsOf(documentOf(asHtml(result)))
          .at(0)
          ?.at(5)
      ).toBe('Download XLSX 4 January 2026, 9:00am')
    })

    it('returns a note opened from a row to this page', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(ledgerOf([prnIssued]))
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      // This ledger is a page of its own, not the section on the
      // accreditation, so the note comes back here.
      expect(asHtml(result)).toContain(
        `${accreditationPath}/packaging-recycling-notes/${prnIssued.prn.id}/view`
      )
    })

    it('heads the six columns, and offers neither a sequence number nor a payload', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(ledgerOf([prnIssued]))
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const headings = Array.from(body.querySelectorAll('thead th')).map(
        (cell) => cell.textContent.trim()
      )

      expect(headings).toStrictEqual([
        'Date',
        'Event',
        'Tonnage',
        'Waste balance available (tonnes)',
        'Who',
        'Actions'
      ])
      expect(queryByText(body, 'Number')).toBeNull()
      expect(queryByText(body, 'Payload')).toBeNull()
    })

    it('names the records the ledger sits under, down to the accreditation', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () => HttpResponse.json(ledgerOf([])))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.textContent).toContain('ACME ltd - REG001234 - ACC001234')
      expect(heading.textContent).toContain('Waste balance ledger')
    })

    it('titles the page by the accreditation number', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () => HttpResponse.json(ledgerOf([])))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      expect(documentOf(asHtml(result)).ownerDocument.title).toContain(
        'ACC001234: Waste balance ledger'
      )
    })

    it('walks back through the accreditation by the breadcrumbs, with no back link', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () => HttpResponse.json(ledgerOf([])))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const crumbs = crumbsOf(body)

      expect(body.querySelector('.govuk-back-link')).toBeNull()
      expect(textOf(crumbs)).toStrictEqual([
        'All organisations',
        'ACME ltd',
        'Registration details',
        'Accreditation details',
        'Waste balance ledger'
      ])
      expect(
        crumbs.map((crumb) => crumb.querySelector('a')?.getAttribute('href'))
      ).toStrictEqual([
        '/regulators/home',
        organisationPath,
        accreditedRegistrationPath,
        accreditationPath,
        undefined
      ])
    })

    it('carries the phase banner the layout offers every page', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () => HttpResponse.json(ledgerOf([])))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      expect(
        documentOf(asHtml(result)).querySelector('.govuk-phase-banner')
      ).not.toBeNull()
    })

    it('walks the registered-only ledger back to the registration, with no back link', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(registeredOnlyLedgerUrl, () => HttpResponse.json(ledgerOf([])))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: regulator
      })

      const body = documentOf(asHtml(result))
      const crumbs = crumbsOf(body)

      expect(body.querySelector('.govuk-back-link')).toBeNull()
      expect(textOf(crumbs)).toStrictEqual([
        'All organisations',
        'ACME ltd',
        'Registration details',
        'Waste balance ledger'
      ])
      expect(crumbs.at(2)?.querySelector('a')?.getAttribute('href')).toBe(
        registeredOnlyRegistrationPath
      )
      expect(crumbs.at(3)?.querySelector('a')).toBeNull()
      expect(body.ownerDocument.title).toContain('Waste balance ledger')
    })

    it('encodes a registration number holding reserved characters once in its links', async ({
      msw,
      server
    }) => {
      const encodedPath = `${organisationPath}/registrations/REG%261`
      msw.use(
        http.get(`${backendUrl}${encodedPath}/ledger/2026`, () =>
          HttpResponse.json(ledgerOf([summaryLogSubmitted]))
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: `${encodedPath}/waste-balance-ledger`,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(
        crumbsOf(body).at(2)?.querySelector('a')?.getAttribute('href')
      ).toBe(encodedPath)
      expect(
        getByRole(body, 'link', { name: /^Download XLSX/ }).getAttribute('href')
      ).toBe(`${encodedPath}/summary-logs/files/log-1/download`)
    })

    it('shows the registered-only ledger empty where the backend holds none for the year', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(
          registeredOnlyLedgerUrl,
          () => new HttpResponse(null, { status: statusCodes.notFound })
        )
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        queryByText(
          documentOf(asHtml(result)),
          'Nothing has changed this waste balance yet.'
        )
      ).not.toBeNull()
    })

    it('fails the registered-only page where the ledger could not be read', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(
          registeredOnlyLedgerUrl,
          () =>
            new HttpResponse(null, { status: statusCodes.internalServerError })
        )
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('reads the registered-only ledger, and says the period carries no accreditation', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(registeredOnlyLedgerUrl, () =>
          HttpResponse.json(ledgerOf([summaryLogSubmitted]))
        )
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.textContent).toContain('Registered-only')
    })

    it("names an exporter's notes PERNs", async ({ msw, server }) => {
      msw.use(
        http.get(registeredOnlyLedgerUrl, () =>
          HttpResponse.json(ledgerOf([prnIssued]))
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(rowsOf(body).at(0)?.at(1)).toBe('PERN issued\n240000123')
    })

    it('says so where nothing has moved the balance yet', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () => HttpResponse.json(ledgerOf([])))
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(body.querySelector('table')).toBeNull()
      expect(
        queryByText(body, 'Nothing has changed this waste balance yet.')
      ).not.toBeNull()
    })

    it('refuses a year the registration holds no accreditation for, rather than reporting an empty ledger', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `${accreditedRegistrationPath}/accreditations/2025/waste-balance-ledger`,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('serves the ledger of a cancelled accreditation, which keeps its ledger', async ({
      msw,
      server
    }) => {
      const cancelled = buildOrganisationView({
        organisationNumber: 50002,
        registrations: {
          REG001234: buildRegistrationView({
            accreditations: {
              2026: buildAccreditationView({
                status: { current: 'cancelled', timeline: {} }
              })
            }
          })
        }
      })
      msw.use(
        http.get(`${backendUrl}${organisationPath}`, () =>
          HttpResponse.json(cancelled)
        ),
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(ledgerOf([summaryLogSubmitted]))
        )
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('refuses the accredited address for a registration with no accreditation', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `${registeredOnlyRegistrationPath}/accreditations/2026/waste-balance-ledger`,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('an operator', () => {
    it('is refused the page, and asks the backend for nothing', async ({
      server
    }) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: operator
      })

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(
        getByRole(documentOf(asHtml(result)), 'heading', {
          level: 1
        }).textContent.trim()
      ).toBe('You do not have permission')
      expect(readsOrganisation).not.toHaveBeenCalled()
    })

    it('is refused the registered-only address too', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: operator
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('a session the backend granted no ledger scope', () => {
    it('is refused the page, whatever role it carries', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulatorWithoutLedgerScope
      })

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(readsOrganisation).not.toHaveBeenCalled()
    })
  })
})
