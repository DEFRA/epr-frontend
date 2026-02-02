import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPrns } from './fetch-prns.js'
import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'))

describe('#fetchPrns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls backend with correct path and options', async () => {
    const mockResponse = { items: [], hasMore: false }
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await fetchPrns('org-123', 'acc-456', 'test-token')

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/accreditations/acc-456/prns',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token'
        }
      }
    )
  })

  it('returns response from backend', async () => {
    const mockResponse = {
      items: [{ id: 'prn-1', prnNumber: 'ER2625468U' }],
      hasMore: true
    }
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await fetchPrns('org-123', 'acc-456', 'test-token')

    expect(result).toStrictEqual(mockResponse)
  })
})
