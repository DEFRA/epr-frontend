import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchReportDetail } from './fetch-report-detail.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(fetchReportDetail, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const year = 2026
  const period = 1
  const idToken = 'test-token'

  const mockResponse = {
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
    sections: {
      wasteReceived: {
        totalTonnage: 80.25,
        suppliers: [
          { supplierName: 'Grantham Waste', role: 'Baler', tonnage: 42.21 }
        ]
      },
      wasteSentOn: {
        totalTonnage: 1.0,
        toReprocessors: 1.0,
        toExporters: 0.0,
        toOtherSites: 0.0,
        destinations: [
          {
            recipientName: 'Lincoln recycling',
            role: 'Reprocessor',
            tonnage: 1.0
          }
        ]
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and options', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      period,
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/1',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token'
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await fetchReportDetail('org/123', 'reg&456', year, period, idToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/2026/1',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      period,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      fetchReportDetail(organisationId, registrationId, year, period, idToken)
    ).rejects.toThrowError('Network error')
  })
})
