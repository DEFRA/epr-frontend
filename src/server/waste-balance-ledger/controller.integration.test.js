import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import {
  asRegistrationWithAccreditation,
  findRegistrationAndAccreditation
} from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByText } from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const accreditedRegistrationId = 'reg-001-glass-approved'
const accreditationId = 'acc-001-glass-approved'
const registeredOnlyRegistrationId = 'reg-006-plastic-export-created'

const accreditedPath = `/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/${accreditationId}/waste-balance-ledger`
const registeredOnlyPath = `/organisations/${organisationId}/registrations/${registeredOnlyRegistrationId}/waste-balance-ledger`

const accreditedLedgerUrl = `${backendUrl}/v1/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/${accreditationId}/waste-balance-ledger`
const registeredOnlyLedgerUrl = `${backendUrl}/v1/organisations/${organisationId}/registrations/${registeredOnlyRegistrationId}/waste-balance-ledger`

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

const prnIssued = {
  id: 'evt-2',
  number: 2,
  kind: 'prn-issued',
  createdAt: '2026-02-15T15:09:00.000Z',
  prn: { id: 'prn-1', tonnage: 12.5 },
  balance: {
    opening: { total: 100, available: 100 },
    closing: { total: 100, available: 87.5 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
}

const summaryLogSubmitted = {
  id: 'evt-1',
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
 * A ledger read answers the address it was asked for, and the registered-only
 * partition is keyed by a null accreditation rather than by its absence.
 * @param {string} registrationId
 * @param {string | null} accreditationOfLedger
 * @returns {(events: unknown[]) => { ledger: object, events: unknown[] }}
 */
const ledgerOf = (registrationId, accreditationOfLedger) => (events) => ({
  ledger: {
    organisationId,
    registrationId,
    accreditationId: accreditationOfLedger
  },
  events
})

const accreditedLedgerOf = ledgerOf(accreditedRegistrationId, accreditationId)
const registeredOnlyLedgerOf = ledgerOf(registeredOnlyRegistrationId, null)

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
    Array.from(row.querySelectorAll('td')).map((cell) =>
      cell.textContent.trim()
    )
  )

describe('the waste balance ledger page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      findRegistrationAndAccreditation(fixtureData, accreditedRegistrationId)
    )
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  describe('a regulator', () => {
    it('reads the ledger of the accreditation the address names', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(
            accreditedLedgerOf([summaryLogSubmitted, prnIssued])
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
          'PRN issued',
          '12.50',
          '100.00',
          '87.50',
          'Ada Lovelace (ada@example.com)'
        ],
        [
          '4 January 2026, 9:00am',
          'Summary log submitted',
          '100.00',
          '100.00',
          '100.00',
          'System'
        ]
      ])
    })

    it('heads the six columns, and offers neither a sequence number nor a payload', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(accreditedLedgerOf([prnIssued]))
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
        'Date and time',
        'Event',
        'Tonnage',
        'Balance',
        'Available',
        'Who'
      ])
      expect(queryByText(body, 'Number')).toBeNull()
      expect(queryByText(body, 'Payload')).toBeNull()
    })

    it('names the accreditation whose ledger it shows', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(accreditedLedgerOf([]))
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.textContent).toContain('Accreditation ACC001234')
      expect(heading.textContent).toContain('Waste balance ledger')
    })

    it('reads the registered-only ledger, and says the period carries no accreditation', async ({
      msw,
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        findRegistrationAndAccreditation(
          fixtureData,
          registeredOnlyRegistrationId
        )
      )
      msw.use(
        http.get(registeredOnlyLedgerUrl, () =>
          HttpResponse.json(registeredOnlyLedgerOf([summaryLogSubmitted]))
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
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        findRegistrationAndAccreditation(
          fixtureData,
          registeredOnlyRegistrationId
        )
      )
      msw.use(
        http.get(registeredOnlyLedgerUrl, () =>
          HttpResponse.json(registeredOnlyLedgerOf([prnIssued]))
        )
      )

      const { result } = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: regulator
      })

      const body = documentOf(asHtml(result))

      expect(rowsOf(body).at(0)?.at(1)).toBe('PERN issued')
    })

    it('says so where nothing has moved the balance yet', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedLedgerUrl, () =>
          HttpResponse.json(accreditedLedgerOf([]))
        )
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

    it('refuses an address pairing the registration with another accreditation, rather than reporting an empty ledger', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/acc-005-steel-approved/waste-balance-ledger`,
        auth: regulator
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('refuses a registration whose accreditation the organisation does not hold', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        asRegistrationWithAccreditation({
          organisationData: fixtureData,
          registration: {
            id: accreditedRegistrationId,
            accreditationId: 'acc-not-in-organisation',
            wasteProcessingType: 'reprocessor'
          },
          rawAccreditation: undefined
        })
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/acc-not-in-organisation/waste-balance-ledger`,
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
      expect(fetchRegistrationAndAccreditation).not.toHaveBeenCalled()
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
      expect(fetchRegistrationAndAccreditation).not.toHaveBeenCalled()
    })
  })
})
