import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRequiredRegistrationWithAccreditation } from './get-required-registration-with-accreditation.js'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

vi.mock(import('./fetch-registration-and-accreditation.js'))

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

describe('#getRequiredRegistrationWithAccreditation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return registration and accreditation when both exist', async () => {
    const registration = {
      id: 'reg-001',
      wasteProcessingType: 'reprocessor-input'
    }
    const accreditation = { id: 'acc-001', status: 'approved' }

    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration,
      accreditation
    })

    const result = await getRequiredRegistrationWithAccreditation(
      'org-123',
      'reg-001',
      'mock-token',
      mockLogger
    )

    expect(result).toStrictEqual({
      registration,
      accreditation,
      organisationData: { id: 'org-123' }
    })
  })

  it('should throw 404 when registration is not found', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: undefined,
      accreditation: undefined
    })

    await expect(
      getRequiredRegistrationWithAccreditation(
        'org-123',
        'reg-nonexistent',
        'mock-token',
        mockLogger
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { registrationId: 'reg-nonexistent' },
      'Registration not found'
    )
  })

  it('should throw 404 when accreditation is not found', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: undefined
    })

    await expect(
      getRequiredRegistrationWithAccreditation(
        'org-123',
        'reg-001',
        'mock-token',
        mockLogger
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { registrationId: 'reg-001' },
      'Not accredited for this registration'
    )
  })

  it('should pass correct parameters to fetchRegistrationAndAccreditation', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: { id: 'acc-001' }
    })

    await getRequiredRegistrationWithAccreditation(
      'org-123',
      'reg-001',
      'mock-token',
      mockLogger
    )

    expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
      'org-123',
      'reg-001',
      'mock-token'
    )
  })
})
