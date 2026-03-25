import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getAllByRole, getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

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
  wasteSent: {
    tonnageSentToReprocessor: 1.0,
    tonnageSentToExporter: 0.0,
    tonnageSentToAnotherSite: 0.0,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        tonnageSentOn: 1.0
      }
    ]
  }
}

const emptyReportDetail = {
  operatorCategory: 'REPROCESSOR_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  lastUploadedAt: null,
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
  recyclingActivity: {
    totalTonnageReceived: 0,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 0,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: []
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
      address: {
        line1: 'North Road',
        town: 'Manchester',
        postcode: 'M1 1AA'
      }
    }
  },
  accreditation: {
    id: 'acc-001',
    accreditationNumber: 'ER992415095748M',
    status: 'approved'
  }
}

const accreditedReprocessorReportDetail = {
  operatorCategory: 'REPROCESSOR',
  cadence: 'monthly',
  year: 2026,
  period: 2,
  startDate: '2026-02-01',
  endDate: '2026-02-28',
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
  wasteSent: {
    tonnageSentToReprocessor: 1.0,
    tonnageSentToExporter: 0.0,
    tonnageSentToAnotherSite: 0.0,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Reprocessor',
        tonnageSentOn: 1.0
      }
    ]
  }
}

const exporterRegistration = {
  organisationData: { id: 'org-456' },
  registration: {
    id: 'reg-002',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG002345'
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
  details: {
    material: 'plastic'
  },
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
    totalTonnageReceivedForExporting: 11.47,
    overseasSites: [
      { siteName: 'EuroPlast Recycling GmbH', orsId: '001' },
      { siteName: 'RecyclePlast SA', orsId: '096' }
    ],
    tonnageReceivedNotExported: null,
    tonnageRefusedAtRecepientDestination: null,
    tonnageStoppedDuringExport: null,
    tonnageRepatriated: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 1.0,
    tonnageSentToExporter: 0.0,
    tonnageSentToAnotherSite: 0.0,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Exporter',
        tonnageSentOn: 1.0
      }
    ]
  }
}

const emptyExporterReportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  lastUploadedAt: null,
  details: {
    material: 'plastic'
  },
  recyclingActivity: {
    totalTonnageReceived: 0,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: {
    totalTonnageReceivedForExporting: 0,
    overseasSites: [],
    tonnageReceivedNotExported: null,
    tonnageRefusedAtRecepientDestination: null,
    tonnageStoppedDuringExport: null,
    tonnageRepatriated: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 0,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: []
  }
}

const detailUrl =
  '/organisations/org-123/registrations/reg-001/reports/2026/quarterly/1'
const exporterDetailUrl =
  '/organisations/org-456/registrations/reg-002/reports/2026/quarterly/1'
const accreditedDetailUrl =
  '/organisations/org-123/registrations/reg-001/reports/2026/monthly/2'

const accreditedExporterRegistration = {
  organisationData: { id: 'org-789' },
  registration: {
    id: 'reg-003',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG003456',
    accreditationId: 'acc-002'
  },
  accreditation: {
    id: 'acc-002',
    accreditationNumber: 'EE992415095748M',
    status: 'approved'
  }
}

const accreditedExporterReportDetail = {
  operatorCategory: 'EXPORTER',
  cadence: 'monthly',
  year: 2026,
  period: 2,
  startDate: '2026-02-01',
  endDate: '2026-02-28',
  lastUploadedAt: '2026-02-15T15:09:00.000Z',
  details: {
    material: 'plastic'
  },
  recyclingActivity: {
    totalTonnageReceived: 80.25,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: {
    totalTonnageReceivedForExporting: 11.47,
    overseasSites: [{ orsId: '001' }, { orsId: '096' }],
    tonnageReceivedNotExported: null,
    tonnageRefusedAtRecepientDestination: null,
    tonnageStoppedDuringExport: null,
    tonnageRepatriated: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 1.0,
    tonnageSentToExporter: 0.0,
    tonnageSentToAnotherSite: 0.0,
    finalDestinations: [
      {
        recipientName: 'Lincoln recycling',
        facilityType: 'Exporter',
        tonnageSentOn: 1.0
      }
    ]
  }
}

const accreditedExporterDetailUrl =
  '/organisations/org-789/registrations/reg-003/reports/2026/monthly/2'

describe('#detailReportsController', () => {
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

    describe('for registered-only reprocessor with data', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          reprocessorRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reprocessorReportDetail)
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display page heading with period label', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Quarter 1, 2026/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('should display material as caption', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const caption = body.querySelector('.govuk-caption-xl')

        expect(caption?.textContent).toContain('Plastic')
      })

      it('should display back link to reports list', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001/reports'
        )
      })

      it('should display last upload timestamp with time', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const inset = body.querySelector('.govuk-inset-text')

        expect(inset?.textContent).toContain('3:09pm')
        expect(inset?.textContent).toContain('15 February')
      })

      it('should display overview text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain(
          'The following is an overview of your summary log data for'
        )
      })

      it('should display correction text with upload link', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const link = body.querySelector('a[href*="summary-logs/upload"]')

        expect(link).not.toBeNull()
        expect(link?.textContent).toContain('upload an updated summary log')
        expect(link?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001/summary-logs/upload'
        )
      })

      it('should display site details', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('North Road')
      })

      it('should display waste received heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Packaging waste received for reprocessing/,
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display total tonnage received', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('80.25')
      })

      it('should display supplier names in table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = getAllByRole(body, 'table')
        const supplierTable = tables[0]

        expect(supplierTable.textContent).toContain('Grantham Waste')
        expect(supplierTable.textContent).toContain('SUEZ recycling')
      })

      it('should display supplier roles and tonnages', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = getAllByRole(body, 'table')
        const supplierTable = tables[0]

        expect(supplierTable.textContent).toContain('Baler')
        expect(supplierTable.textContent).toContain('42.21')
        expect(supplierTable.textContent).toContain('Sorter')
        expect(supplierTable.textContent).toContain('38.04')
      })

      it('should display waste sent on heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Packaging waste sent on/,
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display total tonnage sent on', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Total tonnage sent on')
      })

      it('should display sent on breakdown by destination type', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain(
          'Total tonnage sent on to reprocessors'
        )
        expect(body.textContent).toContain('Total tonnage sent on to exporters')
        expect(body.textContent).toContain(
          'Total tonnage sent on to other sites or facilities'
        )
      })

      it('should display destination details table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = getAllByRole(body, 'table')
        const destinationTable = tables[2]

        expect(destinationTable.textContent).toContain('Lincoln recycling')
        expect(destinationTable.textContent).toContain('Reprocessor')
        expect(destinationTable.textContent).toContain('1')
      })
    })

    describe('when no records match the period', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          reprocessorRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(emptyReportDetail)
      })

      it('should display zero tonnage for waste received', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('0')
      })

      it('should only display breakdown table when no suppliers or destinations', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = body.querySelectorAll('table')

        expect(tables).toHaveLength(1)
      })

      it('should not display last upload when null', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const inset = body.querySelector('.govuk-inset-text')

        expect(inset).toBeNull()
      })

      it('should not display correction text when no upload exists', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const uploadLink = body.querySelector('a[href*="summary-logs/upload"]')

        expect(uploadLink).toBeNull()
      })
    })

    describe('for accredited reprocessor with data', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedReprocessorRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(
          accreditedReprocessorReportDetail
        )
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: accreditedDetailUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display monthly period heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /February 2026/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('should display accreditation in details', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Accreditation:')
        expect(body.textContent).toContain('ER992415095748M')
      })

      it('should display site details', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('North Road')
      })

      it('should display supplier details table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = getAllByRole(body, 'table')
        const supplierTable = tables[0]

        expect(supplierTable.textContent).toContain('Grantham Waste')
        expect(supplierTable.textContent).toContain('Baler')
        expect(supplierTable.textContent).toContain('42.21')
      })
    })

    describe('for registered-only exporter with data', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          exporterRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(exporterReportDetail)
      })

      it('should display quarterly period heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Quarter 1, 2026/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('should not display details section', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(
          queryByRole(body, 'heading', {
            name: /Details/,
            level: 2
          })
        ).toBeNull()
      })

      it('should display waste received for export heading', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Packaging waste received for export/,
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display waste exported heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Packaging waste exported for recycling/,
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display total tonnage exported', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('11.47')
      })

      it('should display overseas sites in table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = getAllByRole(body, 'table')
        const overseasTable = tables[1]

        expect(overseasTable.textContent).toContain('EuroPlast Recycling GmbH')
        expect(overseasTable.textContent).toContain('RecyclePlast SA')
      })
    })

    describe('for registered-only exporter with no data', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          exporterRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(
          emptyExporterReportDetail
        )
      })

      it('should display zero tonnage for all sections', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('0')
      })

      it('should not display supplier or overseas site tables when empty', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = body.querySelectorAll('table')

        expect(tables).toHaveLength(1)
      })
    })

    describe('for accredited exporter with data', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedExporterRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(
          accreditedExporterReportDetail
        )
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: accreditedExporterDetailUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display monthly period heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedExporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /February 2026/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('should display accreditation in details', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedExporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Accreditation:')
        expect(body.textContent).toContain('EE992415095748M')
      })

      it('should not display site in details', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedExporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).not.toContain('Site:')
      })

      it('should not display supplier details table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedExporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(
          queryByRole(body, 'heading', {
            name: /Supplier details/,
            level: 3
          })
        ).toBeNull()
      })

      it('should display overseas site OSR IDs in table', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedExporterDetailUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tables = getAllByRole(body, 'table')
        const overseasTable = tables[0]

        expect(overseasTable.textContent).toContain('001')
        expect(overseasTable.textContent).toContain('096')
      })
    })

    describe('error handling', () => {
      it('should return 404 when registration not found', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockRejectedValue(
          Boom.notFound('Registration not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: detailUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 400 for non-numeric year', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/org-123/registrations/reg-001/reports/invalid/monthly/1',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid cadence', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/org-123/registrations/reg-001/reports/2026/biweekly/1',
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
        url: detailUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
