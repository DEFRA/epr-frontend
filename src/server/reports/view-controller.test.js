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

async function loadPage({ server, registrationAndAccreditation }) {
  vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
    registrationAndAccreditation
  )
  const organisationId = registrationAndAccreditation.organisationData?.id
  const registrationId = registrationAndAccreditation.registration?.id
  return await server.inject({
    method: 'GET',
    url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/view`,
    auth: mockAuth
  })
}

async function loadPageBody({ server, registrationAndAccreditation }) {
  const { result } = await loadPage({
    server,
    registrationAndAccreditation
  })

  const dom = new JSDOM(result)
  return dom.window.document.body
}

describe('#viewController', () => {
  const mockAccreditedReprocessor = {
    organisationData: { id: 'org-123' },
    registration: {
      id: 'reg-001',
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
      registrationNumber: 'REG001234',
      site: {
        address: {
          line1: 'North Road',
          town: 'Manchester',
          postcode: 'M1 1AA'
        }
      }
    },
    accreditation: { id: 'acc-001' }
  }

  const mockAccreditedExporter = {
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
    accreditation: { id: 'acc-001' }
  }

  const mockRegisteredOnlyReprocessor = {
    organisationData: { id: 'org-123' },
    registration: {
      id: 'reg-001',
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
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

  const mockRegisteredOnlyExporter = {
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
        registrationAndAccreditation: mockAccreditedReprocessor
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('when feature flag is enabled', () => {
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
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 404', async ({ server }) => {
        const { statusCode } = await loadPage({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
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
          tonnageRecycled: 10.25,
          tonnageNotRecycled: 2.25,
          suppliers: [
            {
              supplierName: 'Acme Recycling Ltd',
              facilityType: 'Reprocessor',
              supplierAddress: '1 Green Lane, Leeds, LS1 1AA',
              supplierPhone: '0113 000 0000',
              supplierEmail: 'contact@acme.example.com'
            }
          ]
        },
        wasteSent: {
          tonnageSentToReprocessor: 5.0,
          tonnageSentToExporter: 3.0,
          tonnageSentToAnotherSite: 2.0,
          finalDestinations: [
            {
              recipientName: 'Green Reprocessors Ltd',
              facilityType: 'Reprocessor',
              address: '5 Factory Road, Sheffield, S1 1AB',
              tonnageSentOn: 1.0
            }
          ]
        },
        prn: {
          issuedTonnage: 100,
          freeTonnage: 20,
          totalRevenue: 5000,
          averagePricePerTonne: 50
        }
      }

      beforeAll(() => {
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200', async ({ server }) => {
        const response = await loadPage({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        expect(response.statusCode).toBe(statusCodes.ok)
      })

      it('renders page title and heading based on the reporting period', async ({
        server
      }) => {
        const { result } = await loadPage({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
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
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          `/organisations/${mockAccreditedReprocessor.organisationData.id}/registrations/${mockAccreditedReprocessor.registration.id}/reports`
        )
      })

      describe('report-period section', () => {
        it('renders period information', async ({ server }) => {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })
          const reportPeriodSection = body.querySelector('#report-period')

          expect(reportPeriodSection).not.toBeNull()

          expect(reportPeriodSection.textContent).toContain('Period')
          expect(reportPeriodSection.textContent).toContain('January 2026')
        })

        it('renders material information', async ({ server }) => {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })
          const reportPeriodSection = body.querySelector('#report-period')

          expect(reportPeriodSection.textContent).toContain('Material')
          expect(reportPeriodSection.textContent).toContain('Plastic')
        })

        // TODO this is reprocessor only
        it('renders site information', async ({ server }) => {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
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
            registrationAndAccreditation: mockAccreditedReprocessor
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

        it('renders the suppliers table column headers', async ({ server }) => {
          const section = await loadSection({ server })
          const tableHeader = section.querySelector('table thead')

          expect(tableHeader.textContent).toContain('Supplier')
          expect(tableHeader.textContent).toContain('Activity')
          expect(tableHeader.textContent).toContain('Address')
          expect(tableHeader.textContent).toContain('Phone')
          expect(tableHeader.textContent).toContain('Email')
        })

        it('renders suppliers table row data', async ({ server }) => {
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

      describe('packaging-waste-recycling section', () => {
        async function loadSection({ server }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          return body.querySelector('#packaging-waste-recycling')
        }

        it('renders the section heading', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section).not.toBeNull()
          expect(section.querySelector('h2')?.textContent?.trim()).toBe(
            'Packaging waste recycling'
          )
        })

        it('renders the total tonnage recycled', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.textContent).toContain('Total tonnage recycled')
          expect(section.textContent).toContain('10.25')
        })

        it('renders the tonnage not recycled', async ({ server }) => {
          const section = await loadSection({ server })

          const summaryList = section.querySelector('dl.govuk-summary-list')

          expect(summaryList.textContent).toContain(
            'Total tonnage received but not recycled'
          )
          expect(summaryList.textContent).toContain('2.25')
        })
      })

      describe('packaging-waste-sent-on section', () => {
        async function loadSection({ server }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          return body.querySelector('#packaging-waste-sent-on')
        }

        it('renders the section heading', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section).not.toBeNull()
          expect(section.querySelector('h2')?.textContent?.trim()).toBe(
            'Packaging waste sent on'
          )
        })

        it('renders the total tonnage sent on', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.textContent).toContain('Total tonnage sent on')
          expect(section.textContent).toContain('10.00')
        })

        describe('breakdown of tonnage sent on', () => {
          it('renders tonnage sent on to reprocessors', async ({ server }) => {
            const section = await loadSection({ server })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage sent on to reprocessors'
            )
            expect(summaryList.textContent).toContain('5.00')
          })

          it('renders tonnage sent on to exporters', async ({ server }) => {
            const section = await loadSection({ server })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage sent on to exporters'
            )
            expect(summaryList.textContent).toContain('3.00')
          })

          it('renders tonnage sent on to other sites', async ({ server }) => {
            const section = await loadSection({ server })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage sent on to other sites or facilities'
            )
            expect(summaryList.textContent).toContain('2.00')
          })
        })

        describe('final destinations table', () => {
          it('renders sub-heading', async ({ server }) => {
            const section = await loadSection({ server })
            const tableCaption = section.querySelector('table caption')

            expect(tableCaption.textContent).toContain('Final destinations')
          })

          it('renders headers in table', async ({ server }) => {
            const section = await loadSection({ server })
            const tableHeader = section.querySelector('table thead')

            expect(tableHeader.textContent).toContain('Recipient')
            expect(tableHeader.textContent).toContain('Facility type')
            expect(tableHeader.textContent).toContain('Address')
            expect(tableHeader.textContent).toContain('Tonnage sent on')
          })

          it('renders row data in table', async ({ server }) => {
            const section = await loadSection({ server })
            const tableBody = section.querySelector('table tbody')

            expect(tableBody.textContent).toContain('Green Reprocessors Ltd')
            expect(tableBody.textContent).toContain('Reprocessor')
            expect(tableBody.textContent).toContain(
              '5 Factory Road, Sheffield, S1 1AB'
            )
            expect(tableBody.textContent).toContain('1.00')
          })
        })
      })

      describe('prns section', () => {
        async function loadSection({
          server,
          registrationAndAccreditation = mockAccreditedReprocessor
        }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#prns')
        }

        describe('for an accredited reprocessor', () => {
          it('renders the section heading', async ({ server }) => {
            const section = await loadSection({ server })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'PRNs'
            )
          })

          it('renders the total tonnage of PRNs issued', async ({ server }) => {
            const section = await loadSection({ server })

            expect(section.textContent).toContain(
              'Total tonnage of PRNs issued'
            )
            expect(section.textContent).toContain('100')
          })

          it('renders total PRNs issued for free', async ({ server }) => {
            const section = await loadSection({ server })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage of PRNs issued for free'
            )
            expect(summaryList.textContent).toContain('20')
          })

          it('renders total revenue of PRNs', async ({ server }) => {
            const section = await loadSection({ server })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain('Total revenue of PRNs')
            expect(summaryList.textContent).toContain('£5,000.00')
          })

          it('renders the average price per tonne of PRNs', async ({
            server
          }) => {
            const section = await loadSection({ server })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Average price per tonne of PRNs'
            )
            expect(summaryList.textContent).toContain('£50.00')
          })
        })

        describe('for an accredited exporter', () => {
          it('renders the section heading', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedExporter
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'PERNs'
            )
          })

          it('renders the total tonnage of PERNs issued', async ({
            server
          }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedExporter
            })

            expect(section.textContent).toContain(
              'Total tonnage of PERNs issued'
            )
            expect(section.textContent).toContain('100')
          })

          it('renders total PERNs issued for free', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedExporter
            })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage of PERNs issued for free'
            )
            expect(summaryList.textContent).toContain('20')
          })

          it('renders total revenue of PERNs', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedExporter
            })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain('Total revenue of PERNs')
            expect(summaryList.textContent).toContain('£5,000.00')
          })

          it('renders the average price per tonne of PERNs', async ({
            server
          }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedExporter
            })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Average price per tonne of PERNs'
            )
            expect(summaryList.textContent).toContain('£50.00')
          })
        })

        describe('for a registered-only reprocessor', () => {
          it('does not render the prns section', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockRegisteredOnlyReprocessor
            })

            expect(section).toBeNull()
          })
        })

        describe('for a registered-only exporter', () => {
          it('does not render the prns section', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockRegisteredOnlyExporter
            })

            expect(section).toBeNull()
          })
        })
      })
    })
  })
})
