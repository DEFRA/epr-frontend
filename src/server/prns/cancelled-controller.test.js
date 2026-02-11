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

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
const listUrl = basePath
const cancelledUrl = `${basePath}/${prnId}/cancelled`

const mockCancelledPrn = {
  id: prnId,
  prnNumber: 'ER2612345A',
  tonnage: 100,
  material: 'plastic',
  status: 'cancelled',
  issuedToOrganisation: { id: 'producer-1', name: 'Test Producer Ltd' },
  createdAt: '2026-01-15T10:00:00Z'
}

const mockCancelledPern = {
  id: 'pern-123',
  prnNumber: 'EX2654321B',
  tonnage: 50,
  material: 'plastic',
  status: 'cancelled',
  issuedToOrganisation: { id: 'exporter-1', name: 'Export Corp' },
  createdAt: '2026-01-20T14:30:00Z'
}

describe('#cancelledController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockCancelledPrn)
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    it('displays green panel with PRN cancelled heading', async ({
      server
    }) => {
      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const panel = main.querySelector('.govuk-panel--confirmation')
      expect(panel).not.toBeNull()
      expect(getByText(main, /PRN cancelled/i)).toBeDefined()
    })

    it('displays Status: Cancelled in panel body', async ({ server }) => {
      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, /Status:/i)).toBeDefined()
      expect(getByText(main, /Cancelled/)).toBeDefined()
    })

    it('displays What happens next heading', async ({ server }) => {
      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, /What happens next/i)).toBeDefined()
    })

    it('displays waste balance updated message', async ({ server }) => {
      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(
        getByText(main, /Your available waste balance has been updated/i)
      ).toBeDefined()
    })

    it('displays link to PRNs page', async ({ server }) => {
      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const prnsLink = getByRole(main, 'link', { name: /PRNs page/i })
      expect(prnsLink).toBeDefined()
      expect(prnsLink.getAttribute('href')).toBe(listUrl)
    })

    it('displays Return to home link', async ({ server }) => {
      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
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

    it('displays PERN text for exporter registration', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        fixtureExporter
      )
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
        mockCancelledPern
      )

      const pernCancelledUrl = `${basePath}/pern-123/cancelled`

      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'GET',
        url: pernCancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, /PERN cancelled/i)).toBeDefined()
      expect(getByRole(main, 'link', { name: /PERNs page/i })).toBeDefined()
    })

    it('redirects to list when PRN is not in cancelled status', async ({
      server
    }) => {
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
        ...mockCancelledPrn,
        status: 'awaiting_cancellation'
      })

      const { cookie: csrfCookie } = await getCsrfToken(server, cancelledUrl, {
        auth: mockAuth
      })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: cancelledUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(listUrl)
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
          url: cancelledUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
