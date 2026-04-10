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
import { getAllByRole } from '@testing-library/dom'
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
      registrationNumber: 'REG001234'
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
      registrationNumber: 'REG001234'
    },
    accreditation: undefined
  }

  const reprocessors = [
    {
      scenario: 'Accredited Reprocessor',
      registrationAndAccreditation: mockAccreditedReprocessor
    },
    {
      scenario: 'Registered Only Reprocessor',
      registrationAndAccreditation: mockRegisteredOnlyReprocessor
    }
  ]
  const exporters = [
    {
      scenario: 'Accredited Exporter',
      registrationAndAccreditation: mockAccreditedExporter
    },
    {
      scenario: 'Registered Only Exporter',
      registrationAndAccreditation: mockRegisteredOnlyExporter
    }
  ]
  const reprocessorsAndExporters = [...reprocessors, ...exporters]

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

    describe('for a report that cannot be viewed', () => {
      const reportDetail = {
        status: {
          currentStatus: 'in_progress'
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

    describe('for a draft report', () => {
      const reportDetail = {
        status: {
          currentStatus: 'ready_to_submit',
          created: {
            at: '2026-04-20T15:56:00.000Z',
            by: { id: 'user-789', name: 'Michael Doran', position: 'Manager' }
          }
        },
        dueDate: '2026-04-21',
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
        exportActivity: null,
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
          issuedTonnage: 50,
          freeTonnage: 10,
          totalRevenue: 2500,
          averagePricePerTonne: 50
        },
        supportingInformation: null
      }

      beforeAll(() => {
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await loadPage({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('renders the draft page title and heading', async ({ server }) => {
        const { result } = await loadPage({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        const dom = new JSDOM(result)

        expect(dom.window.document.title).toBe(
          'View draft report | Record reprocessed or exported packaging waste'
        )

        const heading = dom.window.document.body.querySelector('h1')
        expect(heading?.textContent?.trim()).toBe(
          'Draft report for January 2026'
        )
      })

      it('does not render a back link', async ({ server }) => {
        const body = await loadPageBody({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink).toBeNull()
      })

      it('renders the intro text with due date', async ({ server }) => {
        const body = await loadPageBody({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        expect(body.textContent).toContain(
          'An approved person from your business needs to submit this report to your regulator by 21 April 2026'
        )
      })

      it('renders the self-submit guidance with reports page link', async ({
        server
      }) => {
        const body = await loadPageBody({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        const link = body.querySelector('a[href*="/reports"]')
        expect(link).not.toBeNull()
        expect(link?.textContent).toContain('reports page')
      })

      describe('submission-details section', () => {
        async function loadSection({ server }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          return body.querySelector('#submission-details')
        }

        it('renders the Ready to submit status tag', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.textContent).toContain('Status:')
          expect(section.textContent).toContain('Ready to submit')

          const tag = section.querySelector('.govuk-tag')
          expect(tag?.classList.contains('govuk-tag--blue')).toBe(true)
        })

        it('renders the created by name', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.textContent).toContain('Created by:')
          expect(section.textContent).toContain('Michael Doran')
        })

        it('renders the created on date and time', async ({ server }) => {
          const section = await loadSection({ server })

          expect(section.textContent).toContain('Created on:')
          expect(section.textContent).toContain('20 April 2026')
          expect(section.textContent).toContain('4:56pm')
        })
      })

      it('renders the Your report heading', async ({ server }) => {
        const body = await loadPageBody({
          server,
          registrationAndAccreditation: mockAccreditedReprocessor
        })

        const headings = [...body.querySelectorAll('h2')]
        const yourReportHeading = headings.find(
          (h) => h.textContent?.trim() === 'Your report'
        )
        expect(yourReportHeading).toBeDefined()
      })
    })

    describe('for a submitted report', () => {
      const reportDetail = {
        status: {
          currentStatus: 'submitted',
          submitted: {
            at: '2026-03-15T14:30:00.000Z',
            by: { id: 'user-456', name: 'Michael Doran', position: 'Manager' }
          }
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
        exportActivity: {
          totalTonnageExported: 8.0,
          overseasSites: [
            {
              siteName: 'Seoul Recycling Co',
              orsId: 'ORS-001',
              country: 'South Korea',
              tonnageExported: 8,
              approved: true
            },
            {
              siteName: 'Berlin Plastics GmbH',
              orsId: 'ORS-002',
              country: 'Germany',
              tonnageExported: 4,
              approved: false
            }
          ],
          unapprovedOverseasSites: [],
          tonnageReceivedNotExported: 4.5,
          tonnageRefusedAtDestination: 1.0,
          tonnageStoppedDuringExport: 0.5,
          totalTonnageRefusedOrStopped: 1.5,
          tonnageRepatriated: 0.5
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
        },
        supportingInformation: 'Test supporting information note'
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

      describe('submission-details section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#submission-details')
        }

        it('renders the details heading', async ({ server }) => {
          const section = await loadSection({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          expect(section).not.toBeNull()
          expect(section.querySelector('h2')?.textContent?.trim()).toBe(
            'Details'
          )
        })

        it('renders the Submitted status tag', async ({ server }) => {
          const section = await loadSection({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          expect(section.textContent).toContain('Status:')
          expect(section.textContent).toContain('Submitted')
        })

        it('renders the submitted by name', async ({ server }) => {
          const section = await loadSection({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          expect(section.textContent).toContain('Submitted by:')
          expect(section.textContent).toContain('Michael Doran')
        })

        it('renders the submitted on date and time', async ({ server }) => {
          const section = await loadSection({
            server,
            registrationAndAccreditation: mockAccreditedReprocessor
          })

          expect(section.textContent).toContain('Submitted on:')
          expect(section.textContent).toContain('15 March 2026')
          expect(section.textContent).toContain('2:30pm')
        })
      })

      describe('report-period section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#report-period')
        }

        it.for(reprocessorsAndExporters)(
          '($scenario) renders period information',
          async ({ registrationAndAccreditation }, { server }) => {
            const reportPeriodSection = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(reportPeriodSection).not.toBeNull()

            expect(reportPeriodSection.textContent).toContain('Period')
            expect(reportPeriodSection.textContent).toContain('January 2026')
          }
        )

        it.for(reprocessorsAndExporters)(
          '($scenario) renders material information',
          async ({ registrationAndAccreditation }, { server }) => {
            const reportPeriodSection = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(reportPeriodSection.textContent).toContain('Material')
            expect(reportPeriodSection.textContent).toContain('Plastic')
          }
        )

        it.for(reprocessors)(
          '($scenario) renders site information',
          async ({ registrationAndAccreditation }, { server }) => {
            const reportPeriodSection = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(reportPeriodSection.textContent).toContain('Site')
            expect(reportPeriodSection.textContent).toContain('North Road')
          }
        )

        it.for(exporters)(
          '($scenario) does not render site information',
          async ({ registrationAndAccreditation }, { server }) => {
            const reportPeriodSection = await loadSection({
              server,
              registrationAndAccreditation // exporter registration data does not include site
            })

            expect(reportPeriodSection.textContent).not.toContain('Site')
          }
        )
      })

      describe('waste-received-for-reprocessing section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#waste-received-for-reprocessing')
        }

        it.for(reprocessors)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste received for reprocessing'
            )
          }
        )

        it.for(reprocessors)(
          '($scenario) renders the total tonnage received',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain('Total tonnage received')
            expect(section.textContent).toContain('12.50')
          }
        )

        it.for(reprocessors)(
          '($scenario) renders the suppliers table sub-heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.querySelector('h3')?.textContent?.trim()).toBe(
              'Suppliers'
            )
          }
        )

        it.for(reprocessors)(
          '($scenario) renders the suppliers table column headers',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const tableHeader = section.querySelector('table thead')

            expect(tableHeader.textContent).toContain('Supplier')
            expect(tableHeader.textContent).toContain('Activity')
            expect(tableHeader.textContent).toContain('Address')
            expect(tableHeader.textContent).toContain('Phone')
            expect(tableHeader.textContent).toContain('Email')
          }
        )

        it.for(reprocessors)(
          '($scenario) renders suppliers table row data',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const tableBody = section.querySelector('table tbody')

            expect(tableBody.textContent).toContain('Acme Recycling Ltd')
            expect(tableBody.textContent).toContain('Reprocessor')
            expect(tableBody.textContent).toContain(
              '1 Green Lane, Leeds, LS1 1AA'
            )
            expect(tableBody.textContent).toContain('0113 000 0000')
            expect(tableBody.textContent).toContain('contact@acme.example.com')
          }
        )

        it.for(exporters)(
          '($scenario) does not render the section',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).toBeNull()
          }
        )
      })

      describe('packaging-waste-recycling section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#packaging-waste-recycling')
        }

        it.for(reprocessors)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste recycling'
            )
          }
        )

        it.for(reprocessors)(
          '($scenario) renders the total tonnage recycled',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain('Total tonnage recycled')
            expect(section.textContent).toContain('10.25')
          }
        )

        it.for(reprocessors)(
          '($scenario) renders the tonnage not recycled',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage received but not recycled'
            )
            expect(summaryList.textContent).toContain('2.25')
          }
        )

        it.for(exporters)(
          '($scenario) does not render the section',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).toBeNull()
          }
        )
      })

      describe('waste-received-for-exporting section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#waste-received-for-exporting')
        }

        it.for(exporters)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste received for exporting'
            )
          }
        )

        it.for(exporters)(
          '($scenario) renders the total tonnage received',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain('Total tonnage received')
            expect(section.textContent).toContain('12.50')
          }
        )

        it.for(exporters)(
          '($scenario) renders the suppliers table sub-heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.querySelector('h3')?.textContent?.trim()).toBe(
              'Suppliers'
            )
          }
        )

        it.for(exporters)(
          '($scenario) renders the suppliers table column headers',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const tableHeader = section.querySelector('table thead')

            expect(tableHeader.textContent).toContain('Supplier')
            expect(tableHeader.textContent).toContain('Activity')
            expect(tableHeader.textContent).toContain('Address')
            expect(tableHeader.textContent).toContain('Phone')
            expect(tableHeader.textContent).toContain('Email')
          }
        )

        it.for(exporters)(
          '($scenario) renders suppliers table row data',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const tableBody = section.querySelector('table tbody')

            expect(tableBody.textContent).toContain('Acme Recycling Ltd')
            expect(tableBody.textContent).toContain('Reprocessor')
            expect(tableBody.textContent).toContain(
              '1 Green Lane, Leeds, LS1 1AA'
            )
            expect(tableBody.textContent).toContain('0113 000 0000')
            expect(tableBody.textContent).toContain('contact@acme.example.com')
          }
        )

        it.for(reprocessors)(
          '($scenario) does not render the section',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).toBeNull()
          }
        )
      })

      describe('waste-exported-for-recycling section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#waste-exported-for-recycling')
        }

        it.for(exporters)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste exported for recycling'
            )
          }
        )

        it.for(exporters)(
          '($scenario) renders the total tonnage exported',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain('Total tonnage exported')
            expect(section.textContent).toContain('8.00')
          }
        )

        it.for(exporters)(
          '($scenario) renders the overseas sites table column headers',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const tableHeader = section.querySelector('table thead')

            expect(tableHeader.textContent).toContain('Site name')
            expect(tableHeader.textContent).toContain(
              'Approved overseas reprocessor ID'
            )
          }
        )

        it.for(exporters)(
          '($scenario) renders overseas sites table row data',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const tableBody = section.querySelector('table tbody')

            expect(tableBody.textContent).toContain('Seoul Recycling Co')
            expect(tableBody.textContent).toContain('ORS-001')
          }
        )

        it('(Accredited Exporter) renders the Approved column header', async ({
          server
        }) => {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedExporter
          })

          const section = body.querySelector('#waste-exported-for-recycling')
          const tables = getAllByRole(section, 'table')
          const overseasTable = tables[0]
          const headerCells = overseasTable.querySelectorAll('thead th')
          const headerTexts = [...headerCells].map((th) =>
            th.textContent.trim()
          )

          expect(headerTexts).toContain('Approved')
        })

        it('(Registered Only Exporter) does not render the Approved column header', async ({
          server
        }) => {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockRegisteredOnlyExporter
          })

          const section = body.querySelector('#waste-exported-for-recycling')
          const tables = getAllByRole(section, 'table')
          const overseasTable = tables[0]
          const headerCells = overseasTable.querySelectorAll('thead th')
          const headerTexts = [...headerCells].map((th) =>
            th.textContent.trim()
          )

          expect(headerTexts).not.toContain('Approved')
        })

        it('(Accredited Exporter) shows approval tick for approved overseas site', async ({
          server
        }) => {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation: mockAccreditedExporter
          })

          const section = body.querySelector('#waste-exported-for-recycling')
          const tables = getAllByRole(section, 'table')
          const overseasTable = tables[0]
          const rows = overseasTable.querySelectorAll('tbody tr')

          expect(rows[0].textContent).toContain('✓')
          expect(rows[1].textContent).not.toContain('✓')
        })

        it.for(exporters)(
          '($scenario) does not render the unapproved section when none are present',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).not.toContain(
              'Overseas reprocessor IDs that have not been approved'
            )
          }
        )

        describe('when unapproved overseas sites are present', () => {
          beforeAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue({
              ...reportDetail,
              exportActivity: {
                ...reportDetail.exportActivity,
                unapprovedOverseasSites: [
                  { orsId: 'ORS-999', tonnageExported: 3.25 },
                  { orsId: 'ORS-888', tonnageExported: 1.75 }
                ]
              }
            })
          })

          afterAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
          })

          it.for(exporters)(
            '($scenario) renders the unapproved overseas sites section heading',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).toContain(
                'Overseas reprocessor IDs that have not been approved'
              )
            }
          )

          it.for(exporters)(
            '($scenario) lists the unapproved ORS IDs',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const tables = section.querySelectorAll('table')
              const unapprovedTable = tables[tables.length - 1]

              expect(unapprovedTable.textContent).toContain('ORS-999')
              expect(unapprovedTable.textContent).toContain('ORS-888')
            }
          )
        })

        describe('when no waste exported', () => {
          beforeAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue({
              ...reportDetail,
              exportActivity: {
                totalTonnageExported: 0,
                overseasSites: [],
                unapprovedOverseasSites: [],
                tonnageReceivedNotExported: 0,
                totalTonnageRefusedOrStopped: 0,
                tonnageRefusedAtDestination: 0,
                tonnageStoppedDuringExport: 0,
                tonnageRepatriated: 0
              }
            })
          })

          afterAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
          })

          it.for(exporters)(
            '($scenario) still renders the section with zero tonnage',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section).not.toBeNull()
              expect(section.textContent).toContain('0.00')
            }
          )

          it.for(exporters)(
            '($scenario) does not render the approved overseas sites table',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).not.toContain(
                'Overseas reprocessing sites'
              )
              expect(section.querySelector('table')).toBeNull()
            }
          )

          it.for(exporters)(
            '($scenario) does not render the unapproved overseas sites table',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).not.toContain(
                'Overseas reprocessor IDs that have not been approved'
              )
            }
          )
        })

        describe('when only unapproved overseas sites are present', () => {
          beforeAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue({
              ...reportDetail,
              exportActivity: {
                ...reportDetail.exportActivity,
                overseasSites: [],
                unapprovedOverseasSites: [
                  { orsId: 'ORS-777', tonnageExported: 8 }
                ]
              }
            })
          })

          afterAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
          })

          it.for(exporters)(
            '($scenario) does not render the approved overseas sites heading',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).not.toContain(
                'Overseas reprocessing sites'
              )
            }
          )

          it.for(exporters)(
            '($scenario) renders the unapproved overseas sites section',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).toContain(
                'Overseas reprocessor IDs that have not been approved'
              )
              expect(section.textContent).toContain('ORS-777')
            }
          )
        })

        it.for(reprocessors)(
          '($scenario) does not render the section',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).toBeNull()
          }
        )
      })

      describe('waste-received-but-not-exported section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#waste-received-but-not-exported')
        }

        it.for(exporters)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste received but not exported'
            )
          }
        )

        it.for(exporters)(
          '($scenario) renders the tonnage received but not exported',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain('Total tonnage not exported')
            expect(section.textContent).toContain('4.50')
          }
        )

        describe('when no waste exported', () => {
          beforeAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue({
              ...reportDetail,
              exportActivity: {
                totalTonnageExported: 0,
                overseasSites: [],
                unapprovedOverseasSites: [],
                tonnageReceivedNotExported: 0,
                totalTonnageRefusedOrStopped: 0,
                tonnageRefusedAtDestination: 0,
                tonnageStoppedDuringExport: 0,
                tonnageRepatriated: 0
              }
            })
          })

          afterAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
          })

          it.for(exporters)(
            '($scenario) still renders the section with zero tonnage',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section).not.toBeNull()
              expect(section.textContent).toContain('0.00')
            }
          )
        })

        it.for(reprocessors)(
          '($scenario) does not render the section',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).toBeNull()
          }
        )
      })

      describe('packaging-waste-refused-or-stopped-during-export section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector(
            '#packaging-waste-refused-or-stopped-during-export'
          )
        }

        it.for(exporters)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste refused or stopped during export'
            )
          }
        )

        it.for(exporters)(
          '($scenario) renders the total tonnage refused or stopped',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain(
              'Total tonnage refused or stopped'
            )
            expect(section.textContent).toContain('1.50')
          }
        )

        describe('breakdown of refused or stopped tonnage', () => {
          it.for(exporters)(
            '($scenario) renders tonnage refused at destination',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).toContain('Total tonnage refused')
              expect(section.textContent).toContain('1.00')
            }
          )

          it.for(exporters)(
            '($scenario) renders tonnage stopped during export',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).toContain('Total tonnage stopped')
              expect(section.textContent).toContain('0.50')
            }
          )

          it.for(exporters)(
            '($scenario) renders tonnage repatriated',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section.textContent).toContain('Total tonnage repatriated')
              expect(section.textContent).toContain('0.50')
            }
          )
        })

        describe('when no waste exported', () => {
          beforeAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue({
              ...reportDetail,
              exportActivity: {
                totalTonnageExported: 0,
                overseasSites: [],
                unapprovedOverseasSites: [],
                tonnageReceivedNotExported: 0,
                totalTonnageRefusedOrStopped: 0,
                tonnageRefusedAtDestination: 0,
                tonnageStoppedDuringExport: 0,
                tonnageRepatriated: 0
              }
            })
          })

          afterAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
          })

          it.for(exporters)(
            '($scenario) still renders the section with zero tonnage',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })

              expect(section).not.toBeNull()
              expect(section.textContent).toContain('0.00')
            }
          )
        })

        it.for(reprocessors)(
          '($scenario) does not render the section',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).toBeNull()
          }
        )
      })

      describe('packaging-waste-sent-on section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#packaging-waste-sent-on')
        }

        it.for(reprocessorsAndExporters)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Packaging waste sent on'
            )
          }
        )

        it.for(reprocessorsAndExporters)(
          '($scenario) renders the total tonnage sent on',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section.textContent).toContain('Total tonnage sent on')
            expect(section.textContent).toContain('10.00')
          }
        )

        describe('breakdown of tonnage sent on', () => {
          it.for(reprocessorsAndExporters)(
            '($scenario) renders tonnage sent on to reprocessor',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const summaryList = section.querySelector('dl.govuk-summary-list')

              expect(summaryList.textContent).toContain(
                'Total tonnage sent on to reprocessors'
              )
              expect(summaryList.textContent).toContain('5.00')
            }
          )

          it.for(reprocessorsAndExporters)(
            '($scenario) renders tonnage sent on to exporters',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const summaryList = section.querySelector('dl.govuk-summary-list')

              expect(summaryList.textContent).toContain(
                'Total tonnage sent on to exporters'
              )
              expect(summaryList.textContent).toContain('3.00')
            }
          )

          it.for(reprocessorsAndExporters)(
            '($scenario) renders tonnage sent on to other sites',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const summaryList = section.querySelector('dl.govuk-summary-list')

              expect(summaryList.textContent).toContain(
                'Total tonnage sent on to other sites or facilities'
              )
              expect(summaryList.textContent).toContain('2.00')
            }
          )
        })

        describe('final destinations table', () => {
          it.for(reprocessorsAndExporters)(
            '($scenario) renders sub-heading',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const tableCaption = section.querySelector('table caption')

              expect(tableCaption.textContent).toContain('Final destinations')
            }
          )

          it.for(reprocessorsAndExporters)(
            '($scenario) renders headers in table',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const tableHeader = section.querySelector('table thead')

              expect(tableHeader.textContent).toContain('Recipient')
              expect(tableHeader.textContent).toContain('Facility type')
              expect(tableHeader.textContent).toContain('Address')
              expect(tableHeader.textContent).toContain('Tonnage sent on')
            }
          )

          it.for(reprocessorsAndExporters)(
            '($scenario) renders row data in table',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const tableBody = section.querySelector('table tbody')

              expect(tableBody.textContent).toContain('Green Reprocessors Ltd')
              expect(tableBody.textContent).toContain('Reprocessor')
              expect(tableBody.textContent).toContain(
                '5 Factory Road, Sheffield, S1 1AB'
              )
              expect(tableBody.textContent).toContain('1.00')
            }
          )
        })
      })

      describe('prns section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#prns')
        }

        describe('for an accredited reprocessor', () => {
          it('renders the section heading', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedReprocessor
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'PRNs'
            )
          })

          it('renders the total tonnage of PRNs issued', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedReprocessor
            })

            expect(section.textContent).toContain(
              'Total tonnage of PRNs issued'
            )
            expect(section.textContent).toContain('100')
          })

          it('renders total PRNs issued for free', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedReprocessor
            })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Total tonnage of PRNs issued for free'
            )
            expect(summaryList.textContent).toContain('20')
          })

          it('renders total revenue of PRNs', async ({ server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedReprocessor
            })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain('Total revenue of PRNs')
            expect(summaryList.textContent).toContain('£5,000.00')
          })

          it('renders the average price per tonne of PRNs', async ({
            server
          }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation: mockAccreditedReprocessor
            })
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

      describe('supporting-information section', () => {
        async function loadSection({ server, registrationAndAccreditation }) {
          const body = await loadPageBody({
            server,
            registrationAndAccreditation
          })

          return body.querySelector('#supporting-information')
        }

        it.for(reprocessorsAndExporters)(
          '($scenario) renders the section heading',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })

            expect(section).not.toBeNull()
            expect(section.querySelector('h2')?.textContent?.trim()).toBe(
              'Supporting information'
            )
          }
        )

        it.for(reprocessorsAndExporters)(
          '($scenario) renders the supporting information label and value',
          async ({ registrationAndAccreditation }, { server }) => {
            const section = await loadSection({
              server,
              registrationAndAccreditation
            })
            const summaryList = section.querySelector('dl.govuk-summary-list')

            expect(summaryList.textContent).toContain(
              'Supporting information for your regulator'
            )
            expect(summaryList.textContent).toContain(
              'Test supporting information note'
            )
          }
        )

        describe('when no supporting information is provided', () => {
          beforeAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue({
              ...reportDetail,
              supportingInformation: null
            })
          })

          afterAll(() => {
            vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
          })

          it.for(reprocessorsAndExporters)(
            '($scenario) renders "None provided"',
            async ({ registrationAndAccreditation }, { server }) => {
              const section = await loadSection({
                server,
                registrationAndAccreditation
              })
              const summaryList = section.querySelector('dl.govuk-summary-list')

              expect(summaryList.textContent).toContain('None provided')
            }
          )
        })
      })
    })
  })
})
