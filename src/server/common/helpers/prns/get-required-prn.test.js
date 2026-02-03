import Boom from '@hapi/boom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRequiredPrn } from './get-required-prn.js'
import { getPrn } from './get-prn.js'

vi.mock(import('./get-prn.js'))

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

describe('#getRequiredPrn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns PRN data when found', async () => {
    const prnData = {
      id: 'prn-001',
      status: 'awaiting_authorisation'
    }

    vi.mocked(getPrn).mockResolvedValue(prnData)

    const result = await getRequiredPrn(
      'org-123',
      'acc-456',
      'prn-001',
      mockLogger
    )

    expect(result).toStrictEqual(prnData)
    expect(getPrn).toHaveBeenCalledWith(
      'org-123',
      'acc-456',
      'prn-001',
      mockLogger
    )
  })

  it('throws 404 when PRN is not found', async () => {
    vi.mocked(getPrn).mockResolvedValue(null)

    await expect(
      getRequiredPrn('org-123', 'acc-456', 'NONEXISTENT', mockLogger)
    ).rejects.toThrowError(Boom.notFound('PRN NONEXISTENT not found'))

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { prnId: 'NONEXISTENT' },
      'PRN NONEXISTENT not found'
    )
  })

  it('propagates errors from getPrn', async () => {
    vi.mocked(getPrn).mockRejectedValue(new Error('Unexpected error'))

    await expect(
      getRequiredPrn('org-123', 'acc-456', 'prn-001', mockLogger)
    ).rejects.toThrowError('Unexpected error')
  })
})
