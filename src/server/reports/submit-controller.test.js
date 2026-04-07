import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/update-report-status.js'))

const { updateReportStatus } = await import('./helpers/update-report-status.js')

const mockAuth = {
  strategy: 'session',
  credentials: {
    profile: { id: 'user-123', email: 'test@example.com' },
    idToken: 'mock-id-token'
  }
}

const exporterRegistration = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: undefined
}

const reprocessorRegistration = {
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

/** @type {import('#server/reports/helpers/fetch-report-detail.js').ReportDetailResponse} */
const exporterReportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  dueDate: '2026-04-20',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: {
    currentStatus: 'ready_to_submit',
    currentStatusAt: '2026-01-20T14:35:00.000Z',
    created: {
      at: '2026-01-20T14:30:00.000Z',
      by: { id: 'user-456', name: 'Michael Doran', position: 'User' }
    }
  },
  supportingInformation: 'Supply chain disruption in February',
  recyclingActivity: {
    totalTonnageReceived: 80.25,
    suppliers: [
      {
        supplierName: 'Grantham Waste',
        facilityType: 'Baler',
        supplierAddress: '17 Foster St, L20 8EX',
        supplierPhone: '0345 340 9656',
        supplierEmail: 'enquiries@granthamwaste.co.uk',
        tonnageReceived: 42.21
      },
      {
        supplierName: 'SUEZ recycling',
        facilityType: 'Sorter',
        supplierAddress: 'Knowsley Industrial Estate, L33 7UZ',
        supplierPhone: '0800 542 3549',
        supplierEmail: 'customer@suez.com',
        tonnageReceived: 38.04
      }
    ],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: {
    totalTonnageExported: 50,
    overseasSites: [
      { siteName: 'Brussels Recycling', orsId: 'OSR-001', country: 'Belgium' },
      { siteName: 'RecyclePlast SA', orsId: 'OSR-096', country: 'France' }
    ],
    tonnageReceivedNotExported: 12.5,
    totalTonnageRefusedOrStopped: 10.8,
    tonnageRefusedAtDestination: 2.5,
    tonnageStoppedDuringExport: 8.3,
    tonnageRepatriated: 8.3
  },
  wasteSent: {
    tonnageSentToReprocessor: 5,
    tonnageSentToExporter: 3,
    tonnageSentToAnotherSite: 2,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        address: '12 Juniper St, L20 8EL',
        tonnageSentOn: 5
      }
    ]
  }
}

const accreditedReprocessorRegistration = {
  ...reprocessorRegistration,
  accreditation: { id: 'acc-001' }
}

/** @type {import('#server/reports/helpers/fetch-report-detail.js').ReportDetailResponse} */
const reprocessorReportDetail = {
  operatorCategory: 'REPROCESSOR_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  dueDate: '2026-04-20',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: {
    material: 'plastic',
    site: {
      address: {
        line1: 'North Road',
        town: 'Manchester',
        postcode: 'M1 1AA'
      }
    }
  },
  id: 'report-001',
  version: 1,
  status: {
    currentStatus: 'ready_to_submit',
    currentStatusAt: '2026-01-10T09:05:00.000Z',
    created: {
      at: '2026-01-10T09:00:00.000Z',
      by: { id: 'user-789', name: 'Jane Smith', position: 'User' }
    }
  },
  supportingInformation: null,
  recyclingActivity: {
    totalTonnageReceived: 80.25,
    suppliers: [
      {
        supplierName: 'Grantham Waste',
        facilityType: 'Baler',
        supplierAddress: '17 Foster St, L20 8EX',
        supplierPhone: '0345 340 9656',
        supplierEmail: 'enquiries@granthamwaste.co.uk',
        tonnageReceived: 42.21
      }
    ],
    tonnageRecycled: 75.5,
    tonnageNotRecycled: 4.75
  },
  wasteSent: {
    tonnageSentToReprocessor: 1,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        address: '12 Juniper St, L20 8EL',
        tonnageSentOn: 1
      }
    ]
  }
}

/** @type {import('#server/reports/helpers/fetch-report-detail.js').ReportDetailResponse} */
const accreditedReprocessorReportDetail = {
  ...reprocessorReportDetail,
  operatorCategory: 'REPROCESSOR_ACCREDITED',
  prn: {
    averagePricePerTonne: 150,
    freeTonnage: 5,
    issuedTonnage: 50,
    totalRevenue: 7500
  }
}

const accreditedExporterRegistration = {
  ...exporterRegistration,
  accreditation: { id: 'acc-002' }
}

/** @type {import('#server/reports/helpers/fetch-report-detail.js').ReportDetailResponse} */
const accreditedExporterReportDetail = {
  ...exporterReportDetail,
  operatorCategory: 'EXPORTER_ACCREDITED',
  prn: {
    averagePricePerTonne: 200,
    freeTonnage: 10,
    issuedTonnage: 100,
    totalRevenue: 20000
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submit`
const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`
const submittedUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submitted`

/** Inject a GET request and return the parsed DOM body. */
async function getBody(server) {
  const { result } = await server.inject({
    method: 'GET',
    url: baseUrl,
    auth: mockAuth
  })
  return new JSDOM(result).window.document.body
}

describe('#submitController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('GET', () => {
      describe('for exporter with supporting information', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            exporterRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue(exporterReportDetail)
        })

        it('should return 200', async ({ server }) => {
          const { statusCode } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          expect(statusCode).toBe(statusCodes.ok)
        })

        it('should display the page heading', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Submit report for Quarter 1, 2026/,
              level: 1
            })
          ).toBeDefined()
        })

        it('should display inset text with correction guidance', async ({
          server
        }) => {
          const body = await getBody(server)
          const insetText = body.querySelector('.govuk-inset-text')

          expect(insetText).not.toBeNull()
          expect(insetText.textContent).toContain(
            'If any of the following information is incorrect'
          )
        })

        it('should display back link to reports list', async ({ server }) => {
          const body = await getBody(server)
          const backLink = body.querySelector('.govuk-back-link')

          expect(backLink).not.toBeNull()
          expect(backLink.getAttribute('href')).toBe(reportsUrl)
        })

        // Details section

        it('should display Details heading', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', { name: /Details/, level: 2 })
          ).toBeDefined()
        })

        it('should display status tag as Ready to submit', async ({
          server
        }) => {
          const body = await getBody(server)
          const tag = body.querySelector('.govuk-tag')

          expect(tag).not.toBeNull()
          expect(tag.textContent.trim()).toBe('Ready to submit')
        })

        it('should display Created by from statusHistory', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Created by:')
          expect(body.textContent).toContain('Michael Doran')
        })

        it('should display Created on with date and time', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Created on:')
          expect(body.textContent).toContain('20 January 2026')
          expect(body.textContent).toContain('2:30')
        })

        // Your report section

        it('should display Your report heading', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', { name: /Your report/, level: 2 })
          ).toBeDefined()
        })

        it('should display period and material in summary list', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Quarter 1, 2026')
          expect(body.textContent).toContain('Plastic')
        })

        // Waste received section

        it('should display Packaging waste received for exporting heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste received for exporting/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display waste received total tonnage', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('80.25')
        })

        it('should display Suppliers subheading', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', { name: /Suppliers/i, level: 3 })
          ).toBeDefined()
        })

        it('should display supplier details with name, activity and contact information', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Grantham Waste')
          expect(body.textContent).toContain('Baler')
          expect(body.textContent).toContain('17 Foster St, L20 8EX')
          expect(body.textContent).toContain('enquiries@granthamwaste.co.uk')
        })

        // Waste exported section

        it('should display Packaging waste exported for recycling heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste exported for recycling/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display waste exported total tonnage', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('50')
        })

        it('should display overseas sites table under waste exported section', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Site name')
          expect(body.textContent).toContain('Approved overseas reprocessor ID')
        })

        it('should display overseas sites with tonnage and OSR ID', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Brussels Recycling')
          expect(body.textContent).toContain('30')
          expect(body.textContent).toContain('OSR-001')
          expect(body.textContent).toContain('RecyclePlast SA')
        })

        // Received but not exported section

        it('should display received but not exported heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste received but not exported/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display received but not exported tonnage', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('12.5')
        })

        // Refused or stopped section

        it('should display refused or stopped heading', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste refused or stopped during export/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display refused or stopped breakdown', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total tonnage refused')
          expect(body.textContent).toContain('2.5')
          expect(body.textContent).toContain('Total tonnage stopped')
          expect(body.textContent).toContain('8.3')
          expect(body.textContent).toContain('Total tonnage repatriated')
        })

        it('should display dash when refused, stopped and repatriated values are null', async ({
          server
        }) => {
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...exporterReportDetail,
            exportActivity: {
              ...exporterReportDetail.exportActivity,
              totalTonnageRefusedOrStopped: null,
              tonnageRefusedAtDestination: null,
              tonnageStoppedDuringExport: null,
              tonnageRepatriated: null
            }
          })

          const body = await getBody(server)

          const labels = [...body.querySelectorAll('.govuk-caption-l')]
          const refusedOrStoppedLabel = labels.find((el) =>
            el.textContent.includes('Total tonnage refused or stopped')
          )
          const combinedTotal = refusedOrStoppedLabel.nextElementSibling

          expect(combinedTotal.textContent.trim()).toBe('-')
        })

        // Waste sent on section

        it('should display Packaging waste sent on heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste sent on/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display waste sent on total tonnage', async ({ server }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('10')
        })

        it('should display waste sent on breakdown with labels', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'Total tonnage sent on to reprocessors'
          )
          expect(body.textContent).toContain(
            'Total tonnage sent on to exporters'
          )
          expect(body.textContent).toContain(
            'Total tonnage sent on to other sites or facilities'
          )
        })

        it('should display Final destinations subheading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Final destinations/i,
              level: 3
            })
          ).toBeDefined()
        })

        it('should display destination details with address', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Lincoln recycling')
          expect(body.textContent).toContain('Reprocessor')
          expect(body.textContent).toContain('12 Juniper St, L20 8EL')
        })

        it('should display destination tonnageSentOn >= 1000 as formatted number, not NaN', async ({
          server
        }) => {
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...exporterReportDetail,
            wasteSent: {
              ...exporterReportDetail.wasteSent,
              finalDestinations: [
                {
                  recipientName: 'HighLow Limited',
                  facilityType: 'Exporter',
                  address: '11 high street, G59NS',
                  tonnageSentOn: 1000
                }
              ]
            }
          })

          const body = await getBody(server)

          expect(body.textContent).toContain('1,000.00')
          expect(body.textContent).not.toContain('NaN')
        })

        // Supporting information section

        it('should display Supporting information heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Supporting information/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display supporting information text', async ({ server }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'Supply chain disruption in February'
          )
        })

        // Declaration section

        it('should display Declaration heading', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', { name: /Declaration/, level: 2 })
          ).toBeDefined()
        })

        it('should display declaration text and bullet points', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'By submitting this report to your regulator you confirm that'
          )
          expect(body.textContent).toContain('you are an approved person')
          expect(body.textContent).toContain(
            'as accurate as reasonably possible'
          )
          expect(body.textContent).toContain(
            'false or misleading information may result in enforcement action'
          )
        })

        it('should display Confirm and submit button', async ({ server }) => {
          const body = await getBody(server)
          const button = body.querySelector('.govuk-button')

          expect(button).not.toBeNull()
          expect(button.textContent.trim()).toContain('Confirm and submit')
        })

        it('should include report version as hidden form field', async ({
          server
        }) => {
          const body = await getBody(server)
          const versionInput = body.querySelector('input[name="version"]')

          expect(versionInput).not.toBeNull()
          expect(versionInput.getAttribute('type')).toBe('hidden')
          expect(versionInput.getAttribute('value')).toBe('1')
        })

        it('should not display recycling activity section', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', {
              name: /Packaging waste recycling/i,
              level: 2
            })
          ).toBeNull()
        })

        it('should not display PERN section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', { name: /^PERNs$/i, level: 2 })
          ).toBeNull()
        })
      })

      describe('for exporter with no export activity', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            exporterRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...exporterReportDetail,
            exportActivity: null
          })
        })

        it('should still display waste exported heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste exported for recycling/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display zero for total tonnage exported', async ({
          server
        }) => {
          const body = await getBody(server)
          const labels = [...body.querySelectorAll('.govuk-caption-l')]
          const exportedLabel = labels.find((el) =>
            el.textContent.includes('Total tonnage exported')
          )
          const value = exportedLabel?.nextElementSibling

          expect(value?.textContent?.trim()).toBe('0.00')
        })

        it('should still display received but not exported heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste received but not exported/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should still display refused or stopped heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste refused or stopped during export/i,
              level: 2
            })
          ).toBeDefined()
        })
      })

      describe('for accredited exporter', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            accreditedExporterRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue(
            accreditedExporterReportDetail
          )
        })

        it('should not display recycling activity section', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', {
              name: /Packaging waste recycling/i,
              level: 2
            })
          ).toBeNull()
        })

        it('should display PERN section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', { name: /^PERNs$/i, level: 2 })
          ).toBeDefined()
        })

        it('should display total tonnage of PERNs issued label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total tonnage of PERNs issued')
          expect(body.textContent).toContain('100')
        })

        it('should display total tonnage of PERNs issued for free label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'Total tonnage of PERNs issued for free'
          )
          expect(body.textContent).toContain('10')
          expect(body.textContent).toContain(
            '(These are not included in the average price per tonne calculation)'
          )
        })

        it('should display total revenue of PERNs label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total revenue of PERNs')
          expect(body.textContent).toContain('£20,000.00')
        })

        it('should display average price per tonne of PERNs label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Average price per tonne of PERNs')
          expect(body.textContent).toContain('£200.00')
        })
      })

      describe('for reprocessor without supporting information', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            reprocessorRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue(
            reprocessorReportDetail
          )
        })

        it('should display Packaging waste received for reprocessing heading', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste received for reprocessing/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should not display waste exported section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', {
              name: /waste exported/i,
              level: 2
            })
          ).toBeNull()
        })

        it('should not display received but not exported section', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', {
              name: /received but not exported/i,
              level: 2
            })
          ).toBeNull()
        })

        it('should not display refused or stopped section', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', {
              name: /refused or stopped/i,
              level: 2
            })
          ).toBeNull()
        })

        it('should display None provided for empty supporting information', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('None provided')
        })

        it('should display Created by from statusHistory', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Jane Smith')
        })

        it('should display recycling activity section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste recycling/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display total tonnage recycled label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total tonnage recycled')
          expect(body.textContent).toContain('75.50')
        })

        it('should display total tonnage received but not recycled label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'Total tonnage received but not recycled'
          )
          expect(body.textContent).toContain('4.75')
        })

        it('should not display PRN section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            queryByRole(body, 'heading', { name: /^PRNs$/i, level: 2 })
          ).toBeNull()
        })
      })

      describe('for accredited reprocessor', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            accreditedReprocessorRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue(
            accreditedReprocessorReportDetail
          )
        })

        it('should display recycling activity section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste recycling/i,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display total tonnage recycled label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total tonnage recycled')
          expect(body.textContent).toContain('75.50')
        })

        it('should display total tonnage received but not recycled label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'Total tonnage received but not recycled'
          )
          expect(body.textContent).toContain('4.75')
        })

        it('should display PRN section', async ({ server }) => {
          const body = await getBody(server)

          expect(
            getByRole(body, 'heading', { name: /^PRNs$/i, level: 2 })
          ).toBeDefined()
        })

        it('should display total tonnage of PRNs issued label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total tonnage of PRNs issued')
          expect(body.textContent).toContain('50')
        })

        it('should display total tonnage of PRNs issued for free label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain(
            'Total tonnage of PRNs issued for free'
          )
          expect(body.textContent).toContain('5')
          expect(body.textContent).toContain(
            '(These are not included in the average price per tonne calculation)'
          )
        })

        it('should display total revenue of PRNs label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Total revenue of PRNs')
          expect(body.textContent).toContain('£7,500.00')
        })

        it('should display average price per tonne of PRNs label and value', async ({
          server
        }) => {
          const body = await getBody(server)

          expect(body.textContent).toContain('Average price per tonne of PRNs')
          expect(body.textContent).toContain('£150.00')
        })
      })

      describe('delete report button', () => {
        it.for([
          {
            label: 'exporter quarterly',
            registration: exporterRegistration,
            report: exporterReportDetail,
            cadence: 'quarterly',
            period: 1
          },
          {
            label: 'reprocessor monthly',
            registration: reprocessorRegistration,
            report: {
              ...reprocessorReportDetail,
              cadence: 'monthly',
              period: 3
            },
            cadence: 'monthly',
            period: 3
          }
        ])(
          'should display warning button for $label',
          async ({ registration, report, cadence, period }, { server }) => {
            vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
              registration
            )
            vi.mocked(fetchReportDetail).mockResolvedValue(report)

            const url = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/${cadence}/${period}/submit`
            const { result } = await server.inject({
              method: 'GET',
              url,
              auth: mockAuth
            })
            const body = new JSDOM(result).window.document.body
            const deleteButton = getByRole(body, 'button', {
              name: /Delete report/i
            })

            expect(deleteButton.getAttribute('href')).toBe(
              `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/${cadence}/${period}/delete`
            )
            expect(
              deleteButton.classList.contains('govuk-button--warning')
            ).toBe(true)
          }
        )
      })
    })

    describe('POST', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          exporterRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(exporterReportDetail)
        vi.mocked(updateReportStatus).mockResolvedValue({ ok: true })
      })

      describe('csrf protection', () => {
        it('should reject POST without CSRF token', async ({ server }) => {
          const { statusCode } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            payload: {}
          })

          expect(statusCode).toBe(statusCodes.forbidden)
        })
      })

      describe('when Confirm and submit is clicked', () => {
        it('should call updateReportStatus with submitted status', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, version: 1 }
          })

          expect(updateReportStatus).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'quarterly',
            1,
            { status: 'submitted', version: 1 },
            'mock-id-token'
          )
        })

        it('should redirect to submitted confirmation page', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, version: 1 }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(submittedUrl)
        })

        it('should set reportSubmitted session data', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const postResponse = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, version: 1 }
          })

          const postCookieValues = extractCookieValues(
            postResponse.headers['set-cookie']
          )
          const cookies = mergeCookies(cookie, ...postCookieValues)

          // Follow redirect to submitted page — should render (not redirect
          // to list) because session data was set correctly
          const { statusCode } = await server.inject({
            method: 'GET',
            url: submittedUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          expect(statusCode).toBe(statusCodes.ok)
        })
      })
    })

    describe('param validation', () => {
      it('should return 400 for invalid cadence', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/submit`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid year', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/submit`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid period', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/submit`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', false)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    it('should return 404', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
