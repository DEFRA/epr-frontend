import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPrns } from './get-prns.js'
import { fetchPrns } from './fetch-prns.js'

vi.mock(import('./fetch-prns.js'))

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

describe('#getPrns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns API response items when available', async () => {
    const apiPrns = [
      { id: 'api-prn-1', prnNumber: 'PRN-001' },
      { id: 'api-prn-2', prnNumber: 'PRN-002' }
    ]
    vi.mocked(fetchPrns).mockResolvedValue({ items: apiPrns, hasMore: false })

    const result = await getPrns('org-123', 'acc-456', 'token', mockLogger)

    expect(result).toStrictEqual(apiPrns)
    expect(fetchPrns).toHaveBeenCalledWith('org-123', 'acc-456', 'token')
  })

  it('returns empty array when API returns empty items', async () => {
    vi.mocked(fetchPrns).mockResolvedValue({ items: [], hasMore: false })

    const result = await getPrns('org-123', 'acc-456', 'token', mockLogger)

    expect(result).toStrictEqual([])
  })

  it('returns empty array when API returns null items', async () => {
    vi.mocked(fetchPrns).mockResolvedValue({ items: null, hasMore: false })

    const result = await getPrns('org-123', 'acc-456', 'token', mockLogger)

    expect(result).toStrictEqual([])
  })

  it('returns empty array and logs warning when API call fails', async () => {
    vi.mocked(fetchPrns).mockRejectedValue(new Error('Network error'))

    const result = await getPrns('org-123', 'acc-456', 'token', mockLogger)

    expect(result).toStrictEqual([])
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      'Failed to fetch PRNs'
    )
  })
})
