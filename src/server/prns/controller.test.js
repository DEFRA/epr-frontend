import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRequiredAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import {
  buildAccreditationView,
  buildRegistrationView,
  buildRegistrationWithAccreditation
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { fetchDecemberPrnEligibility } from './helpers/fetch-december-prn-eligibility.js'
import { fetchPrnWasteBalance } from './helpers/fetch-prn-waste-balance.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getByLabelText,
  getByRole,
  getByText,
  within
} from '@testing-library/dom'
import Boom from '@hapi/boom'
import { JSDOM } from 'jsdom'
import { describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-with-accreditation.js')
)
vi.mock(import('./helpers/fetch-prn-waste-balance.js'))
vi.mock(import('./helpers/fetch-december-prn-eligibility.js'))

vi.spyOn(metrics.journey, 'start').mockResolvedValue()
vi.spyOn(metrics.journey, 'end').mockResolvedValue()

const mockCredentials = buildMockAuth().credentials

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const fixtureReprocessor = buildRegistrationWithAccreditation({
  organisation: { name: 'Reprocessor Organisation' },
  registration: buildRegistrationView({
    wasteProcessingType: 'reprocessor', // PRN
    reprocessingType: 'input',
    material: 'glass_re_melt',
    site: { address: { fullAddress: 'Reprocessing Site' } }
  }),
  accreditation: buildAccreditationView({ accreditationNumber: 'ACC-001' })
})

const fixtureExporter = buildRegistrationWithAccreditation({
  organisation: { organisationNumber: 500456, name: 'Exporter Organisation' },
  registration: buildRegistrationView({ material: 'plastic' }), // PERN
  accreditation: buildAccreditationView({ accreditationNumber: 'ACC-002' }),
  registrationNumber: 'E26EN0000000002PL'
})

const reprocessorKeys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL',
  year: '2026'
}
const reprocessorPrnsPath =
  '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes'
const reprocessorUrl = `${reprocessorPrnsPath}/create`
const exporterUrl =
  '/organisations/500456/registrations/E26EN0000000002PL/accreditations/2026/packaging-recycling-notes/create'

describe('#createPrnController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchDecemberPrnEligibility).mockResolvedValue({
      mode: 'none',
      windowOpen: false
    })
  })

  describe('request handling', () => {
    describe('page rendering', () => {
      beforeEach(() => {
        vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
      })

      it('should render back link to the registration page for the year', async ({
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
          '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026'
        )
      })

      it('should render the phase banner inside the header on a page that replaces the layout beforeContent', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const header = getByRole(body, 'banner')
        const [banner] = header.querySelectorAll('.govuk-phase-banner')

        expect(body.querySelectorAll('.govuk-phase-banner')).toHaveLength(1)
        expect(within(banner).getByText('Beta')).toHaveClass('govuk-tag')
        expect(
          within(banner).getByRole('link', {
            name: /give your feedback by email/i
          })
        ).toBeInTheDocument()
      })

      it('should render page with correct title, caption and heading', async ({
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

        expect(title).toMatch(/Enter PRN details/i)

        const main = getByRole(body, 'main')
        const heading = getByRole(main, 'heading', { level: 1 })

        expect(heading.textContent).toContain('Enter PRN details')
        expect(main.querySelector('.govuk-caption-xl').textContent.trim()).toBe(
          'Create PRN'
        )
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
          getByText(main, /Who will this PRN be issued to\?/i)
        ).toBeDefined()

        expect(
          getByText(
            main,
            /Start typing the name of the packaging producer or compliance scheme/i
          )
        ).toBeDefined()

        const recipientSelect = getByRole(main, 'combobox', {
          name: /Who will this PRN be issued to\?/i
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

      it('should render submit button with double-click prevention', async ({
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

        const submitButton = getByRole(main, 'button', { name: /Continue/i })
        expect(submitButton).toBeDefined()
        expect(submitButton.getAttribute('data-prevent-double-click')).toBe(
          'true'
        )
      })

      it('should fetch registration data by the accreditation keys', async ({
        server
      }) => {
        await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        expect(fetchRequiredAccreditation).toHaveBeenCalledWith(
          reprocessorKeys,
          'mock-backend-token'
        )
      })

      it("should fetch the accreditation's waste balance and December eligibility", async ({
        server
      }) => {
        await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        expect(fetchPrnWasteBalance).toHaveBeenCalledWith(
          expect.objectContaining({
            keys: reprocessorKeys,
            accreditationNumber: 'ACC-001',
            backendToken: 'mock-backend-token'
          })
        )
        expect(fetchDecemberPrnEligibility).toHaveBeenCalledWith(
          reprocessorKeys,
          'mock-backend-token'
        )
      })
    })

    describe('error handling', () => {
      it('should return 404 when registration not found', async ({
        server
      }) => {
        vi.mocked(fetchRequiredAccreditation).mockRejectedValue(
          Boom.notFound('Registration not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/500123/registrations/R26EN0000009999PL/accreditations/2026/packaging-recycling-notes/create',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 when registration has no accreditation', async ({
        server
      }) => {
        vi.mocked(fetchRequiredAccreditation).mockRejectedValue(
          Boom.notFound('Not accredited for this year')
        )

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
          vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
            fixtureReprocessor
          )
        })

        it('should display PRN in title, caption and heading', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: reprocessorUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body, title } = dom.window.document
          const main = getByRole(body, 'main')

          expect(title).toContain('Enter PRN details')
          expect(main.querySelector('.govuk-caption-xl').textContent).toContain(
            'Create PRN'
          )
          expect(
            getByRole(main, 'heading', { level: 1 }).textContent
          ).toContain('Enter PRN details')
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
            getByText(main, /Who will this PRN be issued to\?/i)
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
          vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
            fixtureExporter
          )
        })

        it('should display PERN in title, caption and heading', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: exporterUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body, title } = dom.window.document
          const main = getByRole(body, 'main')

          expect(title).toContain('Enter PERN details')
          expect(main.querySelector('.govuk-caption-xl').textContent).toContain(
            'Create PERN'
          )
          expect(
            getByRole(main, 'heading', { level: 1 }).textContent
          ).toContain('Enter PERN details')
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
            getByText(main, /Who will this PERN be issued to\?/i)
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
        vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchPrnWasteBalance).mockResolvedValue({
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
        vi.mocked(fetchRequiredAccreditation).mockResolvedValue(fixtureExporter)
        vi.mocked(fetchPrnWasteBalance).mockResolvedValue({
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
        vi.mocked(fetchPrnWasteBalance).mockResolvedValue(null)

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

    describe('select waste balance pool', () => {
      beforeEach(() => {
        vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(fetchDecemberPrnEligibility).mockResolvedValue({
          mode: 'pool',
          windowOpen: true
        })
        vi.mocked(fetchPrnWasteBalance).mockResolvedValue({
          amount: 60,
          availableAmount: 60,
          decemberAmount: 50,
          decemberAvailableAmount: 50,
          nonDecemberAvailableAmount: 10
        })
      })

      it('renders both balance radios with their tonnages, and the either-balance inset text', async ({
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

        const decemberRadio = getByLabelText(
          main,
          /December waste balance \(50\.00 tonnes\)/i
        )
        expect(decemberRadio.getAttribute('type')).toBe('radio')

        const generalRadio = getByLabelText(
          main,
          /Non-December waste balance \(10\.00 tonnes\)/i
        )
        expect(generalRadio.getAttribute('type')).toBe('radio')

        const insetText = main.querySelector('.govuk-inset-text')
        expect(insetText.textContent).toContain(
          'You can create PRNs from either waste balance.'
        )
      })

      it('does not render the manual December Yes/No question', async ({
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

        expect(getByText(main, /Select which waste balance/i)).toBeDefined()
        expect(main.textContent).not.toContain('Is this December waste?')
      })

      it('does not pre-select either waste balance radio', async ({
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

        const decemberRadio = getByLabelText(
          main,
          /December waste balance \(50\.00 tonnes\)/i
        )
        const generalRadio = getByLabelText(
          main,
          /Non-December waste balance \(10\.00 tonnes\)/i
        )

        expect(decemberRadio.checked).toBe(false)
        expect(generalRadio.checked).toBe(false)
      })
    })

    describe('insufficient balance error', () => {
      beforeEach(() => {
        vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
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

  describe('journey events', () => {
    beforeEach(() => {
      vi.mocked(fetchRequiredAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
    })

    it('should record the create journey start when the form renders', async ({
      server
    }) => {
      await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(metrics.journey.start).toHaveBeenCalledWith(
        expect.anything(),
        JOURNEY.createPrn,
        reprocessorPrnsPath
      )
    })
  })
})
