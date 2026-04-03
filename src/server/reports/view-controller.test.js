import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  vi
} from 'vitest'
import { JSDOM } from 'jsdom'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const mockAuth = {
  strategy: 'session',
  credentials: {
    profile: { id: 'user-123', email: 'test@example.com' },
    idToken: 'mock-id-token'
  }
}

async function loadPage({ server, organisationId, registrationId }) {
  return await server.inject({
    method: 'GET',
    url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/view`,
    auth: mockAuth
  })
}

describe('#viewController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when feature flag is disabled', () => {
    beforeEach(() => {
      config.set('featureFlags.reports', false)
    })

    afterEach(() => {
      config.reset('featureFlags.reports')
    })

    it('should return 404', async ({ server }) => {
      const { statusCode } = await loadPage({
        server,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('when feature flag is enabled', () => {
    const mockRegistrationAndAccreditation = {
      organisationData: { id: 'org-123' },
      registration: {
        id: 'reg-001',
        material: 'plastic',
        wasteProcessingType: 'exporter',
        registrationNumber: 'REG001234',
        site: {
          address: {
            line1: 'North Road',
            town: 'Manchester',
            postcode: 'M1 1AA'
          }
        }
      },
      accreditation: undefined
    }

    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('for a non-submitted report', () => {
      const reportDetail = {
        status: {
          currentStatus: 'ready_to_submit'
        }
      }

      beforeAll(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          mockRegistrationAndAccreditation
        )

        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 404', async ({ server }) => {
        const { statusCode } = await loadPage({
          server,
          organisationId: mockRegistrationAndAccreditation.organisationData.id,
          registrationId: mockRegistrationAndAccreditation.registration.id
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })

    describe('for a submitted report', () => {
      const reportDetail = {
        status: {
          currentStatus: 'submitted'
        }
      }

      beforeAll(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          mockRegistrationAndAccreditation
        )

        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200', async ({ server }) => {
        const response = await loadPage({
          server,
          organisationId: mockRegistrationAndAccreditation.organisationData.id,
          registrationId: mockRegistrationAndAccreditation.registration.id
        })

        expect(response.statusCode).toBe(statusCodes.ok)
      })

      it('renders page title and heading based on the reporting period', async ({
        server
      }) => {
        const { result } = await loadPage({
          server,
          organisationId: mockRegistrationAndAccreditation.organisationData.id,
          registrationId: mockRegistrationAndAccreditation.registration.id
        })

        const dom = new JSDOM(result)

        expect(dom.window.document.title).toBe(
          'View submitted report | Record reprocessed or exported packaging waste'
        )

        const heading = dom.window.document.body.querySelector('h1')
        expect(heading?.textContent?.trim()).toBe('Report for January 2026')
      })

      it('renders a back link to the report landing page', async ({
        server
      }) => {
        const { result } = await loadPage({
          server,
          organisationId: mockRegistrationAndAccreditation.organisationData.id,
          registrationId: mockRegistrationAndAccreditation.registration.id
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          `/organisations/${mockRegistrationAndAccreditation.organisationData.id}/registrations/${mockRegistrationAndAccreditation.registration.id}/reports`
        )
      })

      it('renders period, material and site information', async ({
        server
      }) => {
        const { result } = await loadPage({
          server,
          organisationId: mockRegistrationAndAccreditation.organisationData.id,
          registrationId: mockRegistrationAndAccreditation.registration.id
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const reportPeriodSection = body.querySelector('#report-period')

        expect(reportPeriodSection).not.toBeNull()

        expect(reportPeriodSection.textContent).toContain('Period')
        expect(reportPeriodSection.textContent).toContain('January 2026')

        expect(reportPeriodSection.textContent).toContain('Material')
        expect(reportPeriodSection.textContent).toContain('Plastic')

        // TODO this is reprocessor only
        expect(reportPeriodSection.textContent).toContain('Site')
        expect(reportPeriodSection.textContent).toContain('North Road')
      })
    })
  })
})
