import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/fetch-packaging-recycling-note.js'))

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
    site: {
      address: {
        line1: '123 Reprocessing Lane',
        town: 'Manchester',
        postcode: 'M1 1AA'
      }
    },
    accreditationId: 'acc-001'
  },
  accreditation: {
    id: 'acc-001',
    status: 'approved',
    accreditationNumber: 'ACC-001'
  }
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
  accreditation: {
    id: 'acc-001',
    status: 'approved',
    accreditationNumber: 'ACC-001'
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const pernId = 'pern-123'
const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
const actionUrl = `${basePath}/${prnId}`
const pernActionUrl = `${basePath}/${pernId}`
const viewUrl = `${basePath}/${prnId}/view`

const mockPrnAwaitingAuth = {
  id: 'prn-789',
  issuedToOrganisation: { id: 'producer-1', name: 'Acme Packaging Ltd' },
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation',
  createdAt: '2026-01-15T10:00:00.000Z',
  notes: 'Additional notes for this PRN',
  isDecemberWaste: true,
  authorisedAt: '2026-01-16T14:30:00.000Z',
  authorisedBy: { name: 'John Smith', position: 'Director' },
  wasteProcessingType: 'reprocessor'
}

const mockPrnIssued = {
  ...mockPrnAwaitingAuth,
  status: 'awaiting_acceptance',
  prnNumber: 'ER2625001A'
}

const mockPernAwaitingAuth = {
  id: 'pern-123',
  issuedToOrganisation: { id: 'exporter-1', name: 'Export Solutions Ltd' },
  tonnage: 50,
  material: 'glass',
  status: 'awaiting_authorisation',
  createdAt: '2026-01-20T14:30:00.000Z',
  notes: null,
  isDecemberWaste: false,
  authorisedAt: null,
  authorisedBy: null,
  wasteProcessingType: 'exporter'
}

describe('#actionController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
      mockPrnAwaitingAuth
    )
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    it('displays PRN details on the action page', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const heading = main.querySelector('.govuk-heading-xl')
      expect(heading.textContent).toBe('PRN')

      expect(getByText(main, /Acme Packaging Ltd/i)).toBeDefined()
      expect(getByText(main, '100')).toBeDefined()
    })

    it('displays inset text about auto-populated fields', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const insetText = main.querySelector('.govuk-inset-text')
      expect(insetText).not.toBeNull()
      expect(insetText.textContent).toContain(
        'Any information that is not shown here will be automatically populated when the PRN is issued'
      )
    })

    it('displays "View PRN (opens in a new tab)" link', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const viewLink = getByText(main, /View PRN \(opens in a new tab\)/i)
      expect(viewLink.tagName).toBe('A')
      expect(viewLink.getAttribute('href')).toBe(viewUrl)
      expect(viewLink.getAttribute('target')).toBe('_blank')
    })

    it('displays Issue PRN button when status is awaiting_authorisation', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByRole(main, 'button', { name: /Issue PRN/i })).toBeDefined()
    })

    it('displays Delete PRN button when status is awaiting_authorisation', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const deleteButton = getByRole(main, 'button', { name: /Delete PRN/i })
      expect(deleteButton).toBeDefined()
      expect(deleteButton.classList.contains('govuk-button--warning')).toBe(
        true
      )
    })

    it('does not display regulator logos on the action page', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const logos = main.querySelector('.epr-regulator-logos')
      expect(logos).toBeNull()
    })

    it('displays back link to list page', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const backLink = body.querySelector('.govuk-back-link')
      expect(backLink).toBeDefined()
      expect(backLink.getAttribute('href')).toBe(basePath)
    })

    it('does not display Issue or Delete buttons when PRN is already issued', async ({
      server
    }) => {
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockPrnIssued)

      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(queryByRole(main, 'button', { name: /Issue/i })).toBeNull()
      expect(queryByRole(main, 'button', { name: /Delete/i })).toBeNull()
    })

    it('displays PERN action page for exporter registration', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        fixtureExporter
      )
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
        mockPernAwaitingAuth
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: pernActionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const heading = main.querySelector('.govuk-heading-xl')
      expect(heading.textContent).toBe('PERN')

      expect(getByRole(main, 'button', { name: /Issue PERN/i })).toBeDefined()
      expect(getByRole(main, 'button', { name: /Delete PERN/i })).toBeDefined()
      expect(getByText(main, /View PERN \(opens in a new tab\)/i)).toBeDefined()
    })

    it('displays PRN details summary list with status tag', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, /Awaiting authorisation/i)).toBeDefined()
      expect(getByText(main, /PRN details/i)).toBeDefined()
      expect(getByText(main, /Accreditation details/i)).toBeDefined()
    })

    it('displays error summary when redirected with insufficient_balance error', async ({
      server
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${actionUrl}?error=insufficient_balance`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const errorSummary = main.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(getByText(main, /There is a problem/i)).toBeDefined()
    })

    it('displays error summary when redirected with issue_failed error', async ({
      server
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `${actionUrl}?error=issue_failed`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const errorSummary = main.querySelector('.govuk-error-summary')
      expect(errorSummary).not.toBeNull()
      expect(getByText(main, /There is a problem/i)).toBeDefined()
      expect(getByText(main, /could not issue this PRN or PERN/i)).toBeDefined()
    })

    it('hides status row for draft PRN', async ({ server }) => {
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
        ...mockPrnAwaitingAuth,
        status: 'draft'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const tag = main.querySelector('.govuk-tag')
      expect(tag).toBeNull()
    })

    it('displays "n/a" when organisation company name is missing', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        ...fixtureReprocessor,
        organisationData: { id: 'org-123', companyDetails: null }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const html = body.innerHTML

      expect(html).toContain('n/a')
    })

    it('displays empty accreditation number when accreditation is null', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        ...fixtureReprocessor,
        accreditation: null
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('displays empty accreditation address when site is null', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        ...fixtureReprocessor,
        registration: {
          ...fixtureReprocessor.registration,
          site: null
        }
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('handles unknown status gracefully', async ({ server }) => {
      vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
        ...mockPrnAwaitingAuth,
        status: 'some_unknown_status'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, /some_unknown_status/i)).toBeDefined()
    })

    it('returns 404 when feature flag is disabled', async ({ server }) => {
      config.set('featureFlags.lprns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: actionUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })

    it('returns 404 when registration not found', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        organisationData: fixtureReprocessor.organisationData,
        registration: null,
        accreditation: null
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('displays return link to PRN list', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: actionUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const returnLink = getByText(main, /Return to PRN list/i)
      expect(returnLink).toBeDefined()
      expect(returnLink.getAttribute('href')).toBe(basePath)
    })
  })
})
