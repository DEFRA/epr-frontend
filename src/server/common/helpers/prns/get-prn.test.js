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

  it('returns PRN data when found', async () => {
    const apiPrn = { id: 'prn-001', status: 'awaiting_authorisation' }

    vi.mocked(fetchPrn).mockResolvedValue(apiPrn)

    const result = await getPrn('org-123', 'acc-456', 'prn-001', mockLogger)

    expect(result).toStrictEqual(apiPrn)
    expect(fetchPrn).toHaveBeenCalledWith('org-123', 'acc-456', 'prn-001')
  })

  it('returns null when PRN is not found', async () => {
    vi.mocked(fetchPrn).mockResolvedValue(null)

    const result = await getPrn('org-123', 'acc-456', 'NONEXISTENT', mockLogger)

    expect(result).toBeNull()
  })

  it('returns null and logs warning when fetch fails', async () => {
    vi.mocked(fetchPrn).mockRejectedValue(new Error('Network error'))

    const result = await getPrn('org-123', 'acc-456', 'prn-001', mockLogger)

    expect(result).toBeNull()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      'Failed to fetch PRN prn-001'
    )
  })
})
