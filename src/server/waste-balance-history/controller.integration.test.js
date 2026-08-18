import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
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
import { beforeEach, describe, expect, vi } from 'vitest'

import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const accreditedRegistrationId = 'reg-001-glass-approved'
const accreditationId = 'acc-001-glass-approved'
const registeredOnlyRegistrationId = 'reg-006-plastic-export-created'

const accreditedPath = `/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/${accreditationId}/waste-balance-history`
const registeredOnlyPath = `/organisations/${organisationId}/registrations/${registeredOnlyRegistrationId}/waste-balance-history`

const accreditedEventsUrl = `${backendUrl}/v1/admin/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/${accreditationId}/waste-balance-events`
const registeredOnlyEventsUrl = `${backendUrl}/v1/admin/organisations/${organisationId}/registrations/${registeredOnlyRegistrationId}/waste-balance-events`

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'regulator@example.com' },
  backendToken: 'regulator-backend-token',
  ...sessionIdentity(IDENTITIES.regulator)
})

const operator = buildMockAuth()

const prnIssued = {
  kind: 'prn-issued',
  createdAt: '2026-02-15T15:09:00.000Z',
  payload: { amount: 12.5 },
  closingBalance: { amount: 100, availableAmount: 87.5 },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
}

const summaryLogSubmitted = {
  kind: 'summary-log-submitted',
  createdAt: '2026-01-04T09:00:00.000Z',
  payload: { creditTotal: 100 },
  closingBalance: { amount: 100, availableAmount: 100 },
  createdBy: { id: 'system', name: 'backfill' }
}

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

describe('the waste balance history page', () => {
  beforeEach(() => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      findRegistrationAndAccreditation(fixtureData, accreditedRegistrationId)
    )
  })

  describe('a regulator', () => {
    it('reads the ledger of the accreditation the address names', async ({
      msw,
      server
    }) => {
      msw.use(
        http.get(accreditedEventsUrl, () =>
          HttpResponse.json([summaryLogSubmitted, prnIssued])
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
          '15 February 2026',
          'PRN issued',
          '12.50',
          '100.00',
          '87.50',
          'Ada Lovelace (ada@example.com)'
        ],
        [
          '4 January 2026',
          'Waste report submitted',
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
        http.get(accreditedEventsUrl, () => HttpResponse.json([prnIssued]))
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
      msw.use(http.get(accreditedEventsUrl, () => HttpResponse.json([])))

      const { result } = await server.inject({
        method: 'GET',
        url: accreditedPath,
        auth: regulator
      })

      const heading = getByRole(documentOf(asHtml(result)), 'heading', {
        level: 1
      })

      expect(heading.textContent).toContain('Accreditation ACC001234')
      expect(heading.textContent).toContain('Waste balance history')
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
        http.get(registeredOnlyEventsUrl, () =>
          HttpResponse.json([summaryLogSubmitted])
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

      expect(heading.textContent).toContain('Registered, not accredited')
    })

    it("names an exporter's notes PERNs", async ({ msw, server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        findRegistrationAndAccreditation(
          fixtureData,
          registeredOnlyRegistrationId
        )
      )
      msw.use(
        http.get(registeredOnlyEventsUrl, () => HttpResponse.json([prnIssued]))
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
      msw.use(http.get(accreditedEventsUrl, () => HttpResponse.json([])))

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

    it('refuses an address pairing the registration with another accreditation, rather than reporting an empty history', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/acc-005-steel-approved/waste-balance-history`,
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
        url: `/organisations/${organisationId}/registrations/${accreditedRegistrationId}/accreditations/acc-not-in-organisation/waste-balance-history`,
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
})
