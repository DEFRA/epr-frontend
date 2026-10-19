import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRequiredAnyAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { buildRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-view-fixtures.js'
import { fetchPackagingRecyclingNotes } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'

import { fetchPrnListDetails } from './fetch-prn-list-details.js'

/**
 * @import { PrnListDetails } from './fetch-prn-list-details.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-with-accreditation.js')
)
vi.mock(import('#server/prns/helpers/fetch-packaging-recycling-notes.js'))

describe(fetchPrnListDetails, () => {
  const keys = {
    organisationNumber: '500118',
    registrationNumber: 'R26ER5001180041PL',
    year: '2026'
  }
  const backendToken = 'token'
  const credentials = buildMockAuth({ backendToken }).credentials

  const { organisation, registration, accreditation } =
    buildRegistrationWithAccreditation({
      organisation: { name: 'Kirkby Plastics Ltd' },
      registrationNumber: keys.registrationNumber
    })

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
      notes: null,
      isDecemberWaste: false,
      wasteProcessingType: 'reprocessor',
      processToBeUsed: '',
      accreditationYear: 2026,
      issuedAt: '2026-01-28T09:00:00.000Z',
      issuedBy: null
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRequiredAnyAccreditation).mockResolvedValue({
      organisation,
      registration,
      accreditation
    })
    vi.mocked(fetchPackagingRecyclingNotes).mockResolvedValue(notes)
  })

  it('reads the records and the notes by the numbers and year', async () => {
    const result = await fetchPrnListDetails({ keys, credentials })

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      packagingRecyclingNotes: notes
    })
    expect(fetchRequiredAnyAccreditation).toHaveBeenCalledWith(
      keys,
      backendToken
    )
    expect(fetchPackagingRecyclingNotes).toHaveBeenCalledWith(
      keys,
      backendToken
    )
  })

  it('fails the page where the notes could not be read', async () => {
    vi.mocked(fetchPackagingRecyclingNotes).mockRejectedValue(new Error('nope'))

    // Unlike the summary section on the accreditation page, the notes are the
    // whole of this page, so there is nothing left to render without them.
    await expect(fetchPrnListDetails({ keys, credentials })).rejects.toThrow(
      'nope'
    )
  })
})
