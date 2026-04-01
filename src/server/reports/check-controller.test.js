import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
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

const exporterReportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  lastUploadedAt: '2026-02-15T15:09:00.000Z',
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: 'in_progress',
  supportingInformation: 'Supply chain disruption in February',
  recyclingActivity: {
    totalTonnageReceived: 80.25,
    suppliers: [
      {
        supplierName: 'Grantham Waste',
        facilityType: 'Baler',
        tonnageReceived: 42.21,
        supplierAddress: '12 Industrial Estate, Grantham, NG31 7AA',
        supplierPhone: '01234 567890',
        supplierEmail: 'info@granthamwaste.co.uk'
      },
      {
        supplierName: 'SUEZ recycling',
        facilityType: 'Sorter',
        tonnageReceived: 38.04,
        supplierAddress: '45 Recycling Park, Leeds, LS1 2AB',
        supplierPhone: '09876 543210',
        supplierEmail: 'info@suez.co.uk'
      }
    ],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: {
    totalTonnageReceivedForExporting: 50,
    overseasSites: [{ siteName: 'Brussels Recycling', orsId: 'OSR-001' }],
    tonnageReceivedNotExported: 15.5,
    tonnageRefusedAtRecepientDestination: 3.2,
    tonnageStoppedDuringExport: 1.8,
    tonnageRepatriated: 0.5
  },
  wasteSent: {
    tonnageSentToReprocessor: 5,
    tonnageSentToExporter: 3,
    tonnageSentToAnotherSite: 2,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        tonnageSentOn: 5,
        address: '7 Waste Lane, Lincoln, LN1 3CD'
      }
    ]
  }
}

const reprocessorReportDetail = {
  operatorCategory: 'REPROCESSOR_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  lastUploadedAt: '2026-02-15T15:09:00.000Z',
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
  status: 'in_progress',
  supportingInformation: null,
  recyclingActivity: {
    totalTonnageReceived: 80.25,
    suppliers: [
      {
        supplierName: 'Grantham Waste',
        facilityType: 'Baler',
        tonnageReceived: 42.21,
        address: '12 Industrial Estate, Grantham, NG31 7AA',
        phone: '01234 567890',
        email: 'info@granthamwaste.co.uk'
      }
    ],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 1,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        tonnageSentOn: 1,
        address: '7 Waste Lane, Lincoln, LN1 3CD'
      }
    ]
  }
}

const accreditedReprocessorRegistration = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    registrationNumber: 'REG001234',
    accreditationId: 'acc-001',
    site: {
      address: { line1: 'North Road', town: 'Manchester', postcode: 'M1 1AA' }
    }
  },
  accreditation: { id: 'acc-001', accreditationNumber: 'ER992415095748M' }
}

const accreditedExporterRegistration = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234',
    accreditationId: 'acc-002'
  },
  accreditation: { id: 'acc-002', accreditationNumber: 'EE992415095748M' }
}

const accreditedReprocessorReportDetail = {
  ...reprocessorReportDetail,
  prn: { issuedTonnage: 75 }
}

const accreditedExporterReportDetail = {
  ...exporterReportDetail,
  prn: {
    issuedTonnage: 75,
    totalRevenue: 1576.12,
    freeTonnage: 0,
    averagePricePerTonne: 21.01
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/check-your-answers`

describe('#checkController', () => {
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
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const heading = getByRole(body, 'heading', {
            name: /Check your answers before creating draft report/,
            level: 1
          })

          expect(heading).toBeDefined()
        })

        it('should display the Create report caption', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const caption = body.querySelector('.govuk-caption-xl')

          expect(caption).not.toBeNull()
          expect(caption?.textContent).toContain('Create report')
        })

        it('should display summary list with period, registration, and material', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryLists = body.querySelectorAll('.govuk-summary-list')
          const headerSummaryList = summaryLists[0]

          expect(headerSummaryList).not.toBeNull()
          expect(headerSummaryList?.textContent).toContain('Period')
          expect(headerSummaryList?.textContent).toContain('Quarterly')
          expect(headerSummaryList?.textContent).toContain('REG001234')
          expect(headerSummaryList?.textContent).toContain('Plastic')
        })

        it('should display Summary log data heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const heading = getByRole(body, 'heading', {
            name: /Summary log data/,
            level: 2
          })

          expect(heading).toBeDefined()
        })

        it('should display correction guidance as inset text', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const insetText = body.querySelector('.govuk-inset-text')

          expect(insetText).not.toBeNull()
          expect(insetText?.textContent).toContain(
            'If any information in this section is incorrect'
          )
        })

        it('should display Supporting information heading', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const heading = getByRole(body, 'heading', {
            name: /Supporting information/,
            level: 2
          })

          expect(heading).toBeDefined()
        })

        it('should display supplier table with 5 contact detail columns', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const tables = body.querySelectorAll('.govuk-table')
          const supplierTable = tables[0]
          const headers = supplierTable?.querySelectorAll('th')

          expect(headers).toHaveLength(5)
          expect(headers?.[0]?.textContent).toContain('Supplier')
          expect(headers?.[1]?.textContent).toContain('Activity')
          expect(headers?.[2]?.textContent).toContain('Address')
          expect(headers?.[4]?.textContent).toContain('Email')
        })

        it('should display supplier contact details in table rows', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const tables = body.querySelectorAll('.govuk-table')
          const supplierTable = tables[0]

          expect(supplierTable?.textContent).toContain('Grantham Waste')
          expect(supplierTable?.textContent).toContain(
            '12 Industrial Estate, Grantham, NG31 7AA'
          )
          expect(supplierTable?.textContent).toContain('01234 567890')
          expect(supplierTable?.textContent).toContain(
            'info@granthamwaste.co.uk'
          )
        })

        it('should display waste exported section for exporters', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('50')
          expect(body.textContent).toContain('Brussels Recycling')
        })

        it('should display received but not exported heading', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste received but not exported/,
              level: 3
            })
          ).toBeDefined()
        })

        it('should display received but not exported tonnage', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('15.50')
        })

        it('should display refused or stopped heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            getByRole(body, 'heading', {
              name: /Packaging waste refused or stopped during export/,
              level: 3
            })
          ).toBeDefined()
        })

        it('should display refused or stopped breakdown', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('Total tonnage refused')
          expect(body.textContent).toContain('3.20')
          expect(body.textContent).toContain('Total tonnage stopped')
          expect(body.textContent).toContain('1.80')
          expect(body.textContent).toContain('Total tonnage repatriated')
        })

        it('should display dash when refused and stopped values are null', async ({
          server
        }) => {
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...exporterReportDetail,
            exportActivity: {
              ...exporterReportDetail.exportActivity,
              tonnageRefusedAtRecepientDestination: null,
              tonnageStoppedDuringExport: null,
              tonnageRepatriated: null
            }
          })

          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const labels = [...body.querySelectorAll('.govuk-body-s')]
          const refusedOrStoppedLabel = labels.find((el) =>
            el.textContent.includes('Total tonnage refused or stopped')
          )
          const combinedTotal = refusedOrStoppedLabel?.nextElementSibling

          expect(combinedTotal?.textContent?.trim()).toBe('-')
        })

        it('should display combined total when refused is null but stopped is not', async ({
          server
        }) => {
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...exporterReportDetail,
            exportActivity: {
              ...exporterReportDetail.exportActivity,
              tonnageRefusedAtRecepientDestination: null,
              tonnageStoppedDuringExport: 4.0
            }
          })

          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const labels = [...body.querySelectorAll('.govuk-body-s')]
          const refusedOrStoppedLabel = labels.find((el) =>
            el.textContent.includes('Total tonnage refused or stopped')
          )
          const combinedTotal = refusedOrStoppedLabel?.nextElementSibling

          expect(combinedTotal?.textContent?.trim()).toBe('4.00')
        })

        it('should display combined total when stopped is null but refused is not', async ({
          server
        }) => {
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...exporterReportDetail,
            exportActivity: {
              ...exporterReportDetail.exportActivity,
              tonnageRefusedAtRecepientDestination: 2.5,
              tonnageStoppedDuringExport: null
            }
          })

          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const labels = [...body.querySelectorAll('.govuk-body-s')]
          const refusedOrStoppedLabel = labels.find((el) =>
            el.textContent.includes('Total tonnage refused or stopped')
          )
          const combinedTotal = refusedOrStoppedLabel?.nextElementSibling

          expect(combinedTotal?.textContent?.trim()).toBe('2.50')
        })

        it('should display destination table with 4 columns including address', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const tables = body.querySelectorAll('.govuk-table')
          const destinationTable = Array.from(tables).find((table) =>
            table.textContent?.includes('Lincoln recycling')
          )
          const headers = destinationTable?.querySelectorAll('th')

          expect(headers).toHaveLength(4)
          expect(headers?.[0]?.textContent).toContain('Recipient')
          expect(headers?.[2]?.textContent).toContain('Address')
          expect(headers?.[3]?.textContent).toContain('Tonnage sent on')
          expect(destinationTable?.textContent).toContain(
            '7 Waste Lane, Lincoln, LN1 3CD'
          )
        })

        it('should display supporting information with saved text', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryLists = body.querySelectorAll('.govuk-summary-list')
          const supportingInfoList = summaryLists[summaryLists.length - 1]

          expect(supportingInfoList).not.toBeNull()
          expect(supportingInfoList?.textContent).toContain(
            'Supply chain disruption in February'
          )
        })

        it('should display Change link for supporting information', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const changeLink = body.querySelector(
            '.govuk-summary-list a.govuk-link'
          )

          expect(changeLink).not.toBeNull()
          expect(changeLink?.textContent).toContain('Change')
          expect(changeLink?.getAttribute('href')).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/supporting-information`
          )
        })

        it('should display Create report button', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const button = body.querySelector('.govuk-button')

          expect(button).not.toBeNull()
          expect(button?.textContent?.trim()).toContain('Create report')
        })

        it('should include report version as hidden form field', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const versionInput = body.querySelector('input[name="version"]')

          expect(versionInput).not.toBeNull()
          expect(versionInput?.getAttribute('type')).toBe('hidden')
          expect(versionInput?.getAttribute('value')).toBe('1')
        })

        it('should display delete and start again link', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const deleteLink = body.querySelector('a[href*="/delete"]')

          expect(deleteLink).not.toBeNull()
          expect(deleteLink?.textContent).toContain('Delete and start again')
          expect(deleteLink?.getAttribute('href')).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/delete`
          )
        })

        it('should display back link to supporting information page', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const backLink = body.querySelector('.govuk-back-link')

          expect(backLink).not.toBeNull()
          expect(backLink?.getAttribute('href')).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/supporting-information`
          )
        })
      })

      describe('for registered-only exporter', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            exporterRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue(exporterReportDetail)
        })

        it('should not display PERNs section', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            queryByRole(body, 'heading', { name: /PERNs/, level: 3 })
          ).toBeNull()
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

        it('should not display waste exported section', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            queryByRole(body, 'heading', {
              name: /waste exported/i,
              level: 3
            })
          ).toBeNull()
        })

        it('should not display received but not exported section', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            queryByRole(body, 'heading', {
              name: /received but not exported/i,
              level: 3
            })
          ).toBeNull()
        })

        it('should not display refused or stopped section', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            queryByRole(body, 'heading', {
              name: /refused or stopped/i,
              level: 3
            })
          ).toBeNull()
        })

        it('should display None provided for empty supporting information', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryLists = body.querySelectorAll('.govuk-summary-list')
          const supportingInfoList = summaryLists[summaryLists.length - 1]

          expect(supportingInfoList?.textContent).toContain('None provided')
        })

        it('should not display PRNs section for registered-only operator', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            queryByRole(body, 'heading', { name: /PRNs/, level: 3 })
          ).toBeNull()
        })

        it('should display site in header summary list', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryLists = body.querySelectorAll('.govuk-summary-list')
          const headerSummaryList = summaryLists[0]

          expect(headerSummaryList?.textContent).toContain('Site')
          expect(headerSummaryList?.textContent).toContain('North Road')
        })

        it('should display destination table with 4 columns', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const tables = body.querySelectorAll('.govuk-table')
          const destinationTable = Array.from(tables).find((table) =>
            table.textContent?.includes('Lincoln recycling')
          )
          const headers = destinationTable?.querySelectorAll('th')

          expect(headers).toHaveLength(4)
          expect(headers?.[0]?.textContent).toContain('Recipient')
          expect(headers?.[1]?.textContent).toContain('Activity')
          expect(headers?.[2]?.textContent).toContain('Address')
          expect(headers?.[3]?.textContent).toContain('Tonnage sent on')
        })
      })

      describe('for registered-only reprocessor recycling activity', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            reprocessorRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue({
            ...reprocessorReportDetail,
            recyclingActivity: {
              ...reprocessorReportDetail.recyclingActivity,
              tonnageRecycled: 150.5,
              tonnageNotRecycled: 20
            }
          })
        })

        it('should display recycling activity section heading', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            getByRole(body, 'heading', {
              name: /Recycling activity/,
              level: 2
            })
          ).toBeDefined()
        })

        it('should display tonnage recycled with Change link', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain(
            'Total tonnage of packaging waste recycled'
          )
          expect(body.textContent).toContain('150.5')

          const changeLinks = body.querySelectorAll(
            '.govuk-summary-list a[href*="tonnes-recycled"]'
          )
          expect(changeLinks.length).toBeGreaterThan(0)
        })

        it('should display tonnage not recycled with Change link', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain(
            'Total tonnage of packaging waste received but not recycled'
          )
          expect(body.textContent).toContain('20')

          const changeLinks = body.querySelectorAll(
            '.govuk-summary-list a[href*="tonnes-not-recycled"]'
          )
          expect(changeLinks.length).toBeGreaterThan(0)
        })

        it('should link tonnage recycled Change to the tonnes-recycled page', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const changeLink = body.querySelector(
            '.govuk-summary-list a[href*="tonnes-recycled"]'
          )

          expect(changeLink?.getAttribute('href')).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/tonnes-recycled`
          )
        })

        it('should link tonnage not recycled Change to the tonnes-not-recycled page', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const changeLink = body.querySelector(
            '.govuk-summary-list a[href*="tonnes-not-recycled"]'
          )

          expect(changeLink?.getAttribute('href')).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/tonnes-not-recycled`
          )
        })

        it('should not display PRNs section', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            queryByRole(body, 'heading', { name: /PRNs/, level: 3 })
          ).toBeNull()
        })
      })

      describe('for registered-only reprocessor with unanswered recycling tonnages', () => {
        beforeEach(() => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            reprocessorRegistration
          )
          vi.mocked(fetchReportDetail).mockResolvedValue(
            reprocessorReportDetail
          )
        })

        it('should display dash for null tonnage recycled', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryRows = body.querySelectorAll('.govuk-summary-list__row')
          const recycledRow = Array.from(summaryRows).find((row) =>
            row.textContent?.includes(
              'Total tonnage of packaging waste recycled'
            )
          )

          const value = recycledRow?.querySelector('.govuk-summary-list__value')

          expect(value?.textContent?.trim()).toBe('—')
        })

        it('should display dash for null tonnage not recycled', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryRows = body.querySelectorAll('.govuk-summary-list__row')
          const notRecycledRow = Array.from(summaryRows).find((row) =>
            row.textContent?.includes(
              'Total tonnage of packaging waste received but not recycled'
            )
          )

          const value = notRecycledRow?.querySelector(
            '.govuk-summary-list__value'
          )

          expect(value?.textContent?.trim()).toBe('—')
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

        it('should display accreditation number and label in header summary list', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const summaryLists = body.querySelectorAll('.govuk-summary-list')
          const headerSummaryList = summaryLists[0]

          expect(headerSummaryList?.textContent).toContain('Accreditation')
          expect(headerSummaryList?.textContent).toContain('ER992415095748M')
        })

        it('should display PRNs heading and issued tonnage', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            getByRole(body, 'heading', { name: /PRNs/, level: 3 })
          ).toBeDefined()
          expect(body.textContent).toContain('Total tonnage of PRNs issued')
          expect(body.textContent).toContain('75')
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

        it('should display PERNs heading and issued tonnage', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(
            getByRole(body, 'heading', { name: /PERNs/, level: 3 })
          ).toBeDefined()
          expect(body.textContent).toContain('Total tonnage of PERNs issued')
          expect(body.textContent).toContain('75')
        })

        it('should display total revenue with Change link', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('Total revenue of PERNs')
          expect(body.textContent).toContain('£1,576.12')

          const changeLinks = body.querySelectorAll(
            '.govuk-summary-list a[href*="prn-summary"]'
          )
          expect(changeLinks.length).toBeGreaterThan(0)
        })

        it('should display free PERNs tonnage with Change link', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain(
            'Total tonnage of PERNs issued for free'
          )

          const changeLinks = body.querySelectorAll(
            '.govuk-summary-list a[href*="free-perns"]'
          )
          expect(changeLinks.length).toBeGreaterThan(0)
        })

        it('should display average price per tonne without Change link', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('Average price per tonne')
          expect(body.textContent).toContain('£21.01')
        })

        it('should display note about free PERNs exclusion from average', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          expect(result).toContain(
            'not included in the average price per tonne calculation'
          )
        })
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

      describe('when Create report is clicked', () => {
        it('should advance status and redirect to created page', async ({
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
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/created`
          )
        })

        it('should call updateReportStatus with correct parameters', async ({
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
            { status: 'ready_to_submit', version: 1 },
            'mock-id-token'
          )
        })
      })
    })

    describe('param validation', () => {
      it('should return 400 for invalid cadence', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/check-your-answers`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid year', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/check-your-answers`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid period', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/check-your-answers`

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
