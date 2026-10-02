import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchPrnListDetails } from './fetch-prn-list-details.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { PrnListDetails } from './fetch-prn-list-details.js'
 */

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

describe(fetchPrnListDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'token'

  const organisation = /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      companyDetails: { name: 'Kirkby Plastics Ltd' }
    })
  )

  const registration = /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      wasteProcessingType: 'reprocessor'
    })
  )

  const accreditation = {
    id: accreditationId,
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved'
  }

  /** @type {PrnListDetails['packagingRecyclingNotes']} */
  const notes = [
    {
      id: 'prn-001',
      prnNumber: '240000123',
      issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
      tonnage: 20,
      material: 'plastic',
      status: 'accepted',
      createdAt: '2026-01-27T09:00:00.000Z',
      issuedAt: '2026-01-28T09:00:00.000Z',
      wasteProcessingType: 'reprocessor',
      processToBeUsed: '',
      isDecemberWaste: false
    }
  ]

  const isNotesPath = (/** @type {string} */ path) =>
    path.endsWith('/packaging-recycling-notes')

  const fetchDetails = () =>
    fetchPrnListDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    vi.mocked(fetchJsonFromBackend).mockImplementation((path) =>
      isNotesPath(path)
        ? Promise.resolve(notes)
        : Promise.resolve(accreditation)
    )
  })

  it('reads the three things the page shows, and nothing else', async () => {
    const result = await fetchDetails()

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      packagingRecyclingNotes: notes
    })

    // The waste balance, the reporting calendar and the ledger belong to the
    // page above this one; asking for them here would be three reads spent on
    // nothing this page draws.
    expect(fetchJsonFromBackend).toHaveBeenCalledTimes(2)
  })

  it('reads the accreditation and its notes from the paths the backend serves', async () => {
    await fetchDetails()

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`,
      { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`,
      expect.anything()
    )
  })

  it('encodes ids that carry characters an address would otherwise read', async () => {
    await fetchPrnListDetails({
      organisationId: 'org/123',
      registrationId: 'reg 456',
      accreditationId: 'acc?789',
      backendToken
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%20456/accreditations/acc%3F789',
      expect.anything()
    )
  })

  it('fails the page where the notes could not be read', async () => {
    vi.mocked(fetchJsonFromBackend).mockImplementation((path) =>
      isNotesPath(path)
        ? Promise.reject(new Error('nope'))
        : Promise.resolve(accreditation)
    )

    // Unlike the summary section on the accreditation page, the notes are the
    // whole of this page, so there is nothing left to render without them.
    await expect(fetchDetails()).rejects.toThrow('nope')
  })
})
