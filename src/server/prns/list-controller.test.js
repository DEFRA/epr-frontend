import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { getPrns } from '#server/common/helpers/prns/get-prns.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText, within } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-registration-with-accreditation.js')
)

vi.mock(import('#server/common/helpers/waste-balance/get-waste-balance.js'))

vi.mock(import('#server/common/helpers/prns/get-prns.js'))

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
    id: 'reg-001',
    wasteProcessingType: 'reprocessor-input', // PRN
    material: 'glass',
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const fixtureReprocessorOutput = {
  organisationData: { id: 'org-789', name: 'Reprocessor Output Organisation' },
  registration: {
    id: 'reg-003',
    wasteProcessingType: 'reprocessor-output', // PRN
    material: 'paper',
    site: { address: { line1: 'Output Site' } },
    accreditationId: 'acc-003'
  },
  accreditation: { id: 'acc-003', status: 'approved' }
}

const fixtureExporter = {
  organisationData: { id: 'org-456', name: 'Exporter Organisation' },
  registration: {
    id: 'reg-002',
    wasteProcessingType: 'exporter', // PERN
    material: 'plastic',
    site: null, // Exporters don't have a processing site
    accreditationId: 'acc-002'
  },
  accreditation: { id: 'acc-002', status: 'approved' }
}

const stubWasteBalance = { amount: 20.5, availableAmount: 10.3 }

const stubPrns = [
  {
    id: 'prn-001',
    prnNumber: 'PRN-2026-00001',
    issuedToOrganisation: { name: 'ComplyPak Ltd' },
    tonnageValue: 9,
    createdAt: '2026-01-21T10:30:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    prnNumber: 'PRN-2026-00002',
    issuedToOrganisation: { name: 'Nestle (SEPA)', tradingName: 'Nestle UK' },
    tonnageValue: 4,
    createdAt: '2026-01-19T14:00:00Z',
    status: 'awaiting_authorisation'
  }
]

const reprocessorUrl = '/organisations/org-123/registrations/reg-001/prns'
const reprocessorOutputUrl = '/organisations/org-789/registrations/reg-003/prns'
const exporterUrl = '/organisations/org-456/registrations/reg-002/prns'

describe('#prnListController', () => {
  beforeAll(() => {
    config.set('featureFlags.prns', true)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getWasteBalance).mockResolvedValue(stubWasteBalance)
    vi.mocked(getPrns).mockResolvedValue(stubPrns)
  })

  afterAll(() => {
    config.reset('featureFlags.prns')
  })

  describe('authentication', () => {
    it('should redirect to login when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: reprocessorUrl
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })

  describe('error handling', () => {
    it('should return 404 when registration not found', async ({ server }) => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue({
        organisationData: fixtureReprocessor.organisationData,
        registration: undefined,
        accreditation: undefined
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/org-123/registrations/reg-nonexistent/prns',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 when registration has no accreditation', async ({
      server
    }) => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue({
        organisationData: fixtureReprocessor.organisationData,
        registration: fixtureReprocessor.registration,
        accreditation: undefined
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('page rendering for reprocessor (PRN)', () => {
    beforeEach(() => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
    })

    it('should render page with PRNs heading', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body, title } = dom.window.document

      expect(title).toMatch(/PRNs/i)

      const main = getByRole(body, 'main')
      const heading = getByRole(main, 'heading', { level: 1 })

      expect(heading.textContent).toContain('PRNs')
      expect(heading.textContent).not.toContain('PERNs')
    })

    it('should display available waste balance', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      // Check the waste balance panel content
      const panel = main.querySelector('.epr-waste-balance-banner')

      expect(panel).not.toBeNull()
      expect(panel.textContent).toContain('10.30 tonnes')
      expect(panel.textContent).toContain('Available waste balance')
      expect(panel.textContent).toContain(
        'This is the balance available for creating new PRNs'
      )
    })

    it('should display "Select a PRN" subheading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const subheading = main.querySelector('.govuk-heading-m')

      expect(subheading).not.toBeNull()
      expect(subheading.textContent).toContain('Select a PRN')
    })

    it('should display inset text about cancellation', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const insetText = main.querySelector('.govuk-inset-text')

      expect(insetText).not.toBeNull()
      expect(insetText.textContent).toContain(
        'If you cancel a PRN, its tonnage will be added to your available waste balance'
      )
    })

    it('should fetch registration data with correct parameters', async ({
      server
    }) => {
      await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(getRegistrationWithAccreditation).toHaveBeenCalledWith(
        'org-123',
        'reg-001',
        'mock-id-token'
      )
    })

    it('should fetch waste balance with correct parameters', async ({
      server
    }) => {
      await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(getWasteBalance).toHaveBeenCalledWith(
        'org-123',
        'acc-001',
        'mock-id-token',
        expect.any(Object)
      )
    })

    it('should fetch PRNs with correct parameters', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(getPrns).toHaveBeenCalledWith(
        'org-123',
        'acc-001',
        'mock-id-token',
        expect.any(Object)
      )
    })

    it('should not display waste balance banner when API returns null', async ({
      server
    }) => {
      vi.mocked(getWasteBalance).mockResolvedValue(null)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const banner = main.querySelector('.epr-waste-balance-banner')

      expect(banner).toBeNull()
    })
  })

  describe('page rendering for reprocessor-output (PRN)', () => {
    beforeEach(() => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessorOutput
      )
    })

    it('should render page with PRNs heading (not PERNs)', async ({
      server
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorOutputUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const heading = getByRole(main, 'heading', { level: 1 })

      expect(heading.textContent).toContain('PRNs')
      expect(heading.textContent).not.toContain('PERNs')
    })
  })

  describe('page rendering for exporter (PERN)', () => {
    beforeEach(() => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
        fixtureExporter
      )
    })

    it('should render page with PERNs heading', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body, title } = dom.window.document

      expect(title).toMatch(/PERNs/i)

      const main = getByRole(body, 'main')
      const heading = getByRole(main, 'heading', { level: 1 })

      expect(heading.textContent).toContain('PERNs')
      expect(heading.textContent).not.toContain('PRNs')
    })

    it('should display PERN-specific text throughout', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      // Check banner has PERN-specific text
      const banner = main.querySelector('.epr-waste-balance-banner')

      expect(banner.textContent).toContain(
        'This is the balance available for creating new PERNs'
      )

      const subheading = main.querySelector('.govuk-heading-m')

      expect(subheading).not.toBeNull()
      expect(subheading.textContent).toContain('Select a PERN')

      const insetText = main.querySelector('.govuk-inset-text')

      expect(insetText.textContent).toContain('If you cancel a PERN')
    })
  })

  describe('prn table rendering', () => {
    beforeEach(() => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
    })

    it('should render table with correct column headers', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const table = getByRole(main, 'table')
      const headers = within(table).getAllByRole('columnheader')
      const headerTexts = headers.map((h) => h.textContent.trim())

      expect(headerTexts).toContain(
        'Packaging waste producer or compliance scheme'
      )
      expect(headerTexts).toContain('Date created')
      expect(headerTexts).toContain('Tonnage')
      expect(headerTexts).toContain('Status')
    })

    it('should render first PRN row with correct data', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const table = getByRole(main, 'table')

      expect(getByText(table, 'ComplyPak Ltd')).toBeDefined()
      expect(getByText(table, '21 January 2026')).toBeDefined()
      expect(getByText(table, '9')).toBeDefined()
    })

    it('should render second PRN row with correct data', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const table = getByRole(main, 'table')

      expect(getByText(table, 'Nestle (SEPA)')).toBeDefined()
      expect(getByText(table, '19 January 2026')).toBeDefined()
      expect(getByText(table, '4')).toBeDefined()
    })

    it('should render status as GDS tags with blue colour', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const table = getByRole(main, 'table')
      const tags = table.querySelectorAll('.govuk-tag')
      const statusTags = table.querySelectorAll('.govuk-tag--blue')
      const tagTexts = Array.from(statusTags).map((tag) => tag.textContent)

      expect(tags.length).toBeGreaterThanOrEqual(2)
      expect(statusTags.length).toBeGreaterThanOrEqual(2)
      expect(
        tagTexts.some((text) => text.includes('Awaiting authorisation'))
      ).toBe(true)
    })
  })

  describe('empty state', () => {
    beforeEach(() => {
      vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
    })

    it('should render table with headers but no rows when no PRNs exist', async ({
      server
    }) => {
      vi.mocked(getPrns).mockResolvedValue([])

      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      // Table should still exist with headers
      const table = getByRole(main, 'table')
      const headers = within(table).getAllByRole('columnheader')
      const rows = within(table).queryAllByRole('row')

      expect(table).toBeDefined()
      expect(headers).toHaveLength(4)
      // Only header row, no data rows
      expect(rows).toHaveLength(1)
    })
  })
})
