import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getPrn } from '#server/common/helpers/prns/get-prn.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

vi.mock(import('#server/common/helpers/prns/get-prn.js'))

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
  prnNumber: 'ER2625468U',
  issuedToOrganisation: 'Acme Packaging Solutions Ltd',
  issuedByOrganisation: 'John Smith Ltd',
  issuedDate: '',
  issuerNotes: 'Quarterly waste collection from Birmingham facility',
  tonnageValue: 150,
  isDecemberWaste: 'No',
  authorisedBy: '',
  position: ''
}

const reprocessorUrl =
  '/organisations/org-123/registrations/reg-001/create-prn/ER2625468U/check-details'
const exporterUrl =
  '/organisations/org-456/registrations/reg-002/create-prn/EX2625468U/check-details'

describe('#checkDetailsController', () => {
  beforeAll(() => {
    config.set('featureFlags.prns', true)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPrn).mockResolvedValue(stubPrnData)
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

      expect(title).toMatch(/Check before creating PRN/i)

      const main = getByRole(body, 'main')
      const heading = getByRole(main, 'heading', { level: 1 })

      expect(heading.textContent).toContain('Check before creating PRN')
    })

    it('should render lead paragraph', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      expect(
        getByText(
          main,
          /Check the following information is correct before creating this PRN/i
        )
      ).toBeDefined()
    })

    it('should render inset text', async ({ server }) => {
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
        'Any information not shown here will be automatically populated'
      )
    })

    it('should render PRN details section heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: reprocessorUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document
      const main = getByRole(body, 'main')

      const sectionHeading = getByRole(main, 'heading', {
        level: 2,
        name: /PRN details/i
      })

      expect(sectionHeading).toBeDefined()
    })

    it('should render accreditation details section heading', async ({
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

      const sectionHeading = getByRole(main, 'heading', {
        level: 2,
        name: /Accreditation details/i
      })

      expect(sectionHeading).toBeDefined()
    })

    it('should render PRN details summary list with first 5 rows', async ({
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
        getByText(main, /Packaging waste producer or compliance scheme/i)
      ).toBeDefined()
      expect(getByText(main, /^Tonnage$/)).toBeDefined()
      expect(getByText(main, /Tonnage in words/i)).toBeDefined()
      expect(getByText(main, /Process to be used/i)).toBeDefined()
      expect(getByText(main, /December waste/i)).toBeDefined()
    })

    it('should render PRN details summary list with remaining rows', async ({
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

      expect(getByText(main, /^Issuer$/)).toBeDefined()
      expect(getByText(main, /Issued date/i)).toBeDefined()
      expect(getByText(main, /Issued by/i)).toBeDefined()
      expect(getByText(main, /Position/i)).toBeDefined()
      expect(getByText(main, /Issuer notes/i)).toBeDefined()
    })

    it('should render accreditation details summary list labels', async ({
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

      expect(getByText(main, /^Material$/)).toBeDefined()
      expect(getByText(main, /Accreditation number/i)).toBeDefined()
      expect(getByText(main, /Accreditation address/i)).toBeDefined()
    })

    it('should render accreditation details summary list values', async ({
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

      expect(getByText(main, 'Plastic')).toBeDefined()
      expect(getByText(main, '090925')).toBeDefined()
      expect(getByText(main, 'South Road, Liverpool, L22 3DH')).toBeDefined()
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
    it('should return 404 when registration not found', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
        organisationData: fixtureReprocessor.organisationData,
        registration: undefined,
        accreditation: undefined
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/org-123/registrations/reg-nonexistent/create-prn/ER2625468U/check-details',
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

        expect(title).toContain('Check before creating PRN')
        expect(getByRole(main, 'heading', { level: 1 }).textContent).toContain(
          'Check before creating PRN'
        )
      })

      it('should display PRN details heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByRole(main, 'heading', { level: 2, name: /PRN details/i })
        ).toBeDefined()
      })

      it('should display PRN in inset text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const insetText = main.querySelector('.govuk-inset-text')

        expect(insetText.textContent).toContain(
          'automatically populated when the PRN is issued'
        )
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

        expect(title).toContain('Check before creating PERN')
        expect(getByRole(main, 'heading', { level: 1 }).textContent).toContain(
          'Check before creating PERN'
        )
      })

      it('should display PERN details heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByRole(main, 'heading', { level: 2, name: /PERN details/i })
        ).toBeDefined()
      })

      it('should display PERN in inset text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const insetText = main.querySelector('.govuk-inset-text')

        expect(insetText.textContent).toContain(
          'automatically populated when the PERN is issued'
        )
      })

      it('should display PERN in lead paragraph', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(
            main,
            /Check the following information is correct before creating this PERN/i
          )
        ).toBeDefined()
      })
    })
  })

  describe('navigation', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        fixtureReprocessor
      )
    })

    it('should render back link pointing to create PRN page', async ({
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
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })

    it('should render start again link pointing to create PRN page', async ({
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
      const startAgainLink = getByText(main, 'Start again')

      expect(startAgainLink).toBeDefined()
      expect(startAgainLink.getAttribute('href')).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })
  })
})
