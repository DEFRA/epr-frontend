import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getByLabelText,
  getByRole,
  getByText,
  within
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/common/helpers/waste-balance/get-waste-balance.js'))

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
    wasteProcessingType: 'exporter', // PERN
    material: 'plastic',
    site: null, // Exporters don't have a processing site
    accreditationId: 'acc-002'
  },
  accreditation: { id: 'acc-002', status: 'approved' }
}

const reprocessorUrl =
  '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes/create'
const exporterUrl =
  '/organisations/org-456/registrations/reg-002/accreditations/acc-002/packaging-recycling-notes/create'

describe('#createPrnController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
      })

      it('should render back link to registration page', async ({ server }) => {
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

      it('should render page with correct title and heading', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body, title } = dom.window.document

        expect(title).toMatch(/Create a PRN/i)

        const main = getByRole(body, 'main')
        const heading = getByRole(main, 'heading', { level: 1 })

        expect(heading.textContent).toContain('Create a PRN')
      })

      it('should render material type display', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Material:/i)).toBeDefined()
        expect(getByText(main, 'Glass remelt')).toBeDefined()
      })

      it('should render tonnage input field with suffix', async ({
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

        const tonnageInput = getByLabelText(main, /Enter PRN tonnage/i)

        expect(tonnageInput).toBeDefined()
        expect(tonnageInput.getAttribute('type')).toBe('text')
        expect(
          getByText(main, /Enter a whole number without decimal places/i)
        ).toBeDefined()
        expect(getByText(main, 'tonnes')).toBeDefined()
      })

      it('should render recipient select field with options', async ({
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

        expect(
          getByText(main, /Enter who this PRN will be issued to/i)
        ).toBeDefined()

        expect(
          getByText(
            main,
            /Start typing the name of the packaging waste producer or compliance scheme/i
          )
        ).toBeDefined()

        const recipientSelect = getByRole(main, 'combobox', {
          name: /Enter who this PRN will be issued to/i
        })

        expect(recipientSelect.options.length).toBeGreaterThan(1)
      })

      it('should render help text details component with bullet list', async ({
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
        const details = main.querySelector('details')

        expect(details).not.toBeNull()
        expect(
          getByText(details, "Can't find the producer or compliance scheme?")
        ).toBeDefined()

        const detailsContent = within(details)

        expect(
          detailsContent.getByText(/PRNs can only be issued to/i)
        ).toBeDefined()

        const bulletList = details.querySelector('.govuk-list--bullet')
        expect(bulletList).not.toBeNull()
        expect(bulletList.querySelectorAll('li')).toHaveLength(2)
      })

      it('should render notes with character count component', async ({
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

        expect(getByText(main, /Add issuer notes \(optional\)/i)).toBeDefined()

        expect(
          getByText(main, /These notes will appear on the PRN/i)
        ).toBeDefined()

        const notesTextarea = getByRole(main, 'textbox', {
          name: /Add issuer notes/i
        })

        expect(notesTextarea).toBeDefined()
        expect(
          getByText(main, /You can enter up to 200 characters/i)
        ).toBeDefined()
      })

      it('should fetch registration data with correct parameters', async ({
        server
      }) => {
        await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
          'org-123',
          'reg-001',
          'mock-id-token'
        )
      })
    })

    describe('error handling', () => {
      it('should return 404 for PRN when feature flag is disabled', async ({
        server
      }) => {
        // Server created with flag ON (routes registered)
        // Disable flag to test controller-level check
        config.set('featureFlags.prns', false)

        try {
          const { statusCode } = await server.inject({
            method: 'GET',
            url: reprocessorUrl,
            auth: mockAuth
          })

          expect(statusCode).toBe(statusCodes.notFound)
        } finally {
          config.set('featureFlags.prns', true)
        }
      })

      it('should return 404 when registration not found', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
          organisationData: fixtureReprocessor.organisationData,
          registration: undefined,
          accreditation: undefined
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/org-123/registrations/reg-nonexistent/accreditations/acc-001/packaging-recycling-notes/create',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 when registration has no accreditation', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
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

    describe('dynamic PRN/PERN text', () => {
      describe('for reprocessor (PRN)', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            fixtureReprocessor
          )
        })

        it('should display PRN in title and heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: reprocessorUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body, title } = dom.window.document
          const main = getByRole(body, 'main')

          expect(title).toContain('Create a PRN')
          expect(
            getByRole(main, 'heading', { level: 1 }).textContent
          ).toContain('Create a PRN')
        })

        it('should display PRN in form labels and help text', async ({
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
          const details = main.querySelector('details')

          expect(getByText(main, /Enter PRN tonnage/i)).toBeDefined()
          expect(
            getByText(main, /Enter who this PRN will be issued to/i)
          ).toBeDefined()
          expect(
            getByText(main, /These notes will appear on the PRN/i)
          ).toBeDefined()
          expect(
            within(details).getByText(/PRNs can only be issued to/i)
          ).toBeDefined()
        })
      })

      describe('for exporter (PERN)', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            fixtureExporter
          )
        })

        it('should display PERN in title and heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: exporterUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body, title } = dom.window.document
          const main = getByRole(body, 'main')

          expect(title).toContain('Create a PERN')
          expect(
            getByRole(main, 'heading', { level: 1 }).textContent
          ).toContain('Create a PERN')
        })

        it('should display PERN in form labels and help text', async ({
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
          const details = main.querySelector('details')

          expect(getByText(main, /Enter PERN tonnage/i)).toBeDefined()
          expect(
            getByText(main, /Enter who this PERN will be issued to/i)
          ).toBeDefined()
          expect(
            getByText(main, /These notes will appear on the PERN/i)
          ).toBeDefined()
          expect(
            within(details).getByText(/PERNs can only be issued to/i)
          ).toBeDefined()
        })
      })
    })

    describe('waste balance display', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(getWasteBalance).mockResolvedValue({
          amount: 1000,
          availableAmount: 500
        })
      })

      it('should display available waste balance in inset text', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const insetText = main.querySelector('.govuk-inset-text')
        expect(insetText).not.toBeNull()
        expect(insetText.textContent).toContain('500.00')
        expect(insetText.textContent).toContain('PRNs')
      })

      it('should display waste balance with PERN text for exporters', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(getWasteBalance).mockResolvedValue({
          amount: 2000,
          availableAmount: 800
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const insetText = main.querySelector('.govuk-inset-text')
        expect(insetText).not.toBeNull()
        expect(insetText.textContent).toContain('800.00')
        expect(insetText.textContent).toContain('PERNs')
      })

      it('should not display waste balance when fetch fails', async ({
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

        const insetText = main.querySelector('.govuk-inset-text')
        expect(insetText).toBeNull()
      })
    })

    describe('insufficient balance error', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
      })

      it('should display error summary when error=insufficient_balance query param is present', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: `${reprocessorUrl}?error=insufficient_balance`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Error summary should be displayed
        const errorSummary = main.querySelector('.govuk-error-summary')
        expect(errorSummary).not.toBeNull()

        // Error summary should have correct title
        expect(getByText(errorSummary, /There is a problem/i)).toBeDefined()

        // Error summary should explain the issue
        expect(
          getByText(
            errorSummary,
            /The tonnage you entered exceeds your available waste balance/i
          )
        ).toBeDefined()
      })

      it('should not display error summary when no error query param', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Error summary should NOT be displayed
        const errorSummary = main.querySelector('.govuk-error-summary')
        expect(errorSummary).toBeNull()
      })
    })
  })
})
