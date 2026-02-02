import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPrn } from './get-prn.js'
import { fetchPrn } from './fetch-prn.js'

vi.mock(import('./fetch-prn.js'))

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

describe('#getPrn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns API response items when available', async () => {
    const apiPrn = { id: 'api-prn-1', prnNumber: 'prn-789' }

    vi.mocked(fetchPrn).mockResolvedValue(apiPrn)

    const result = await getPrn('org-123', 'acc-456', 'prn-789', mockLogger)

    expect(result).toStrictEqual(apiPrn)
    expect(fetchPrn).toHaveBeenCalledWith('org-123', 'acc-456', 'prn-789')
  })

  it('returns null when API returns empty items', async () => {
    vi.mocked(fetchPrn).mockResolvedValue(null)

    const result = await getPrn('org-123', 'acc-456', 'prn-789', mockLogger)

    expect(result).toBeNull()
  })

  it('returns empty array and logs warning when API call fails', async () => {
    vi.mocked(fetchPrn).mockRejectedValue(new Error('Network error'))

    const result = await getPrn('org-123', 'acc-456', 'prn-789', mockLogger)

    expect(result).toBeNull()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      'Failed to fetch PRN prn-789'
    )
  })
})
