import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchAccreditationDetails } from './fetch-accreditation-details.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 */

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))
vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn()
  })
)
vi.mock(
  import('#server/common/helpers/waste-balance/get-waste-balance.js'),
  () => ({
    getWasteBalance: vi.fn()
  })
)

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
const { getWasteBalance } =
  await import('#server/common/helpers/waste-balance/get-waste-balance.js')

describe(fetchAccreditationDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'test-token'
  const logger = /** @type {TypedLogger} */ (
    /** @type {unknown} */ ({ error: vi.fn() })
  )

  const organisation = /** @type {Organisation} */ (
    /** @type {unknown} */ ({ id: organisationId, companyDetails: {} })
  )
  const registration = /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R123'
    })
  )
  const accreditation = { id: accreditationId, accreditationNumber: 'A123' }
  const wasteBalance = { amount: 120.5, availableAmount: 80.25 }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(accreditation)
    vi.mocked(getWasteBalance).mockResolvedValue(wasteBalance)
  })

  it('reads the accreditation from the path the backend serves it at', async () => {
    await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken,
      logger
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
      backendToken,
      logger
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
      backendToken,
      logger
    })

    expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      backendToken
    )
  })

  it('reads the waste balance the accreditation holds', async () => {
    await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken,
      logger
    })

    expect(getWasteBalance).toHaveBeenCalledWith(
      organisationId,
      accreditationId,
      backendToken,
      logger
    )
  })

  it('combines the organisation, the registration, the accreditation and its balance', async () => {
    const result = await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken,
      logger
    })

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      wasteBalance
    })
  })

  it('reports a balance it could not read as absent rather than failing the page', async () => {
    vi.mocked(getWasteBalance).mockResolvedValue(null)

    const result = await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken,
      logger
    })

    expect(result.wasteBalance).toBeNull()
    expect(result.accreditation).toStrictEqual(accreditation)
  })
})
