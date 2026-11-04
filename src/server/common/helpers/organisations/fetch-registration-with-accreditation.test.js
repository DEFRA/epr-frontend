/** @import { RegistrationView } from './organisation-view.js'; */
import { toYear } from '#server/common/helpers/year.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
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

const backendToken = toBackendToken('test-token')
const registrationKeys = {
  organisationNumber: toOrganisationNumber('500123'),
  registrationNumber: toRegistrationNumber('R26EN0000000001PL')
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
          2027: buildAccreditationView({
            accreditationNumber: toAccreditationNumber('A27')
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

  it('leaves out a 2026 accreditation that is not live', async () => {
    resolveRegistration(
      buildRegistrationView({
        accreditations: {
          2026: buildAccreditationView({
            status: { current: 'cancelled', timeline: [] }
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

  it('reads the live accreditation for the year', async () => {
    const registration = buildRegistrationView({
      accreditations: {
        2026: buildAccreditationView({
          accreditationNumber: toAccreditationNumber('A26')
        }),
        2027: buildAccreditationView({
          accreditationNumber: toAccreditationNumber('A27')
        })
      }
    })
    resolveRegistration(registration)

    const { accreditation } = await fetchRegistrationWithAccreditation(
      { ...registrationKeys, year: toYear(2027) },
      backendToken
    )

    expect(accreditation).toBe(registration.accreditations['2027'])
    expect(fetchRegistration).toHaveBeenCalledWith({
      ...registrationKeys,
      backendToken
    })
  })

  it('leaves out the accreditation for a year that is not live', async () => {
    resolveRegistration(
      buildRegistrationView({
        accreditations: {
          2026: buildAccreditationView(),
          2027: buildAccreditationView({
            status: { current: 'created', timeline: [] }
          })
        }
      })
    )

    const { accreditation } = await fetchRegistrationWithAccreditation(
      { ...registrationKeys, year: toYear(2027) },
      backendToken
    )

    expect(accreditation).toBeUndefined()
  })
})

describe(fetchRequiredAccreditation, () => {
  const keys = { ...registrationKeys, year: toYear(2026) }

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
            status: { current: 'suspended', timeline: [] }
          }),
          2027: buildAccreditationView({
            status: { current: 'created', timeline: [] }
          })
        }
      })
    )

    await expect(
      fetchRequiredAccreditation({ ...keys, year: toYear(2027) }, backendToken)
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
      fetchRequiredAccreditation({ ...keys, year: toYear(2025) }, backendToken)
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      code: 'not_accredited'
    })
  })
})

describe(fetchRequiredAnyAccreditation, () => {
  const keys = { ...registrationKeys, year: toYear(2026) }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a cancelled accreditation for the year', async () => {
    const registration = buildRegistrationView({
      accreditations: {
        2026: buildAccreditationView({
          status: { current: 'cancelled', timeline: [] }
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
      fetchRequiredAnyAccreditation(
        { ...keys, year: toYear(2025) },
        backendToken
      )
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
