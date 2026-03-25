import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { createReport } from '#server/reports/helpers/create-report.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('#server/reports/helpers/create-report.js'))

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

const reportDetail = {
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
      address: { line1: 'North Road', town: 'Manchester', postcode: 'M1 1AA' }
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

const detailUrl =
  '/organisations/org-123/registrations/reg-001/reports/2026/quarterly/1'

describe('#createReportController', () => {
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

    describe('successful report creation', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          reprocessorRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
        vi.mocked(createReport).mockResolvedValue({
          id: 'report-001',
          status: 'in_progress'
        })
      })

      it('should call createReport with correct params for quarterly', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, detailUrl, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url: detailUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb }
        })

        expect(createReport).toHaveBeenCalledWith(
          'org-123',
          'reg-001',
          2026,
          'quarterly',
          1,
          'mock-id-token'
        )
      })

      it('should redirect to reports list page', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, detailUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: detailUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          '/organisations/org-123/registrations/reg-001/reports'
        )
      })
    })

    describe('when backend returns 409 conflict', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          reprocessorRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
        vi.mocked(createReport).mockRejectedValue(
          Boom.conflict('Report already exists for this period')
        )
      })

      it('should return 409', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, detailUrl, {
          auth: mockAuth
        })

        const { statusCode } = await server.inject({
          method: 'POST',
          url: detailUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.conflict)
      })
    })

    describe('CSRF protection', () => {
      it('should return 403 when crumb is missing', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url: detailUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.forbidden)
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
        method: 'POST',
        url: detailUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
