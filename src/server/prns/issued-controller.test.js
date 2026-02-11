import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/fetch-packaging-recycling-note.js'))

const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
const { fetchPackagingRecyclingNote } =
  await import('./helpers/fetch-packaging-recycling-note.js')

const mockCredentials = {
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const fixtureReprocessor = {
  organisationData: {
    id: 'org-123',
    companyDetails: { name: 'Reprocessor Organisation' }
  },
  registration: {
    id: 'reg-456',
    wasteProcessingType: 'reprocessor-input',
    material: 'plastic',
    nation: 'england',
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const fixtureExporter = {
  organisationData: {
    id: 'org-123',
    companyDetails: { name: 'Exporter Organisation' }
  },
  registration: {
    id: 'reg-456',
    wasteProcessingType: 'exporter',
    material: 'plastic',
    nation: 'england',
    site: null,
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const mockIssuedPrn = {
  id: 'prn-789',
  prnNumber: 'ER2612345A',
  issuedToOrganisation: { id: 'producer-1', name: 'ComplyPak Ltd' },
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_acceptance'
}

const mockIssuedPern = {
  id: 'pern-123',
  prnNumber: 'EX2654321B',
  issuedToOrganisation: { id: 'exporter-1', name: 'Export Corp' },
  tonnage: 50,
  material: 'plastic',
  status: 'awaiting_acceptance'
}

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const pernId = 'pern-123'
const issuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issued`
const pernIssuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/issued`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

describe('#issuedController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockIssuedPrn)
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    describe('success page (after issuing PRN)', () => {
      it('displays success page with PRN issued heading and recipient', async ({
        server
      }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PRN issued to/i)).toBeDefined()
        expect(getByText(main, /ComplyPak Ltd/i)).toBeDefined()
      })

      it('displays tradingName in heading when organisation has both name and tradingName', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockIssuedPrn,
          issuedToOrganisation: {
            id: 'producer-1',
            name: 'Legal Name Ltd',
            tradingName: 'Trading Name Ltd'
          }
        })

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Trading Name Ltd/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Legal Name Ltd<')
      })

      it('displays PRN number', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PRN number:/i)).toBeDefined()
        expect(getByText(main, /ER2612345A/)).toBeDefined()
      })

      it('displays waste balance updated message', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /Your waste balance has been updated/i)
        ).toBeDefined()
      })

      it('displays View PRN button linking to certificate page in new tab', async ({
        server
      }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const viewButton = getByRole(main, 'button', {
          name: 'View PRN (opens in a new tab)'
        })
        expect(viewButton).toBeDefined()
        expect(viewButton.getAttribute('href')).toBe(viewUrl)
        expect(viewButton.getAttribute('target')).toBe('_blank')
        expect(viewButton.classList.contains('govuk-button--secondary')).toBe(
          true
        )
      })

      it('displays Issue another PRN link', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const issueAnotherLink = getByRole(main, 'link', {
          name: /Issue another PRN/i
        })
        expect(issueAnotherLink).toBeDefined()
        expect(issueAnotherLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays Manage PRNs link', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const managePrnsLink = getByRole(main, 'link', {
          name: /Manage PRNs/i
        })
        expect(managePrnsLink).toBeDefined()
        expect(managePrnsLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays Return to home link', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const returnHomeLink = getByRole(main, 'link', {
          name: /Return to home/i
        })
        expect(returnHomeLink).toBeDefined()
        expect(returnHomeLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}`
        )
      })

      it('displays PERN text for exporter wasteProcessingType', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockIssuedPern)

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: pernIssuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PERN issued to/i)).toBeDefined()
        expect(getByText(main, /Export Corp/i)).toBeDefined()
      })

      it('displays View PERN button with opens in a new tab text for exporter', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockIssuedPern)

        const { cookie: csrfCookie } = await getCsrfToken(server, listUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: pernIssuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const viewButton = getByRole(main, 'button', {
          name: 'View PERN (opens in a new tab)'
        })
        expect(viewButton).toBeDefined()
        expect(viewButton.getAttribute('target')).toBe('_blank')
      })

      it('redirects to view page if PRN not in awaiting_acceptance status', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockIssuedPrn,
          status: 'awaiting_authorisation'
        })

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(viewUrl)
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    it('returns 404', async ({ server }) => {
      config.set('featureFlags.prns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
