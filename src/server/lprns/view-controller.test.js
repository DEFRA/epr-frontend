import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))
vi.mock(import('./helpers/fetch-packaging-recycling-note.js'))
vi.mock(import('./helpers/create-prn.js'))
vi.mock(import('./helpers/update-prn-status.js'))

const { createPrn } = await import('./helpers/create-prn.js')
const { updatePrnStatus } = await import('./helpers/update-prn-status.js')
const { fetchWasteBalances } =
  await import('#server/common/helpers/waste-balance/fetch-waste-balances.js')

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
  organisationData: { id: 'org-123', name: 'Reprocessor Organisation' },
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
  organisationData: { id: 'org-123', name: 'Exporter Organisation' },
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
const pernId = 'pern-123'
const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
const issueUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issue`
const pernViewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/view`
const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

const validPayload = {
  tonnage: '100',
  recipient: 'producer-1',
  notes: 'Test notes',
  material: 'plastic',
  nation: 'england',
  wasteProcessingType: 'reprocessor-input'
}

const mockPrnCreated = {
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'reprocessor-input'
}

const mockPernCreated = {
  id: 'pern-123',
  tonnage: 50,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'exporter'
}

const mockPrnStatusUpdated = {
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation'
}

const mockPrnFromBackend = {
  id: 'prn-789',
  issuedToOrganisation: { id: 'producer-1', name: 'Acme Packaging Ltd' },
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation',
  createdAt: '2026-01-15T10:00:00.000Z',
  notes: 'Additional notes for this PRN',
  isDecemberWaste: true,
  issuedAt: '2026-01-16T14:30:00.000Z',
  authorisedBy: { name: 'John Smith', position: 'Director' },
  wasteProcessingType: 'reprocessor'
}

const mockPernFromBackend = {
  id: 'pern-123',
  issuedToOrganisation: { id: 'export-1', name: 'Export Solutions Ltd' },
  tonnage: 50,
  material: 'glass',
  status: 'issued',
  createdAt: '2026-01-20T14:30:00.000Z',
  notes: null,
  isDecemberWaste: false,
  issuedAt: '2026-01-21T09:00:00.000Z',
  authorisedBy: { name: 'Jane Doe', position: 'Operations Manager' },
  wasteProcessingType: 'exporter'
}

/**
 * Extract cookie key=value pairs from Set-Cookie header(s)
 * @param {string | string[] | undefined} setCookieHeader
 * @returns {string[]}
 */
function extractCookieValues(setCookieHeader) {
  if (!setCookieHeader) return []
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader]
  return headers.filter(Boolean).map((header) => header.split(';')[0])
}

/**
 * Merge cookie strings, with later values overriding earlier ones
 * @param {...string} cookieStrings
 * @returns {string}
 */
function mergeCookies(...cookieStrings) {
  const cookies = {}
  for (const str of cookieStrings) {
    if (!str) continue
    for (const part of str.split(';')) {
      const [key, ...valueParts] = part.trim().split('=')
      if (key && valueParts.length > 0) {
        cookies[key] = valueParts.join('=')
      }
    }
  }
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

describe('#viewController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockPrnFromBackend)
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
    vi.mocked(updatePrnStatus).mockResolvedValue(mockPrnStatusUpdated)
    vi.mocked(fetchWasteBalances).mockResolvedValue({
      'acc-001': { amount: 1000, availableAmount: 500 }
    })
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    describe('view existing PRN (from list page)', () => {
      it('displays PRN details from backend', async ({ server }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Check PRN ID is displayed (appears in caption and PRN number field)
        const heading = main.querySelector('.govuk-heading-xl')
        expect(heading.textContent).toBe('PRN')
        // Check issued to
        expect(getByText(main, /Acme Packaging Ltd/i)).toBeDefined()
        // Check tonnage
        expect(getByText(main, '100')).toBeDefined()
        // Check material (in accreditation section)
        expect(getByText(main, /Plastic/i)).toBeDefined()
      })

      it('displays PRN number when provided', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          prnNumber: 'ER2625001A'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, 'ER2625001A')).toBeDefined()
      })

      it('displays recipient name from PRN data', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          issuedToOrganisation: {
            id: 'producer-1',
            name: 'Custom Recipient Ltd'
          }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Custom Recipient Ltd/i)).toBeDefined()
        const html = body.innerHTML
        expect(html).not.toContain('>producer-1<')
      })

      it('labels recipient row as "Packaging waste producer or compliance scheme"', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, 'Packaging waste producer or compliance scheme')
        ).toBeDefined()
      })

      it('displays tonnage in words generated from tonnage value', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          tonnageInWords: undefined
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /One hundred/)).toBeDefined()
      })

      it('displays tonnage in words from backend when provided', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          tonnageInWords: 'One hundred'
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /One hundred/)).toBeDefined()
      })

      it('displays awaiting authorisation status with yellow tag', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tag = main.querySelector('.govuk-tag--yellow')
        expect(tag).toBeDefined()
        expect(tag.textContent.trim()).toBe('Awaiting authorisation')
      })

      it('displays awaiting acceptance status with purple tag', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'awaiting_acceptance'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tag = main.querySelector('.govuk-tag--purple')
        expect(tag).toBeDefined()
        expect(tag.textContent.trim()).toBe('Awaiting acceptance')
      })

      it('displays back link to list page', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink).toBeDefined()
        expect(backLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays return link to PRN list', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const returnLink = getByText(main, /Return to PRN list/i)
        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays PERN details for exporter registration', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          mockPernFromBackend
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Check heading shows PERN
        const heading = main.querySelector('.govuk-heading-xl')
        expect(heading.textContent).toBe('PERN')

        // Check return link text
        expect(getByText(main, /Return to PERN list/i)).toBeDefined()
      })

      it('displays issued date for issued PERN', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          mockPernFromBackend
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Check issued date is displayed (from issuedAt: '2026-01-21T09:00:00.000Z')
        expect(getByText(main, /Issued date/i)).toBeDefined()
        expect(getByText(main, /21 January 2026/i)).toBeDefined()
      })

      it('displays authorised by and position for issued PERN', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          mockPernFromBackend
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Check authorised by and position are displayed
        expect(getByText(main, /Jane Doe/i)).toBeDefined()
        expect(getByText(main, /Operations Manager/i)).toBeDefined()
      })

      it('shows accreditation address for reprocessors', async ({ server }) => {
        const reprocessorWithAddress = {
          ...fixtureReprocessor,
          registration: {
            ...fixtureReprocessor.registration,
            site: {
              address: {
                line1: '123 Reprocessing Lane',
                town: 'Manchester',
                postcode: 'M1 1AA'
              }
            }
          }
        }
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          reprocessorWithAddress
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Accreditation address/i)).toBeDefined()
        expect(
          getByText(main, /123 Reprocessing Lane, Manchester, M1 1AA/i)
        ).toBeDefined()
      })

      it('shows empty accreditation address when site address is null', async ({
        server
      }) => {
        const reprocessorWithoutAddress = {
          ...fixtureReprocessor,
          registration: {
            ...fixtureReprocessor.registration,
            site: null
          }
        }
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          reprocessorWithoutAddress
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('hides accreditation address for exporters', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          mockPernFromBackend
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const html = body.innerHTML

        expect(html).not.toContain('Accreditation address')
      })

      it('displays issued status with blue tag', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'issued'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tag = main.querySelector('.govuk-tag--blue')
        expect(tag).toBeDefined()
        expect(tag.textContent.trim()).toBe('Issued')
      })

      it('displays cancelled status with red tag', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'cancelled'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tag = main.querySelector('.govuk-tag--red')
        expect(tag).toBeDefined()
        expect(tag.textContent.trim()).toBe('Cancelled')
      })

      it('hides status and logos for draft PRN', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'draft'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Should not show status tag
        const tag = main.querySelector('.govuk-tag')
        expect(tag).toBeNull()

        // Should not show regulator logos
        const logos = main.querySelector('.epr-regulator-logos')
        expect(logos).toBeNull()

        // Heading shows PRN for draft
        const heading = main.querySelector('.govuk-heading-xl')
        expect(heading.textContent).toBe('PRN')
      })

      it('returns 404 when registration not found', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
          organisationData: fixtureReprocessor.organisationData,
          registration: null,
          accreditation: null
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('returns 404 when PRN not found', async ({ server }) => {
        const Boom = await import('@hapi/boom')
        vi.mocked(fetchPackagingRecyclingNote).mockRejectedValue(
          Boom.default.notFound('PRN not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('formats issued date correctly', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Issued date is the issuedAt date (16 January 2026)
        expect(getByText(main, /16 January 2026/i)).toBeDefined()
      })

      it('displays December waste as Yes when true', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /December waste/i)).toBeDefined()
        expect(getByText(main, /^Yes$/)).toBeDefined()
      })

      it('displays December waste as No when false', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          isDecemberWaste: false
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /^No$/)).toBeDefined()
      })

      it('displays issuer notes when present', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Issuer notes/i)).toBeDefined()
        expect(getByText(main, /Additional notes for this PRN/i)).toBeDefined()
      })

      it('displays "Not provided" when notes are null', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          notes: null
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Not provided/i)).toBeDefined()
      })

      it('displays authorised by details when present', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Authorised by/i)).toBeDefined()
        expect(getByText(main, /John Smith/i)).toBeDefined()
        expect(getByText(main, /Position/i)).toBeDefined()
        expect(getByText(main, /Director/i)).toBeDefined()
      })

      it('displays issued date when authorised', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Issued date/i)).toBeDefined()
        expect(getByText(main, /16 January 2026/i)).toBeDefined()
      })

      it('displays empty values when authorisation details not present', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          issuedAt: null,
          authorisedBy: null
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('handles unknown status gracefully', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'some_unknown_status'
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Unknown status should be displayed as-is
        expect(getByText(main, /some_unknown_status/i)).toBeDefined()
      })

      it('handles null material gracefully', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          material: null
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('does not display Issue button on certificate page (actions are on action page)', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'awaiting_authorisation'
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(queryByRole(main, 'button', { name: /Issue/i })).toBeNull()
      })

      it('should display compliance year text with year in strong tags', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          accreditationYear: 2026
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const complianceText = main.querySelector('.govuk-body')
        expect(complianceText.innerHTML).toBe(
          'This PRN relates to waste accepted for reprocessing in <strong>2026</strong> and can count towards <strong>2026</strong> obligations.'
        )
      })

      it('does not display error summary on certificate page (errors shown on action page)', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: `${viewUrl}?error=insufficient_balance`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const errorSummary = main.querySelector('.govuk-error-summary')
        expect(errorSummary).toBeNull()
      })
    })

    describe('POST /issue (issue PRN)', () => {
      it('updates PRN status to awaiting_acceptance and redirects to issued page', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'awaiting_authorisation'
        })
        vi.mocked(updatePrnStatus).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'awaiting_acceptance',
          prnNumber: 'ER2625001A'
        })

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          viewUrl,
          { auth: mockAuth }
        )

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: issueUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issued`
        )
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'awaiting_acceptance' },
          mockCredentials.idToken
        )
      })
    })

    describe('draft PRN view (creation flow)', () => {
      it('displays check page with create button when draft in session', async ({
        server
      }) => {
        // Mock with isDecemberWaste: true to cover that branch
        vi.mocked(createPrn).mockResolvedValue({
          ...mockPrnCreated,
          isDecemberWaste: true
        })

        // First create a draft by POSTing to create
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        // Now GET /view should show check page with draft
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Should show create button (draft flow)
        const createButton = main.querySelector('button.govuk-button')
        expect(createButton).toBeDefined()
        expect(createButton.textContent).toContain('Create PRN')
        // Should show check page heading
        expect(getByText(main, /Check before creating PRN/i)).toBeDefined()
        // Should show December waste as Yes
        expect(getByText(main, /^Yes$/)).toBeDefined()
      })

      it('displays discard link below create button on check page', async ({
        server
      }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Should show discard link pointing to discard confirmation page
        const discardLink = getByText(main, /Discard and start again/i)
        expect(discardLink.tagName).toBe('A')
        expect(discardLink.classList.contains('govuk-link')).toBe(true)
        const expectedDiscardUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/discard`
        expect(discardLink.getAttribute('href')).toBe(expectedDiscardUrl)
        expect(main.querySelector('.govuk-button--warning')).toBeNull()
      })

      it('displays "Not provided" when notes are empty in draft', async ({
        server
      }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        // Create draft without notes
        const payloadWithoutNotes = { ...validPayload, notes: '' }

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...payloadWithoutNotes, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Not provided/i)).toBeDefined()
      })

      it('displays PRN details rows in correct order per design', async ({
        server
      }) => {
        vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const summaryLists = body.querySelectorAll('.govuk-summary-list')
        // First summary list is PRN details
        const prnDetailsList = summaryLists[0]
        const keys = [
          ...prnDetailsList.querySelectorAll('.govuk-summary-list__key')
        ].map((el) => el.textContent.trim())

        expect(keys).toStrictEqual([
          'Packaging waste producer or compliance scheme',
          'Tonnage',
          'Tonnage in words',
          'Process to be used',
          'December waste',
          'Issuer',
          'Issued date',
          'Issued by',
          'Position',
          'Issuer notes'
        ])
      })

      it('displays tonnage in words generated from tonnage value', async ({
        server
      }) => {
        vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /One hundred/)).toBeDefined()
      })

      it('displays PERN check page for exporter registration', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(createPrn).mockResolvedValue(mockPernCreated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...exporterPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const createButton = main.querySelector('button.govuk-button')
        expect(createButton).toBeDefined()
        expect(createButton.textContent).toContain('Create PERN')
        expect(getByText(main, /Check before creating PERN/i)).toBeDefined()
      })
    })

    describe('POST /view (confirm creation)', () => {
      it('redirects to created page after confirming', async ({ server }) => {
        // Create draft first
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const createResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const createCookieValues = extractCookieValues(
          createResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...createCookieValues)

        // POST to confirm
        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        const createdUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/created`

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createdUrl)
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'awaiting_authorisation' },
          mockCredentials.idToken
        )
      })

      it('redirects to create when no draft in session', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createUrl)
      })

      it('returns 500 when updatePrnStatus fails', async ({ server }) => {
        vi.mocked(updatePrnStatus).mockRejectedValueOnce(
          new Error('Backend error')
        )

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const createResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const createCookieValues = extractCookieValues(
          createResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...createCookieValues)

        const { statusCode } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })

      it('re-throws Boom errors from updatePrnStatus', async ({ server }) => {
        const Boom = await import('@hapi/boom')
        vi.mocked(updatePrnStatus).mockRejectedValueOnce(
          Boom.default.forbidden('Not authorised')
        )

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const createResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const createCookieValues = extractCookieValues(
          createResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...createCookieValues)

        const { statusCode } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.forbidden)
      })

      it('cancels draft and redirects to error when tonnage exceeds available waste balance', async ({
        server
      }) => {
        vi.mocked(fetchWasteBalances).mockResolvedValue({
          'acc-001': { amount: 1000, availableAmount: 50 }
        })

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const createResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const createCookieValues = extractCookieValues(
          createResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...createCookieValues)

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toContain(createUrl)
        expect(headers.location).toContain('error=insufficient_balance')
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'discarded' },
          mockCredentials.idToken
        )
      })

      it('proceeds when tonnage is within available waste balance', async ({
        server
      }) => {
        vi.mocked(fetchWasteBalances).mockResolvedValue({
          'acc-001': { amount: 1000, availableAmount: 100 }
        })

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const createResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const createCookieValues = extractCookieValues(
          createResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...createCookieValues)

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        const createdUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/created`

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createdUrl)
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'awaiting_authorisation' },
          mockCredentials.idToken
        )
      })

      it('treats missing waste balance as zero available', async ({
        server
      }) => {
        vi.mocked(fetchWasteBalances).mockResolvedValue({})

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const createResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const createCookieValues = extractCookieValues(
          createResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...createCookieValues)

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toContain('error=insufficient_balance')
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'discarded' },
          mockCredentials.idToken
        )
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    it('returns 404 for GET', async ({ server }) => {
      // Disable feature flag before request
      config.set('featureFlags.lprns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })

    it('returns 404 for POST', async ({ server }) => {
      config.set('featureFlags.lprns', false)

      try {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const { statusCode } = await server.inject({
          method: 'POST',
          url: viewUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })
  })
})
