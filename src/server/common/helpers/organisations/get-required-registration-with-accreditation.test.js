import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRegistrationAndAccreditationByNumber } from './fetch-registration-and-accreditation.js'
import { getRequiredRegistrationWithAccreditationByNumber } from './get-required-registration-with-accreditation.js'

vi.mock(import('./fetch-registration-and-accreditation.js'))

describe('#getRequiredRegistrationWithAccreditationByNumber', () => {
  const credentials = buildMockAuth().credentials
  const keys = {
    organisationNumber: '500123',
    registrationNumber: 'R26EN0000000001PL',
    year: '2026'
  }
  const registration = {
    id: 'reg-001',
    registrationNumber: 'R26EN0000000001PL'
  }
  const accreditation = {
    id: 'acc-001',
    status: 'approved',
    validFrom: '2026-01-01'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the registration and its live accreditation for the year', async () => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      asRegistrationWithAccreditation({
        organisationData: { id: 'org-123' },
        registration,
        accreditation
      })
    )

    const result = await getRequiredRegistrationWithAccreditationByNumber(
      keys,
      credentials
    )

    expect(result).toStrictEqual({
      registration,
      accreditation,
      rawAccreditation: accreditation,
      organisationData: { id: 'org-123' }
    })
    expect(fetchRegistrationAndAccreditationByNumber).toHaveBeenCalledWith(
      '500123',
      'R26EN0000000001PL',
      credentials
    )
  })

  it('throws 404 when there is no live accreditation', async () => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      asRegistrationWithAccreditation({
        organisationData: { id: 'org-123' },
        registration,
        accreditation: undefined
      })
    )

    await expect(
      getRequiredRegistrationWithAccreditationByNumber(keys, credentials)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: 'not_accredited',
      event: {
        action: 'check_accreditation',
        reason: 'registrationNumber=R26EN0000000001PL year=2026'
      }
    })
  })

  it('throws 404 when the live accreditation is for another year', async () => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      asRegistrationWithAccreditation({
        organisationData: { id: 'org-123' },
        registration,
        accreditation: { ...accreditation, validFrom: '2025-01-01' }
      })
    )

    await expect(
      getRequiredRegistrationWithAccreditationByNumber(keys, credentials)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: 'not_accredited'
    })
  })
})
