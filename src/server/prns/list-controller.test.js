import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getPrns } from '#server/common/helpers/prns/get-prns.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, within } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
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
    prnNumber: 'ER2625468U',
    issuedToOrganisation: { name: 'ComplyPak Ltd' },
    tonnageValue: 9,
    createdAt: '2026-01-21T10:30:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    prnNumber: 'ER2612345A',
    issuedToOrganisation: { name: 'Nestle (SEPA)', tradingName: 'Nestle UK' },
    tonnageValue: 4,
    createdAt: '2026-01-19T14:00:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-003',
    prnNumber: 'ER2699887B',
    issuedToOrganisation: { name: 'GreenPack Solutions' },
    tonnageValue: 7,
    createdAt: '2026-01-18T09:00:00Z',
    status: 'awaiting_acceptance'
  },
  {
    id: 'prn-004',
    prnNumber: 'ER2633221C',
    issuedToOrganisation: { name: 'EcoWaste Ltd' },
    tonnageValue: 12,
    createdAt: '2026-01-15T11:00:00Z',
    status: 'accepted'
  },
  {
    id: 'prn-005',
    prnNumber: 'ER2677654D',
    issuedToOrganisation: { name: 'RecycleCo' },
    tonnageValue: 3,
    createdAt: '2026-01-12T16:00:00Z',
    status: 'awaiting_cancellation'
  },
  {
    id: 'prn-006',
    prnNumber: 'ER2611111E',
    issuedToOrganisation: { name: 'WasteAway Inc' },
    tonnageValue: 6,
    createdAt: '2026-01-10T08:30:00Z',
    status: 'cancelled'
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
      vi.mocked(getRequiredRegistrationWithAccreditation).mockRejectedValue(
        Boom.notFound('Registration not found')
      )

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
      vi.mocked(getRequiredRegistrationWithAccreditation).mockRejectedValue(
        Boom.notFound('Not accredited for this registration')
      )

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
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
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

    it('should render back link to registration dashboard', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const backLink = body.querySelector('.govuk-back-link')

      expect(backLink).not.toBeNull()
      expect(backLink.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001'
      )
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

    it('should render "Create a PRN" button link with correct href', async ({
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
      const createButton = getByRole(main, 'button', { name: /Create a PRN/i })

      expect(createButton).toBeDefined()
      expect(createButton.tagName).toBe('A')
      expect(createButton.classList.contains('govuk-button')).toBe(true)
      expect(createButton.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })

    it('should not display inset text about cancellation', async ({
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
      const insetText = main.querySelector('.govuk-inset-text')

      expect(insetText).toBeNull()
    })

    it('should fetch registration data with correct parameters', async ({
      server
    }) => {
      await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(getRequiredRegistrationWithAccreditation).toHaveBeenCalledWith(
        'org-123',
        'reg-001',
        'mock-id-token',
        expect.any(Object)
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
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
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
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
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

      expect(insetText).toBeNull()
    })

    it('should render "Create a PERN" button link with correct href', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const createButton = getByRole(main, 'button', { name: /Create a PERN/i })

      expect(createButton).toBeDefined()
      expect(createButton.tagName).toBe('A')
      expect(createButton.classList.contains('govuk-button')).toBe(true)
      expect(createButton.getAttribute('href')).toBe(
        '/organisations/org-456/registrations/reg-002/create-prn'
      )
    })
  })

  describe('prn table rendering', () => {
    beforeEach(() => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
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

      expect(headers).toHaveLength(5)
      expect(headerTexts).toStrictEqual([
        'Packaging waste producer or compliance scheme',
        'Date created',
        'Tonnage',
        'Status',
        'Action'
      ])
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

      const rows = within(table).getAllByRole('row')
      const firstRowCells = rows[1].querySelectorAll('td')

      expect(firstRowCells[0].textContent).toBe('ComplyPak Ltd')
      expect(firstRowCells[1].textContent).toBe('21 January 2026')
      expect(firstRowCells[2].textContent.trim()).toBe('9')
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
      const rows = within(table).getAllByRole('row')
      const secondRowCells = rows[2].querySelectorAll('td')

      expect(secondRowCells[0].textContent).toBe('Nestle (SEPA)')
      expect(secondRowCells[1].textContent).toBe('19 January 2026')
      expect(secondRowCells[2].textContent.trim()).toBe('4')
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

    it('should render first row select link with correct href and visually hidden text', async ({
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
      const selectLinks = table.querySelectorAll('td a')

      expect(selectLinks).toHaveLength(2)
      expect(selectLinks[0].getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/prns/ER2625468U'
      )
      expect(selectLinks[0].textContent).toContain('Select')

      const hiddenSpan = selectLinks[0].querySelector('.govuk-visually-hidden')

      expect(hiddenSpan).not.toBeNull()
      expect(hiddenSpan.textContent).toContain('ComplyPak Ltd')
    })

    it('should render second row select link with correct href and visually hidden text', async ({
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
      const selectLinks = table.querySelectorAll('td a')

      expect(selectLinks[1].getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/prns/ER2612345A'
      )
      expect(selectLinks[1].textContent).toContain('Select')

      const hiddenSpan = selectLinks[1].querySelector('.govuk-visually-hidden')

      expect(hiddenSpan).not.toBeNull()
      expect(hiddenSpan.textContent).toContain('Nestle (SEPA)')
    })
  })

  describe('prn status filtering', () => {
    beforeEach(() => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
    })

    it('should only display PRNs with awaiting_authorisation status', async ({
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
      const rows = within(table).queryAllByRole('row')

      // 1 header row + 2 data rows (only awaiting_authorisation)
      expect(rows).toHaveLength(3)

      // Should contain the two awaiting_authorisation PRNs
      const firstRowCells = rows[1].querySelectorAll('td')
      const secondRowCells = rows[2].querySelectorAll('td')

      expect(firstRowCells[0].textContent).toBe('ComplyPak Ltd')
      expect(secondRowCells[0].textContent).toBe('Nestle (SEPA)')
    })

    it('should not display PRNs with other statuses', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const table = getByRole(main, 'table')
      const tableText = table.textContent

      expect(tableText).not.toContain('GreenPack Solutions')
      expect(tableText).not.toContain('EcoWaste Ltd')
      expect(tableText).not.toContain('RecycleCo')
      expect(tableText).not.toContain('WasteAway Inc')
    })

    it('should show empty table when no PRNs have awaiting_authorisation status', async ({
      server
    }) => {
      vi.mocked(getPrns).mockResolvedValue([
        {
          id: 'prn-accepted',
          prnNumber: 'ER2688888F',
          issuedToOrganisation: { name: 'Already Accepted Corp' },
          tonnageValue: 10,
          createdAt: '2026-01-20T10:00:00Z',
          status: 'accepted'
        },
        {
          id: 'prn-cancelled',
          prnNumber: 'ER2677777G',
          issuedToOrganisation: { name: 'Cancelled Corp' },
          tonnageValue: 5,
          createdAt: '2026-01-18T10:00:00Z',
          status: 'cancelled'
        }
      ])

      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const table = getByRole(main, 'table')
      const rows = within(table).queryAllByRole('row')

      // Only header row, no data rows
      expect(rows).toHaveLength(1)
    })
  })

  describe('empty state', () => {
    beforeEach(() => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
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
      expect(headers).toHaveLength(5)
      // Only header row, no data rows
      expect(rows).toHaveLength(1)
    })
  })
})
