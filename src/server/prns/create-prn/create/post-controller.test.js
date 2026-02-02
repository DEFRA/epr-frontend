/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)

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

const reprocessorUrl = '/organisations/org-123/registrations/reg-001/create-prn'
const exporterUrl = '/organisations/org-456/registrations/reg-002/create-prn'

describe('#postCreatePrnController', () => {
  beforeAll(() => {
    config.set('featureFlags.prns', true)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
  })

  afterAll(() => {
    config.reset('featureFlags.prns')
  })

  describe('successful submission', () => {
    it('should redirect to check-details page with placeholder PRN number', async ({
      server
    }) => {
      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '100',
          recipient: 'producer-1',
          notes: 'Test notes'
        }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn/PRN-PLACEHOLDER-001/check-details'
      )
    })

    it('should redirect when notes field is empty', async ({ server }) => {
      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '50',
          recipient: 'producer-2',
          notes: ''
        }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toContain('/check-details')
    })
  })

  describe('validation errors', () => {
    describe('tonnage validation', () => {
      it('should show error when tonnage is empty', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '',
            recipient: 'producer-1',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()
      })

      it('should show error when tonnage is not a number', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: 'abc',
            recipient: 'producer-1',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(
            errorSummary,
            'Enter PRN tonnage as a whole number greater than zero'
          )
        ).toBeDefined()
      })

      it('should show error when tonnage is a decimal', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '1.5',
            recipient: 'producer-1',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()
      })

      it('should show error when tonnage is zero', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '0',
            recipient: 'producer-1',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(
            errorSummary,
            'Enter PRN tonnage as a whole number greater than zero'
          )
        ).toBeDefined()
      })

      it('should show error when tonnage is negative', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '-5',
            recipient: 'producer-1',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(
            errorSummary,
            'Enter PRN tonnage as a whole number greater than zero'
          )
        ).toBeDefined()
      })
    })

    describe('notes validation', () => {
      it('should show error when notes exceed 200 characters', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const longNotes = 'a'.repeat(201)

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '100',
            recipient: 'producer-1',
            notes: longNotes
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(errorSummary, 'Enter a maximum of 200 characters')
        ).toBeDefined()
      })
    })

    describe('recipient validation', () => {
      it('should show error when recipient is empty', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '100',
            recipient: '',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')

        expect(
          getByText(errorSummary, 'Select who this will be issued to')
        ).toBeDefined()
      })
    })

    describe('multiple validation errors', () => {
      it('should show errors for both tonnage and recipient when both are empty', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '',
            recipient: '',
            notes: ''
          }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')
        const errorLinks = getAllByRole(errorSummary, 'link')

        expect(errorLinks).toHaveLength(2)
        expect(
          getByText(errorSummary, 'Enter PRN tonnage as a whole number')
        ).toBeDefined()
        expect(
          getByText(errorSummary, 'Select who this will be issued to')
        ).toBeDefined()
      })
    })

    describe('preserving form values', () => {
      it('should preserve tonnage value on validation error', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '999',
            recipient: '',
            notes: ''
          }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tonnageInput = main.querySelector('input#tonnage')

        expect(tonnageInput?.getAttribute('value')).toBe('999')
      })

      it('should preserve recipient selection on validation error', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '',
            recipient: 'producer-1',
            notes: ''
          }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const recipientSelect = main.querySelector('select#recipient')
        const selectedOption =
          recipientSelect?.querySelector('option[selected]')

        expect(selectedOption?.getAttribute('value')).toBe('producer-1')
      })

      it('should preserve notes value on validation error', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '',
            recipient: '',
            notes: 'My test notes'
          }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const notesTextarea = main.querySelector('textarea#notes')

        expect(notesTextarea?.textContent).toBe('My test notes')
      })
    })

    describe('error message linking', () => {
      it('should link tonnage error to tonnage input', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '',
            recipient: 'producer-1',
            notes: ''
          }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')
        const errorLink = getByRole(errorSummary, 'link', {
          name: /Enter PRN tonnage as a whole number/i
        })

        expect(errorLink.getAttribute('href')).toBe('#tonnage')
      })

      it('should link recipient error to recipient select', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: reprocessorUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: {
            crumb,
            tonnage: '100',
            recipient: '',
            notes: ''
          }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const errorSummary = getByRole(body, 'alert')
        const errorLink = getByRole(errorSummary, 'link', {
          name: /Select who this will be issued to/i
        })

        expect(errorLink.getAttribute('href')).toBe('#recipient')
      })
    })
  })

  describe('payload handling', () => {
    it('should handle payload with missing optional fields', async ({
      server
    }) => {
      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const errorSummary = getByRole(body, 'alert')

      expect(
        getByText(errorSummary, 'Enter PRN tonnage as a whole number')
      ).toBeDefined()
      expect(
        getByText(errorSummary, 'Select who this will be issued to')
      ).toBeDefined()
    })
  })

  describe('authentication', () => {
    it('should redirect to login when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        payload: {
          tonnage: '100',
          recipient: 'producer-1',
          notes: ''
        }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })

  describe('dynamic PRN/PERN text', () => {
    it('should display PRN text for reprocessor on validation error', async ({
      server
    }) => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )

      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '',
          recipient: '',
          notes: ''
        }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByRole(main, 'heading', { level: 1 }).textContent).toContain(
        'Create a PRN'
      )
    })

    it('should display PERN text for exporter on validation error', async ({
      server
    }) => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureExporter
      )

      const { cookie, crumb } = await getCsrfToken(server, exporterUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'POST',
        url: exporterUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '',
          recipient: '',
          notes: ''
        }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByRole(main, 'heading', { level: 1 }).textContent).toContain(
        'Create a PERN'
      )
    })

    it('should display PRN tonnage error message for reprocessor', async ({
      server
    }) => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )

      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '',
          recipient: 'producer-1',
          notes: ''
        }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const errorSummary = getByRole(body, 'alert')

      expect(
        getByText(errorSummary, 'Enter PRN tonnage as a whole number')
      ).toBeDefined()
    })

    it('should display PERN tonnage error message for exporter', async ({
      server
    }) => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureExporter
      )

      const { cookie, crumb } = await getCsrfToken(server, exporterUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'POST',
        url: exporterUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '',
          recipient: 'producer-1',
          notes: ''
        }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const errorSummary = getByRole(body, 'alert')

      expect(
        getByText(errorSummary, 'Enter PERN tonnage as a whole number')
      ).toBeDefined()
    })
  })

  describe('form elements', () => {
    it('should render Continue button', async ({ server }) => {
      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '',
          recipient: '',
          notes: ''
        }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const button = getByRole(main, 'button', { name: /Continue/i })

      expect(button).toBeDefined()
    })

    it('should display error summary with correct title', async ({
      server
    }) => {
      const { cookie, crumb } = await getCsrfToken(server, reprocessorUrl, {
        auth: mockAuth
      })

      const { result } = await server.inject({
        method: 'POST',
        url: reprocessorUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb,
          tonnage: '',
          recipient: '',
          notes: ''
        }
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const errorSummary = getByRole(body, 'alert')

      expect(getByText(errorSummary, 'There is a problem')).toBeDefined()
    })
  })
})
