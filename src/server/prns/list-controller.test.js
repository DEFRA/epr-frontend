import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { fetchPackagingRecyclingNotes } from './helpers/fetch-packaging-recycling-notes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import Boom from '@hapi/boom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, it as unitIt, vi } from 'vitest'
import { listController } from './list-controller.js'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('#server/common/helpers/waste-balance/get-waste-balance.js'))
vi.mock(import('./helpers/fetch-packaging-recycling-notes.js'))

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
    wasteProcessingType: 'reprocessor-input',
    material: 'glass',
    glassRecyclingProcess: ['glass_re_melt'],
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const fixtureExporter = {
  organisationData: { id: 'org-456', name: 'Exporter Organisation' },
  registration: {
    id: 'reg-002',
    wasteProcessingType: 'exporter',
    material: 'plastic',
    site: null,
    accreditationId: 'acc-002'
  },
  accreditation: { id: 'acc-002', status: 'approved' }
}

const mockWasteBalance = { availableAmount: 150.5 }

const mockPrns = [
  {
    id: 'prn-001',
    prnNumber: null,
    issuedToOrganisation: { id: 'producer-1', name: 'Acme Packaging Ltd' },
    createdAt: '2026-01-15T00:00:00.000Z',
    issuedAt: null,
    tonnage: 50,
    material: 'glass',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    prnNumber: null,
    issuedToOrganisation: { id: 'producer-2', name: 'BigCo Waste Solutions' },
    createdAt: '2026-01-18T00:00:00.000Z',
    issuedAt: null,
    tonnage: 120,
    material: 'plastic',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-003',
    prnNumber: 'ER2612345',
    issuedToOrganisation: { id: 'producer-3', name: 'Green Compliance Scheme' },
    createdAt: '2026-01-20T00:00:00.000Z',
    issuedAt: '2026-01-22T10:00:00.000Z',
    tonnage: 75,
    material: 'glass',
    status: 'awaiting_acceptance'
  }
]

const mockPrnsWithCancellation = [
  ...mockPrns,
  {
    id: 'prn-cancel-001',
    prnNumber: 'ER2699001',
    issuedToOrganisation: { id: 'producer-4', name: 'TFR Facilities' },
    createdAt: '2025-08-13T00:00:00.000Z',
    issuedAt: '2025-08-14T00:00:00.000Z',
    tonnage: 5,
    material: 'glass',
    status: 'awaiting_cancellation'
  },
  {
    id: 'prn-cancel-002',
    prnNumber: 'ER2699002',
    issuedToOrganisation: { id: 'producer-5', name: 'Linton Construction' },
    createdAt: '2025-08-07T00:00:00.000Z',
    issuedAt: '2025-08-08T00:00:00.000Z',
    tonnage: 25,
    material: 'plastic',
    status: 'awaiting_cancellation'
  }
]

const mockPrnsWithCancelled = [
  ...mockPrns,
  {
    id: 'prn-cancelled-001',
    prnNumber: 'ER2688001',
    issuedToOrganisation: { id: 'producer-6', name: 'Cancelled Corp' },
    createdAt: '2026-01-05T00:00:00.000Z',
    issuedAt: '2026-01-06T00:00:00.000Z',
    tonnage: 30,
    material: 'glass',
    status: 'cancelled'
  },
  {
    id: 'prn-cancelled-002',
    prnNumber: 'ER2688002',
    issuedToOrganisation: { id: 'producer-7', name: 'Revoked Ltd' },
    createdAt: '2026-01-08T00:00:00.000Z',
    issuedAt: '2026-01-09T00:00:00.000Z',
    tonnage: 15,
    material: 'plastic',
    status: 'cancelled'
  }
]

const reprocessorListUrl =
  '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes'
const exporterListUrl =
  '/organisations/org-456/registrations/reg-002/accreditations/acc-002/packaging-recycling-notes'

describe('#listPrnsController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getWasteBalance).mockResolvedValue(mockWasteBalance)
    vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)
  })

  describe('when feature is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', false)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    it('should return 404', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorListUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    unitIt(
      'should throw notFound when feature flag is disabled (unit test)',
      async () => {
        const mockRequest = { params: {}, auth: { credentials: {} } }
        const mockH = {}

        await expect(
          listController.handler(mockRequest, mockH)
        ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } })
      }
    )
  })

  describe('when feature is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    describe('page rendering', () => {
      beforeEach(() => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
      })

      it('should render page with correct title and heading', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body, title } = dom.window.document

        expect(title).toMatch(/PRNs/i)

        const main = getByRole(body, 'main')
        const heading = getByRole(main, 'heading', { level: 1 })

        expect(heading.textContent).toContain('PRNs')
      })

      it('should render back link', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001'
        )
      })

      it('should render create PRN link', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const createLink = getByText(main, /Create a PRN/i)

        expect(createLink).toBeDefined()
        expect(createLink.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes/create'
        )
      })

      it('should render waste balance section', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const wasteBalanceBanner = main.querySelector(
          '.epr-waste-balance-banner'
        )

        expect(wasteBalanceBanner).not.toBeNull()
        expect(wasteBalanceBanner?.textContent).toMatch(/150\.50/)
        expect(wasteBalanceBanner?.textContent).toMatch(
          /Available waste balance/i
        )
        expect(wasteBalanceBanner?.textContent).toMatch(
          /This is the balance available for creating new PRNs/i
        )
      })

      it('should render PRN table with correct headings', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')
        const table = getByRole(awaitingPanel, 'table')

        expect(getByText(table, /Producer or compliance scheme/i)).toBeDefined()
        expect(getByText(table, /Date created/i)).toBeDefined()
        expect(getByText(table, /Tonnage/i)).toBeDefined()
        expect(getByText(table, /Status/i)).toBeDefined()
      })

      it('should render select heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Select a PRN/i)).toBeDefined()
      })

      it('should render select links for each PRN row', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')
        const table = getByRole(awaitingPanel, 'table')

        const selectLinks = table.querySelectorAll('tbody a.govuk-link')

        expect(selectLinks).toHaveLength(2)
      })

      it('displays tradingName in table when organisation has no registrationType', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            ...mockPrns[0],
            issuedToOrganisation: {
              id: 'producer-1',
              name: 'Legal Name Ltd',
              tradingName: 'Trading Name Ltd'
            }
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Trading Name Ltd/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Legal Name Ltd<')
      })

      it('displays legal name for large producers with registrationType', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            ...mockPrns[0],
            issuedToOrganisation: {
              id: 'producer-1',
              name: 'Legal Name Ltd',
              tradingName: 'Trading Name Ltd',
              registrationType: 'LARGE_PRODUCER'
            }
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Legal Name Ltd/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Trading Name Ltd<')
      })

      it('displays tradingName for compliance schemes with registrationType', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            ...mockPrns[0],
            issuedToOrganisation: {
              id: 'scheme-1',
              name: 'Scheme Legal Ltd',
              tradingName: 'Scheme Trading Name',
              registrationType: 'COMPLIANCE_SCHEME'
            }
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Scheme Trading Name/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Scheme Legal Ltd<')
      })

      it('should render inset text about cancellation', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(
            main,
            /If you delete or cancel a PRN, its tonnage will be added to your available waste balance/i
          )
        ).toBeDefined()
      })

      it('should only show PRNs with awaiting authorisation status in awaiting action tab', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')
        const table = getByRole(awaitingPanel, 'table')
        const rows = table.querySelectorAll('tbody tr')

        // Stub data has 2 PRNs with awaiting_authorisation status + 1 total row
        expect(rows).toHaveLength(3)

        // Should not show 'Issued' status PRNs in the awaiting action tab
        expect(queryByText(table, /^Issued$/)).toBeNull()
      })
    })

    describe('awaiting cancellation section', () => {
      beforeEach(() => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(
          mockPrnsWithCancellation
        )
      })

      it('should render awaiting cancellation heading in awaiting action tab', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')

        expect(
          getByText(awaitingPanel, /PRNs awaiting cancellation/i)
        ).toBeDefined()
      })

      it('should render cancellation PRN data in a separate table', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')

        expect(getByText(awaitingPanel, /TFR Facilities/)).toBeDefined()
        expect(getByText(awaitingPanel, /Linton Construction/)).toBeDefined()
      })

      it('should render select links for cancellation PRN rows', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')
        const tables = awaitingPanel.querySelectorAll('table')

        // Should have two tables: authorisation and cancellation
        expect(tables).toHaveLength(2)

        // Cancellation table should have 2 data rows + 1 total row
        const cancellationTable = tables[1]
        const cancellationRows = cancellationTable.querySelectorAll('tbody tr')
        expect(cancellationRows).toHaveLength(3)
      })

      it('should render awaiting cancellation status tag in cancellation table', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')
        const tables = awaitingPanel.querySelectorAll('table')
        const cancellationTable = tables[1]

        const statusTags =
          cancellationTable.querySelectorAll('.govuk-tag--yellow')
        expect(statusTags).toHaveLength(2)
        expect(statusTags[0].textContent).toMatch(/Awaiting cancellation/i)
        expect(statusTags[1].textContent).toMatch(/Awaiting cancellation/i)
      })

      it('should not render cancellation section when no awaiting_cancellation PRNs', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')

        expect(queryByText(awaitingPanel, /awaiting cancellation/i)).toBeNull()
      })

      it('should not show awaiting_cancellation PRNs in the authorisation table', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')
        const tables = awaitingPanel.querySelectorAll('table')

        // First table is the authorisation table — should still have 2 data rows + 1 total
        const authorisationTable = tables[0]
        const authRows = authorisationTable.querySelectorAll('tbody tr')
        expect(authRows).toHaveLength(3)
      })

      it('should render tabs when only awaiting_cancellation PRNs exist', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            id: 'prn-cancel-only',
            prnNumber: 'ER2699099',
            issuedToOrganisation: {
              id: 'producer-x',
              name: 'Cancel Only Corp'
            },
            createdAt: '2025-09-01T00:00:00.000Z',
            issuedAt: '2025-09-02T00:00:00.000Z',
            tonnage: 10,
            material: 'glass',
            status: 'awaiting_cancellation'
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(main.querySelector('.govuk-tabs')).not.toBeNull()
      })
    })

    describe('cancelled tab', () => {
      beforeEach(() => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(
          mockPrnsWithCancelled
        )
      })

      it('should render cancelled tab in the tabs list', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const tabsList = main.querySelector('.govuk-tabs__list')

        expect(getByText(tabsList, /Cancelled/)).toBeDefined()
      })

      it('should render cancelled PRN data in cancelled panel', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )

        expect(getByText(cancelledPanel, /Cancelled Corp/)).toBeDefined()
        expect(getByText(cancelledPanel, /Revoked Ltd/)).toBeDefined()
        expect(getByText(cancelledPanel, /ER2688001/)).toBeDefined()
        expect(getByText(cancelledPanel, /ER2688002/)).toBeDefined()
      })

      it('should render cancelled heading in cancelled panel', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )

        expect(getByText(cancelledPanel, /Cancelled PRNs/i)).toBeDefined()
      })

      it('should render cancelled status tags with red colour', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )
        const cancelledTable = getByRole(cancelledPanel, 'table')

        const statusTags = cancelledTable.querySelectorAll('.govuk-tag--red')
        expect(statusTags).toHaveLength(2)
        expect(statusTags[0].textContent).toMatch(/Cancelled/i)
      })

      it('should render view links with target="_blank" for cancelled PRNs', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )
        const cancelledTable = getByRole(cancelledPanel, 'table')
        const viewLinks = cancelledTable.querySelectorAll('a[target="_blank"]')

        expect(viewLinks).toHaveLength(2)
        expect(viewLinks[0].getAttribute('href')).toContain(
          'prn-cancelled-001/view'
        )
      })

      it('should show empty state message when no cancelled PRNs', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )

        expect(
          getByText(cancelledPanel, /You have not cancelled any PRNs/i)
        ).toBeDefined()
      })

      it('should not show cancelled PRNs in issued tab', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const issuedPanel = getByRole(body, 'main').querySelector('#issued')

        expect(queryByText(issuedPanel, /Cancelled Corp/)).toBeNull()
        expect(queryByText(issuedPanel, /Revoked Ltd/)).toBeNull()
      })

      it('should render "Cancelled PERNs" heading for exporter', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(
          mockPrnsWithCancelled
        )

        const { result } = await server.inject({
          method: 'GET',
          url: exporterListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )

        expect(getByText(cancelledPanel, /Cancelled PERNs/i)).toBeDefined()
      })

      it('should render "PERN number" column heading for exporter', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(
          mockPrnsWithCancelled
        )

        const { result } = await server.inject({
          method: 'GET',
          url: exporterListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )

        expect(getByText(cancelledPanel, /PERN number/i)).toBeDefined()
      })

      it('should show "You have not cancelled any PERNs" empty message for exporter', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)

        const { result } = await server.inject({
          method: 'GET',
          url: exporterListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const cancelledPanel = getByRole(body, 'main').querySelector(
          '#cancelled'
        )

        expect(
          getByText(cancelledPanel, /You have not cancelled any PERNs/i)
        ).toBeDefined()
      })
    })

    describe('conditional tabs', () => {
      beforeEach(() => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
      })

      it('should render tabs when non-draft PRNs exist even without issued PRNs', async ({
        server
      }) => {
        const onlyAwaitingAuth = mockPrns.filter(
          (prn) => prn.status === 'awaiting_authorisation'
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(
          onlyAwaitingAuth
        )

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tabs = main.querySelector('.govuk-tabs')
        expect(tabs).not.toBeNull()
      })

      it('should render tabs when issued PRNs exist', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tabs = main.querySelector('.govuk-tabs')
        expect(tabs).not.toBeNull()
      })

      it('should render issued tab heading and column headers', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const issuedPanel = getByRole(body, 'main').querySelector('#issued')
        expect(issuedPanel).not.toBeNull()

        expect(getByText(issuedPanel, /Issued PRNs/i)).toBeDefined()
        expect(getByText(issuedPanel, /PRN number/i)).toBeDefined()
        expect(
          getByText(issuedPanel, /Producer or compliance scheme/i)
        ).toBeDefined()
        expect(getByText(issuedPanel, /Date issued/i)).toBeDefined()
      })

      it('should render issued PRN data in issued tab panel', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(mockPrns)

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const issuedPanel = getByRole(body, 'main').querySelector('#issued')

        expect(getByText(issuedPanel, /ER2612345/)).toBeDefined()
        expect(getByText(issuedPanel, /22 January 2026/)).toBeDefined()
      })

      it('should render accepted PRNs in issued tab with green tag', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          ...mockPrns,
          {
            id: 'prn-004',
            prnNumber: 'ER2699999',
            issuedToOrganisation: {
              id: 'producer-4',
              name: 'Accepted Corp'
            },
            createdAt: '2026-01-20T00:00:00.000Z',
            issuedAt: '2026-01-25T10:00:00.000Z',
            tonnage: 40,
            material: 'glass',
            status: 'accepted'
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const issuedPanel = getByRole(body, 'main').querySelector('#issued')
        const issuedTable = getByRole(issuedPanel, 'table')

        expect(getByText(issuedTable, /ER2699999/)).toBeDefined()
        expect(getByText(issuedTable, /Accepted Corp/)).toBeDefined()

        const acceptedTag = issuedTable.querySelector('.govuk-tag--green')
        expect(acceptedTag).not.toBeNull()
        expect(acceptedTag?.textContent).toMatch(/Accepted/i)
      })

      it('should show awaiting action content inside tabs when no issued PRNs', async ({
        server
      }) => {
        const onlyAwaitingAuth = mockPrns.filter(
          (prn) => prn.status === 'awaiting_authorisation'
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(
          onlyAwaitingAuth
        )

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const awaitingPanel = main.querySelector('#awaiting-action')

        expect(
          getByText(awaitingPanel, /PRNs awaiting authorisation/i)
        ).toBeDefined()
        expect(getByRole(awaitingPanel, 'table')).toBeDefined()
        expect(
          getByText(
            awaitingPanel,
            /If you delete or cancel a PRN, its tonnage will be added to your available waste balance/i
          )
        ).toBeDefined()
      })
    })

    describe('error handling', () => {
      it('should return 404 when registration not found', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockRejectedValue(
          Boom.notFound('Registration not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/org-123/registrations/reg-nonexistent/accreditations/acc-001/packaging-recycling-notes',
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
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should handle waste balance fetch failure gracefully', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(getWasteBalance).mockResolvedValue(null)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should handle missing accreditationId gracefully', async ({
        server
      }) => {
        const fixtureNoAccreditationId = {
          ...fixtureReprocessor,
          registration: {
            ...fixtureReprocessor.registration,
            accreditationId: undefined
          }
        }
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureNoAccreditationId
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(getWasteBalance).not.toHaveBeenCalled()
      })

      it('should handle waste balance map missing the accreditation key', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(getWasteBalance).mockResolvedValue(null)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should propagate error when PRN fetch fails', async ({ server }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockRejectedValue(
          new Error('Backend unavailable')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })

      it('should show no PRNs message when no PRNs exist', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([])

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /You have not created any PRNs/i)).toBeDefined()
      })
    })

    describe('zero PRN state', () => {
      it('should not render tabs when no PRNs have been created', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(main.querySelector('.govuk-tabs')).toBeNull()
      })

      it('should render tabs when PRNs exist with issued status', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            id: 'prn-003',
            prnNumber: 'ER2612345',
            issuedToOrganisation: {
              id: 'producer-3',
              name: 'Green Compliance Scheme'
            },
            createdAt: '2026-01-20T00:00:00.000Z',
            issuedAt: '2026-01-22T10:00:00.000Z',
            tonnage: 75,
            material: 'glass',
            status: 'awaiting_acceptance'
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(main.querySelector('.govuk-tabs')).not.toBeNull()
      })

      it('should render tabs when non-draft PRNs exist even if none are issued', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            id: 'prn-004',
            issuedToOrganisation: { id: 'producer-4', name: 'Auth Only Corp' },
            createdAt: '2026-01-20T00:00:00.000Z',
            tonnage: 30,
            material: 'glass',
            status: 'awaiting_authorisation'
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result, { url: 'http://localhost' })
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(main.querySelector('.govuk-tabs')).not.toBeNull()
      })

      it('should not render tabs when only draft PRNs exist', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([
          {
            id: 'prn-draft',
            issuedToOrganisation: { id: 'producer-draft', name: 'Draft Corp' },
            createdAt: '2026-01-20T00:00:00.000Z',
            tonnage: 10,
            material: 'glass',
            status: 'draft'
          }
        ])

        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(main.querySelector('.govuk-tabs')).toBeNull()
        expect(getByText(main, /You have not created any PRNs/i)).toBeDefined()
      })

      it('should show PERN-specific empty message for exporters', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue([])

        const { result } = await server.inject({
          method: 'GET',
          url: exporterListUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /You have not created any PERNs/i)).toBeDefined()
      })
    })

    describe('authentication', () => {
      it('should redirect to login when not authenticated', async ({
        server
      }) => {
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe('/logged-out')
      })
    })

    describe('dynamic PRN/PERN text', () => {
      describe('for reprocessor (PRN)', () => {
        beforeEach(() => {
          vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
            fixtureReprocessor
          )
        })

        it('should display PRN in title and heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: reprocessorListUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body, title } = dom.window.document
          const main = getByRole(body, 'main')

          expect(title).toContain('PRNs')
          expect(
            getByRole(main, 'heading', { level: 1 }).textContent
          ).toContain('PRNs')
        })

        it('should display PRN in section text', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: reprocessorListUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /PRNs awaiting authorisation/i)).toBeDefined()
          expect(getByText(main, /Create a PRN/i)).toBeDefined()
        })
      })

      describe('for exporter (PERN)', () => {
        beforeEach(() => {
          vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
            fixtureExporter
          )
        })

        it('should display PERN in title and heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: exporterListUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body, title } = dom.window.document
          const main = getByRole(body, 'main')

          expect(title).toContain('PERNs')
          expect(
            getByRole(main, 'heading', { level: 1 }).textContent
          ).toContain('PERNs')
        })

        it('should display PERN in section text', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: exporterListUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /PERNs awaiting authorisation/i)).toBeDefined()
          expect(getByText(main, /Create a PERN/i)).toBeDefined()
        })
      })
    })
  })
})
