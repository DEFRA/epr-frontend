import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getRequiredPrn } from '#server/common/helpers/prns/get-required-prn.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)

vi.mock(import('#server/common/helpers/prns/get-required-prn.js'))

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

const fixtureReprocessorOutput = {
  organisationData: { id: 'org-789', name: 'Reprocessor Output Organisation' },
  registration: {
    id: 'reg-003',
    wasteProcessingType: 'reprocessor-output',
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
    wasteProcessingType: 'exporter',
    material: 'plastic',
    site: null,
    accreditationId: 'acc-002'
  },
  accreditation: { id: 'acc-002', status: 'approved' }
}

const reprocessorUrl =
  '/organisations/org-123/registrations/reg-001/prns/ER2625468U'
const reprocessorOutputUrl =
  '/organisations/org-789/registrations/reg-003/prns/ER2625468U'
const exporterUrl =
  '/organisations/org-456/registrations/reg-002/prns/EX2625468U'

describe('#prnDetailController', () => {
  beforeAll(() => {
    config.set('featureFlags.prns', true)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredPrn).mockResolvedValue({ prnNumber: 'ER2625468U' })
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
        url: '/organisations/org-123/registrations/reg-nonexistent/prns/ER2625468U',
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

    it('should return 404 when PRN not found', async ({ server }) => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
      vi.mocked(getRequiredPrn).mockRejectedValue(
        Boom.notFound('PRN not found')
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

    it('should render page with PRN heading', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body, title } = dom.window.document

      expect(title).toMatch(/PRN/i)
      expect(title).not.toMatch(/PERN/i)

      const main = getByRole(body, 'main')
      const heading = getByRole(main, 'heading', { level: 1 })

      expect(heading.textContent).toContain('PRN')
      expect(heading.textContent).not.toContain('PERN')
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

    it('should render back link to PRN dashboard', async ({ server }) => {
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
        '/organisations/org-123/registrations/reg-001/prns'
      )
    })

    it('should render Issue PRN button', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, 'Issue PRN')).toBeDefined()
    })

    it('should render Delete PRN warning button', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const deleteButton = getByText(main, 'Delete PRN')

      expect(deleteButton).toBeDefined()
      expect(deleteButton.className).toContain('warning')
    })
  })

  describe('page rendering for reprocessor-output (PRN)', () => {
    beforeEach(() => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureReprocessorOutput
      )
    })

    it('should render page with PRN heading (not PERN)', async ({ server }) => {
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

      expect(heading.textContent).toContain('PRN')
      expect(heading.textContent).not.toContain('PERN')
    })
  })

  describe('page rendering for exporter (PERN)', () => {
    beforeEach(() => {
      vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
        fixtureExporter
      )
    })

    it('should render page with PERN heading', async ({ server }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: exporterUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)

      const dom = new JSDOM(result)
      const { body, title } = dom.window.document

      expect(title).toMatch(/PERN/i)

      const main = getByRole(body, 'main')
      const heading = getByRole(main, 'heading', { level: 1 })

      expect(heading.textContent).toContain('PERN')
      expect(heading.textContent).not.toContain('PRN')
    })

    it('should render Issue PERN and Delete PERN buttons', async ({
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

      expect(getByText(main, 'Issue PERN')).toBeDefined()
      expect(getByText(main, 'Delete PERN')).toBeDefined()
    })
  })
})
