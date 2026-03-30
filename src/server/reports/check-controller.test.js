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
        tonnageReceived: 42.21
      },
      {
        supplierName: 'SUEZ recycling',
        facilityType: 'Sorter',
        tonnageReceived: 38.04
      }
    ],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: {
    totalTonnageReceivedForExporting: 50,
    overseasSites: [{ siteName: 'Brussels Recycling', orsId: 'OSR-001' }],
    tonnageReceivedNotExported: null,
    tonnageRefusedAtRecepientDestination: null,
    tonnageStoppedDuringExport: null,
    tonnageRepatriated: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 5,
    tonnageSentToExporter: 3,
    tonnageSentToAnotherSite: 2,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        tonnageSentOn: 5
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
        tonnageReceived: 42.21
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
        tonnageSentOn: 1
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

        it('should display period label and material', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('Quarter 1, 2026')
          expect(body.textContent).toContain('Plastic')
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

        it('should display Summary log data guidance text', async ({
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

        it('should display waste received section', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('80.25')
          expect(body.textContent).toContain('Grantham Waste')
          expect(body.textContent).toContain('SUEZ recycling')
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

        it('should display waste sent on section', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          expect(body.textContent).toContain('10')
          expect(body.textContent).toContain('Lincoln recycling')
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

          const summaryList = body.querySelector('.govuk-summary-list')

          expect(summaryList).not.toBeNull()
          expect(summaryList?.textContent).toContain(
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

          const summaryList = body.querySelector('.govuk-summary-list')

          expect(summaryList?.textContent).toContain('None provided')
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
