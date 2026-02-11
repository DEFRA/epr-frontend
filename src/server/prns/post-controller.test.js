import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/common/helpers/waste-balance/get-waste-balance.js'))
vi.mock(import('./helpers/create-prn.js'))

const { createPrn } = await import('./helpers/create-prn.js')

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
    site: { address: { line1: 'Export Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const url = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`

const validPayload = {
  tonnage: '100',
  recipient: 'dd793573-b218-47a7-be85-1c777ca0d0d8',
  notes: 'Test notes',
  nation: 'england',
  wasteProcessingType: 'reprocessor-input'
}

describe('#postCreatePrnController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    describe('csrf protection', () => {
      it('should reject POST request without CSRF token', async ({
        server
      }) => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          payload: validPayload
        })

        expect(statusCode).toBe(statusCodes.forbidden)
      })
    })

    describe('with valid payload', () => {
      it('creates PRN draft and redirects to check page', async ({
        server
      }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft',
          wasteProcessingType: 'reprocessor',
          processToBeUsed: 'R3',
          isDecemberWaste: false
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/prn-789/view`
        )
      })

      it('calls createPrn with correct parameters', async ({ server }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft',
          wasteProcessingType: 'reprocessor',
          processToBeUsed: 'R3',
          isDecemberWaste: false
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(createPrn).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          {
            issuedToOrganisation: {
              id: validPayload.recipient,
              name: 'Bigco Packaging Ltd',
              tradingName: undefined
            },
            tonnage: 100,
            notes: 'Test notes'
          },
          'mock-id-token'
        )
      })

      it('omits notes when notes is empty', async ({ server }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft',
          wasteProcessingType: 'reprocessor',
          processToBeUsed: 'R3',
          isDecemberWaste: false
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, notes: '', crumb }
        })

        expect(createPrn).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          expect.objectContaining({
            notes: undefined
          }),
          'mock-id-token'
        )
      })

      it('should re-render form with inline error when recipient not in organisations list', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const unknownRecipient = 'unknown-recipient-id'

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, recipient: unknownRecipient, crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(createPrn).not.toHaveBeenCalled()

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Error summary should be displayed
        const errorSummary = main.querySelector('.govuk-error-summary')
        expect(
          getByText(
            errorSummary,
            'Select a valid packaging waste producer or compliance scheme'
          )
        ).toBeDefined()

        // Inline error against recipient field
        const inlineError = body.querySelector('#recipient-error')
        expect(inlineError.textContent).toContain(
          'Select a valid packaging waste producer or compliance scheme'
        )
      })
    })

    describe('with invalid payload', () => {
      it('shows "Enter PRN tonnage as a whole number" when tonnage is empty', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()
      })

      it('shows "Enter PRN tonnage as a whole number" when tonnage is not a number', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: 'abc', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()
      })

      it('shows "Enter PRN tonnage as a whole number" when tonnage is a decimal', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '1.5', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()
      })

      it('shows "Enter PRN tonnage as a whole number greater than zero" when tonnage is zero', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '0', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(
            errorSummary,
            'Enter PRN tonnage as a whole number greater than zero'
          )
        ).toBeDefined()
      })

      it('shows "Enter a packaging waste producer or compliance scheme" when recipient is missing', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, recipient: '', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(
            errorSummary,
            'Enter a packaging waste producer or compliance scheme'
          )
        ).toBeDefined()
      })

      it('shows "Enter a maximum of 200 characters" when notes are too long', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, notes: 'x'.repeat(201), crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(errorSummary, 'Enter a maximum of 200 characters')
        ).toBeDefined()
      })

      it('shows PERN-specific tonnage error for exporter registrations', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            ...validPayload,
            tonnage: '',
            wasteProcessingType: 'exporter',
            crumb
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const errorSummary = body.querySelector('.govuk-error-summary')

        expect(
          getByText(errorSummary, 'Enter PERN tonnage as a whole number')
        ).toBeDefined()
      })

      it('shows tonnage error inline next to the field', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const inlineError = body.querySelector('#tonnage-error')

        expect(inlineError.textContent).toContain(
          'Enter PRN tonnage as a whole number'
        )
      })

      it('preserves form values on validation error', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const notesField = getByRole(main, 'textbox', { name: /notes/i })

        expect(notesField.value).toBe('Test notes')
      })

      it('should preserve recipient selection on validation error', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const selectedOption = body.querySelector('#recipient option[selected]')

        expect(selectedOption.value).toBe(validPayload.recipient)
      })
    })

    describe('waste balance on error', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
        vi.mocked(getWasteBalance).mockResolvedValue({
          amount: 1000,
          availableAmount: 500
        })
      })

      it('should display waste balance hint when form fails schema validation', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Validation error should be displayed
        const errorSummary = main.querySelector('.govuk-error-summary')
        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()

        // Waste balance hint should still be visible
        const insetText = main.querySelector('.govuk-inset-text')
        expect(insetText).not.toBeNull()
        expect(insetText.textContent).toContain('500.00')
        expect(insetText.textContent).toContain('PRNs')

        // Back link should have correct URL
        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}`
        )
      })

      it('should display waste balance hint when recipient not found in organisations list', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, recipient: 'unknown-id', crumb }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Recipient error should be displayed
        const errorSummary = main.querySelector('.govuk-error-summary')
        expect(
          getByText(
            errorSummary,
            'Select a valid packaging waste producer or compliance scheme'
          )
        ).toBeDefined()

        // Waste balance hint should still be visible
        const insetText = main.querySelector('.govuk-inset-text')
        expect(insetText).not.toBeNull()
        expect(insetText.textContent).toContain('500.00')
        expect(insetText.textContent).toContain('PRNs')

        // Back link should have correct URL
        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}`
        )
      })
    })

    describe('when API call fails', () => {
      it('throws error when createPrn fails', async ({ server }) => {
        vi.mocked(createPrn).mockRejectedValue(new Error('API error'))

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })

      it('rethrows Boom errors from createPrn', async ({ server }) => {
        vi.mocked(createPrn).mockRejectedValue(Boom.badRequest('Invalid'))

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.badRequest)
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

    it('returns 404 for valid payload (handler check)', async ({ server }) => {
      // Get CSRF token while feature is enabled
      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      // Disable feature flag before POST
      config.set('featureFlags.prns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })

    it('returns 404 for invalid payload (failAction check)', async ({
      server
    }) => {
      // Get CSRF token while feature is enabled
      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      // Disable feature flag before POST with invalid payload
      config.set('featureFlags.prns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
