import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchAccreditationDetails } from './fetch-accreditation-details.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))
vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn()
  })
)

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

describe(fetchAccreditationDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'test-token'

  const organisation = { id: organisationId, companyDetails: {} }
  const registration = { id: registrationId, registrationNumber: 'R123' }
  const accreditation = { id: accreditationId, accreditationNumber: 'A123' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(accreditation)
  })

  it('reads the accreditation from the path the backend serves it at', async () => {
    await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    await fetchAccreditationDetails({
      organisationId: 'org/123',
      registrationId: 'reg&456',
      accreditationId: 'acc?789',
      backendToken
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/accreditations/acc%3F789',
      expect.any(Object)
    )
  })

  it('reads the organisation and the registration alongside the accreditation', async () => {
    await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

    expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      backendToken
    )
  })

  it('combines the organisation, the registration and the accreditation', async () => {
    const result = await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation
    })
  })
})
