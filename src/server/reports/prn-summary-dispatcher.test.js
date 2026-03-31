import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/update-report.js'))

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
  accreditation: {
    id: 'acc-001',
    accreditationNumber: 'ER992415095748M'
  }
}

const reprocessorRegistration = {
  ...exporterRegistration,
  registration: {
    ...exporterRegistration.registration,
    wasteProcessingType: 'reprocessor'
  }
}

const reportDetail = {
  id: 'report-001',
  version: 1,
  status: 'in_progress',
  prn: {
    issuedTonnage: 91,
    totalRevenue: null,
    freeTonnage: null
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/prn-summary`

describe('#prnSummaryDispatcher', () => {
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

    it('should dispatch to exporter controller for exporter registration', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        exporterRegistration
      )
      vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('PERNs issued')
    })

    it('should dispatch to reprocessor controller for reprocessor registration', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        reprocessorRegistration
      )
      vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('PRNs issued')
    })
  })
})
