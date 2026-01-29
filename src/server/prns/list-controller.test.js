import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, it as unitIt, vi } from 'vitest'
import { listController } from './list-controller.js'

vi.mock(
  import('#server/common/helpers/organisations/get-registration-with-accreditation.js')
)
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))

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

const mockWasteBalance = {
  'acc-001': { availableAmount: 150.5 },
  'acc-002': { availableAmount: 200 }
}

const reprocessorListUrl = '/organisations/org-123/registrations/reg-001/prns'
const exporterListUrl = '/organisations/org-456/registrations/reg-002/prns'

describe('#listPrnsController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchWasteBalances).mockResolvedValue(mockWasteBalance)
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
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
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
          '/organisations/org-123/registrations/reg-001/create-prn'
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
          /This is the balance available for creating PRNs/i
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
        const table = getByRole(main, 'table')

        expect(
          getByText(table, /Packaging waste producer or compliance scheme/i)
        ).toBeDefined()
        expect(getByText(table, /Date created/i)).toBeDefined()
        expect(getByText(table, /Tonnage/i)).toBeDefined()
        expect(getByText(table, /Status/i)).toBeDefined()
        expect(getByText(table, /Action/i)).toBeDefined()
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
        const table = getByRole(main, 'table')

        const selectLinks = table.querySelectorAll('tbody a.govuk-link')

        expect(selectLinks).toHaveLength(2)
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
            /If you cancel a PRN, its tonnage will be added to your available waste balance/i
          )
        ).toBeDefined()
      })

      it('should only show PRNs with awaiting authorisation status', async ({
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
        const table = getByRole(main, 'table')
        const rows = table.querySelectorAll('tbody tr')

        // Stub data has 2 PRNs with awaiting_authorisation status
        expect(rows).toHaveLength(2)

        // Should not show 'Issued' status PRNs
        expect(queryByText(table, /^Issued$/)).toBeNull()
      })
    })

    describe('error handling', () => {
      it('should return 404 when registration not found', async ({
        server
      }) => {
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
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should handle waste balance fetch failure gracefully', async ({
        server
      }) => {
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchWasteBalances).mockRejectedValue(
          new Error('API failure')
        )

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
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
          fixtureNoAccreditationId
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(fetchWasteBalances).not.toHaveBeenCalled()
      })

      it('should handle waste balance map missing the accreditation key', async ({
        server
      }) => {
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchWasteBalances).mockResolvedValue({})

        const { statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorListUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
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
          vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
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

          expect(getByText(main, /Select a PRN/i)).toBeDefined()
          expect(getByText(main, /Create a PRN/i)).toBeDefined()
        })
      })

      describe('for exporter (PERN)', () => {
        beforeEach(() => {
          vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
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

          expect(getByText(main, /Select a PERN/i)).toBeDefined()
          expect(getByText(main, /Create a PERN/i)).toBeDefined()
        })
      })
    })
  })
})
