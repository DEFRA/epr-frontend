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

async function loadPageBody({ server, mockRegistrationAndAccreditation }) {
  const { result } = await loadPage({
    server,
    organisationId: mockRegistrationAndAccreditation.organisationData.id,
    registrationId: mockRegistrationAndAccreditation.registration.id
  })

  const dom = new JSDOM(result)
  return dom.window.document.body
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
        },
        recyclingActivity: {
          totalTonnageReceived: 12.5,
          suppliers: [
            {
              supplierName: 'Acme Recycling Ltd',
              facilityType: 'Reprocessor',
              supplierAddress: '1 Green Lane, Leeds, LS1 1AA',
              supplierPhone: '0113 000 0000',
              supplierEmail: 'contact@acme.example.com'
            }
          ]
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
        const body = await loadPageBody({
          server,
          mockRegistrationAndAccreditation
        })

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          `/organisations/${mockRegistrationAndAccreditation.organisationData.id}/registrations/${mockRegistrationAndAccreditation.registration.id}/reports`
        )
      })

      describe('report-period section', () => {
        it('renders period information', async ({ server }) => {
          const body = await loadPageBody({
            server,
            mockRegistrationAndAccreditation
          })
          const reportPeriodSection = body.querySelector('#report-period')

          expect(reportPeriodSection).not.toBeNull()

          expect(reportPeriodSection.textContent).toContain('Period')
          expect(reportPeriodSection.textContent).toContain('January 2026')
        })

        it('renders material information', async ({ server }) => {
          const body = await loadPageBody({
            server,
            mockRegistrationAndAccreditation
          })
          const reportPeriodSection = body.querySelector('#report-period')

          expect(reportPeriodSection.textContent).toContain('Material')
          expect(reportPeriodSection.textContent).toContain('Plastic')
        })

        // TODO this is reprocessor only
        it('renders site information', async ({ server }) => {
          const body = await loadPageBody({
            server,
            mockRegistrationAndAccreditation
          })
          const reportPeriodSection = body.querySelector('#report-period')

          expect(reportPeriodSection.textContent).toContain('Site')
          expect(reportPeriodSection.textContent).toContain('North Road')
        })
      })

      describe('waste-received-for-reprocessing section', () => {
        async function loadSection({ server }) {
          const body = await loadPageBody({
            server,
            mockRegistrationAndAccreditation
          })

          return body.querySelector('#waste-received-for-reprocessing')
        }

        it('renders the section heading', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section).not.toBeNull()
          expect(section.querySelector('h2')?.textContent?.trim()).toBe(
            'Packaging waste received for reprocessing'
          )
        })

        it('renders the total tonnage received', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.textContent).toContain('Total tonnage received')
          expect(section.textContent).toContain('12.50')
        })

        it('renders the suppliers table sub-heading', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.querySelector('h3')?.textContent?.trim()).toBe(
            'Suppliers'
          )
        })

        it('renders the table column headers', async ({ server }) => {
          const section = await loadSection({ server })
          const tableHeader = section.querySelector('table thead')

          expect(tableHeader.textContent).toContain('Supplier')
          expect(tableHeader.textContent).toContain('Activity')
          expect(tableHeader.textContent).toContain('Address')
          expect(tableHeader.textContent).toContain('Phone')
          expect(tableHeader.textContent).toContain('Email')
        })

        it('renders supplier row data', async ({ server }) => {
          const section = await loadSection({ server })
          const tableBody = section.querySelector('table tbody')

          expect(tableBody.textContent).toContain('Acme Recycling Ltd')
          expect(tableBody.textContent).toContain('Reprocessor')
          expect(tableBody.textContent).toContain(
            '1 Green Lane, Leeds, LS1 1AA'
          )
          expect(tableBody.textContent).toContain('0113 000 0000')
          expect(tableBody.textContent).toContain('contact@acme.example.com')
        })
      })
    })
  })
})
