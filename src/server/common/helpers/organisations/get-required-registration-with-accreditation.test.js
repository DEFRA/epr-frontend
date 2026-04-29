import Boom from '@hapi/boom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'
import { getRequiredRegistrationWithAccreditation } from './get-required-registration-with-accreditation.js'

vi.mock(import('./fetch-registration-and-accreditation.js'))

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

    const result = await getRequiredRegistrationWithAccreditation({
      organisationId: 'org-123',
      registrationId: 'reg-001',
      idToken: 'mock-token',
      accreditationId: 'acc-001'
    })

    expect(result).toStrictEqual({
      registration,
      accreditation,
      organisationData: { id: 'org-123' }
    })
  })

  it('should throw 404 when registration is not found', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockRejectedValue(
      Boom.notFound('Registration not found')
    )

    await expect(
      getRequiredRegistrationWithAccreditation({
        organisationId: 'org-123',
        registrationId: 'reg-nonexistent',
        idToken: 'mock-token'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('should throw an enriched 404 when accreditation is not found', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: undefined
    })

    await expect(
      getRequiredRegistrationWithAccreditation({
        organisationId: 'org-123',
        registrationId: 'reg-001',
        idToken: 'mock-token'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 },
      message: 'Not accredited for this registration',
      code: 'not_accredited',
      event: {
        action: 'check_accreditation',
        reason: 'registrationId=reg-001'
      }
    })
  })

  it('should return when accreditationId is provided and matches', async () => {
    const registration = { id: 'reg-001' }
    const accreditation = { id: 'acc-001', status: 'approved' }

    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration,
      accreditation
    })

    const result = await getRequiredRegistrationWithAccreditation({
      organisationId: 'org-123',
      registrationId: 'reg-001',
      idToken: 'mock-token',
      accreditationId: 'acc-001'
    })

    expect(result).toStrictEqual({
      registration,
      accreditation,
      organisationData: { id: 'org-123' }
    })
  })

  it('should throw an enriched 404 when accreditationId does not match', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: { id: 'acc-001', status: 'approved' }
    })

    await expect(
      getRequiredRegistrationWithAccreditation({
        organisationId: 'org-123',
        registrationId: 'reg-001',
        idToken: 'mock-token',
        accreditationId: 'acc-wrong'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 },
      message: 'Accreditation ID mismatch',
      code: 'accreditation_id_mismatch',
      event: {
        action: 'check_accreditation',
        reason: 'registrationId=reg-001 accreditationId=acc-wrong'
      }
    })
  })

  it('should pass correct parameters to fetchRegistrationAndAccreditation', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: { id: 'acc-001' }
    })

    await getRequiredRegistrationWithAccreditation({
      organisationId: 'org-123',
      registrationId: 'reg-001',
      idToken: 'mock-token',
      accreditationId: 'acc-001'
    })

    expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
      'org-123',
      'reg-001',
      'mock-token'
    )
  })
})
