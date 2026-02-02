import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getRequiredPrn } from '#server/common/helpers/prns/get-required-prn.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
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
    material: 'plastic',
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: {
    id: 'acc-001',
    status: 'approved',
    material: 'plastic',
    accreditationNumber: '090925',
    siteAddress: 'South Road, Liverpool, L22 3DH'
  }
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
  accreditation: {
    id: 'acc-002',
    status: 'approved',
    material: 'glass',
    glassRecyclingProcess: ['glass_re_melt'],
    accreditationNumber: '123456',
    siteAddress: 'North Street, Manchester, M1 1AA'
  }
}

const stubPrnData = {
  prnNumber: 'ER992415095748M',
  issuedToOrganisation: { name: 'Nestle (SEPA)' }
}

const reprocessorUrl =
  '/organisations/org-123/registrations/reg-001/issue-prn/ER992415095748M/confirmation'
const exporterUrl =
  '/organisations/org-456/registrations/reg-002/issue-prn/ER992415095748M/confirmation'

describe('#confirmationController', () => {
  beforeAll(() => {
    config.set('featureFlags.prns', true)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredPrn).mockResolvedValue(stubPrnData)
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

    it('should render page with 200 status', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render confirmation panel', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const panel = body.querySelector('.govuk-panel--confirmation')

      expect(panel).not.toBeNull()
    })

    it('should render panel title with recipient name', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const panelTitle = body.querySelector('.govuk-panel__title')

      expect(panelTitle).not.toBeNull()
      expect(panelTitle.textContent).toContain('PRN issued to')
    })

    it('should render PRN number', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const panelBody = body.querySelector('.govuk-panel__body')

      expect(panelBody).not.toBeNull()
      expect(panelBody.textContent).toContain('PRN number:')
      expect(panelBody.textContent).toContain('ER992415095748M')
    })

    it('should render view PRN button', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(getByText(main, /View PRN \(opens in a new tab\)/i)).toBeDefined()
    })

    it('should render create PRN link', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const link = getByText(main, 'Create a PRN')

      expect(link.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })

    it('should render manage PRNs link', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const link = getByText(main, 'Manage PRNs')

      expect(link.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/prns'
      )
    })

    it('should render return to home link', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')
      const link = getByText(main, 'Return to home')

      expect(link.getAttribute('href')).toBe('/organisations/org-123')
    })
  })

  describe('dynamic PRN/PERN text', () => {
    describe('for reprocessor (PRN)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureReprocessor
        )
      })

      it('should display PRN in panel title', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panelTitle = body.querySelector('.govuk-panel__title')

        expect(panelTitle.textContent).toContain('PRN issued to')
      })
    })

    describe('for exporter (PERN)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
      })

      it('should display PERN in panel title', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panelTitle = body.querySelector('.govuk-panel__title')

        expect(panelTitle.textContent).toContain('PERN issued to')
      })

      it('should display PERN number label', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panelBody = body.querySelector('.govuk-panel__body')

        expect(panelBody.textContent).toContain('PERN number:')
      })
    })
  })

  describe('error handling', () => {
    it('should return 404 when registration not found', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        organisationData: fixtureReprocessor.organisationData,
        registration: undefined,
        accreditation: undefined
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/org-123/registrations/reg-nonexistent/issue-prn/ER992415095748M/confirmation',
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

    it('should return 404 when PRN not found', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
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
})
