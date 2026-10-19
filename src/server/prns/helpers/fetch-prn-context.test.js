import { getRequiredRegistrationWithAccreditationByNumber } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import {
  asPackagingRecyclingNote,
  asRegistrationWithLiveAccreditation
} from '#server/common/test-helpers/prn-fixtures.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'
import {
  fetchPrnContext,
  fetchPrnForUpdate,
  getSafePathSegment,
  toAccreditationKeys
} from './fetch-prn-context.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PrnDetailParams } from './session-types.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('./fetch-packaging-recycling-note.js'))

const keys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL',
  year: '2026'
}
const basePath =
  '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes'
const credentials = buildMockAuth().credentials
const prn = asPackagingRecyclingNote({ id: 'prn-1', status: 'draft' })
const registrationData = asRegistrationWithLiveAccreditation({
  organisationData: { id: 'org-1' },
  registration: { id: 'reg-1' },
  accreditation: { id: 'acc-1' },
  rawAccreditation: { id: 'acc-1' }
})

/**
 * @param {string} prnId
 * @returns {HapiRequest & { params: PrnDetailParams }}
 */
const requestFor = (prnId) =>
  /** @type {HapiRequest & { params: PrnDetailParams }} */ (
    /** @type {unknown} */ ({
      params: { ...keys, prnId },
      auth: { credentials }
    })
  )

describe(toAccreditationKeys, () => {
  it('takes the accreditation keys from the route params', () => {
    expect(toAccreditationKeys(requestFor('prn-1').params)).toStrictEqual(keys)
  })
})

describe(fetchPrnContext, () => {
  beforeEach(() => {
    vi.mocked(
      getRequiredRegistrationWithAccreditationByNumber
    ).mockResolvedValue(registrationData)
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(prn)
  })

  it('fetches the registration and the note by natural keys', async () => {
    const context = await fetchPrnContext(requestFor('prn-1'))

    expect(context).toStrictEqual({
      keys,
      ...registrationData,
      prn,
      basePath,
      prnId: 'prn-1'
    })
    expect(
      getRequiredRegistrationWithAccreditationByNumber
    ).toHaveBeenCalledWith(keys, credentials)
    expect(fetchPackagingRecyclingNote).toHaveBeenCalledWith(
      keys,
      'prn-1',
      credentials.backendToken
    )
  })

  it('rejects an unsafe note id', async () => {
    await expect(fetchPrnContext(requestFor('../prn-1'))).rejects.toThrow(
      'Invalid prnId'
    )
  })
})

describe(fetchPrnForUpdate, () => {
  beforeEach(() => {
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(prn)
  })

  it('fetches the note by natural keys', async () => {
    const context = await fetchPrnForUpdate(requestFor('prn-1'))

    expect(context).toStrictEqual({
      keys,
      prnId: 'prn-1',
      basePath,
      prn,
      backendToken: credentials.backendToken
    })
  })
})

describe(getSafePathSegment, () => {
  it('returns value for safe path segments', () => {
    expect(getSafePathSegment('prn-123', 'prnId')).toBe('prn-123')
    expect(getSafePathSegment('acc.789~test', 'prnId')).toBe('acc.789~test')
  })

  it.each([
    ['', 'prnId'],
    ['../path', 'prnId'],
    ['path/with/slash', 'prnId'],
    ['path\\with\\backslash', 'prnId'],
    ['path with spaces', 'prnId']
  ])('throws for invalid segment: %s', (value, fieldName) => {
    expect(() => getSafePathSegment(value, fieldName)).toThrow('Invalid')
  })
})
