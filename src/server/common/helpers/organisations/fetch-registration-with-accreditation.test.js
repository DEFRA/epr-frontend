/** @import { RegistrationView } from './organisation-view.js'; */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildAccreditationView,
  buildOrganisationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'

import { fetchRegistration } from './fetch-registration.js'
import {
  fetchRegistrationWithAccreditation,
  fetchRequiredAccreditation,
  fetchRequiredAnyAccreditation
} from './fetch-registration-with-accreditation.js'

vi.mock(import('./fetch-registration.js'))

const backendToken = 'test-token'
const registrationKeys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL'
}

/** @param {RegistrationView} registration */
const resolveRegistration = (registration) => {
  const organisation = buildOrganisationView({
    registrations: { [registrationKeys.registrationNumber]: registration }
  })
  vi.mocked(fetchRegistration).mockResolvedValue({ organisation, registration })
  return organisation
}

describe(fetchRegistrationWithAccreditation, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the registration with its live 2026 accreditation', async () => {
    const registration = buildRegistrationView()
    const organisation = resolveRegistration(registration)

    const result = await fetchRegistrationWithAccreditation(
      registrationKeys,
      backendToken
    )

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation: registration.accreditations['2026']
    })
    expect(fetchRegistration).toHaveBeenCalledWith({
      ...registrationKeys,
      backendToken
    })
  })

  it('reads 2026 even when another year is accredited', async () => {
    resolveRegistration(
      buildRegistrationView({
        accreditations: {
          2027: buildAccreditationView({ accreditationNumber: 'A27' })
        }
      })
    )

    const { accreditation } = await fetchRegistrationWithAccreditation(
      registrationKeys,
      backendToken
    )

    expect(accreditation).toBeUndefined()
  })

  it('leaves out a 2026 accreditation that is not live', async () => {
    resolveRegistration(
      buildRegistrationView({
        accreditations: {
          2026: buildAccreditationView({
            status: { current: 'cancelled', timeline: {} }
          })
        }
      })
    )

    const { accreditation } = await fetchRegistrationWithAccreditation(
      registrationKeys,
      backendToken
    )

    expect(accreditation).toBeUndefined()
  })
})

describe(fetchRequiredAccreditation, () => {
  const keys = { ...registrationKeys, year: '2026' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the registration and its live accreditation for the year', async () => {
    const registration = buildRegistrationView()
    const organisation = resolveRegistration(registration)

    const result = await fetchRequiredAccreditation(keys, backendToken)

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation: registration.accreditations['2026']
    })
    expect(fetchRegistration).toHaveBeenCalledWith({
      ...registrationKeys,
      backendToken
    })
  })

  it('throws 404 when the accreditation for the year is not live', async () => {
    resolveRegistration(
      buildRegistrationView({
        accreditations: {
          2026: buildAccreditationView({
            status: { current: 'suspended', timeline: {} }
          }),
          2027: buildAccreditationView({
            status: { current: 'created', timeline: {} }
          })
        }
      })
    )

    await expect(
      fetchRequiredAccreditation({ ...keys, year: '2027' }, backendToken)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: 'not_accredited',
      event: {
        action: 'check_accreditation',
        reason: 'registrationNumber=R26EN0000000001PL year=2027'
      }
    })
  })

  it('throws 404 when there is no accreditation for the year', async () => {
    resolveRegistration(buildRegistrationView())

    await expect(
      fetchRequiredAccreditation({ ...keys, year: '2025' }, backendToken)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: 'not_accredited'
    })
  })
})

describe(fetchRequiredAnyAccreditation, () => {
  const keys = { ...registrationKeys, year: '2026' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a cancelled accreditation for the year', async () => {
    const registration = buildRegistrationView({
      accreditations: {
        2026: buildAccreditationView({
          status: { current: 'cancelled', timeline: {} }
        })
      }
    })
    const organisation = resolveRegistration(registration)

    const result = await fetchRequiredAnyAccreditation(keys, backendToken)

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation: registration.accreditations['2026']
    })
    expect(fetchRegistration).toHaveBeenCalledWith({
      ...registrationKeys,
      backendToken
    })
  })

  it('throws 404 when there is no accreditation for the year', async () => {
    resolveRegistration(buildRegistrationView())

    await expect(
      fetchRequiredAnyAccreditation({ ...keys, year: '2025' }, backendToken)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: 'not_accredited',
      event: {
        action: 'check_accreditation',
        reason: 'registrationNumber=R26EN0000000001PL year=2025'
      }
    })
  })
})
