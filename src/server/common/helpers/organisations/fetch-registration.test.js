import Boom from '@hapi/boom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'

import { fetchOrganisation } from './fetch-organisation.js'
import { fetchRegistration } from './fetch-registration.js'

/**
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

vi.mock(import('./fetch-organisation.js'))

const registrationNumber = 'R26ER5001180041PL'
const backendToken = 'test-token'

const registration = /** @type {RegistrationView} */ (
  /** @type {unknown} */ ({ statusTimeline: {}, accreditations: {} })
)

/** @type {OrganisationView} */
const organisation = {
  organisationNumber: 500118,
  name: 'Kirkby Plastics Ltd',
  registrations: { [registrationNumber]: registration }
}

const params = {
  organisationNumber: '500118',
  registrationNumber,
  backendToken
}

const notFoundForThisRegistration = {
  output: { statusCode: statusCodes.notFound },
  code: errorCodes.registrationNotFound,
  event: {
    action: 'fetch_registration',
    reason: `organisationNumber=500118 registrationNumber=${registrationNumber}`
  }
}

describe(fetchRegistration, () => {
  beforeEach(() => {
    vi.mocked(fetchOrganisation).mockResolvedValue(organisation)
  })

  it('returns the organisation and its registration with that number', async () => {
    await expect(fetchRegistration(params)).resolves.toStrictEqual({
      organisation,
      registration
    })
  })

  it('reads the organisation by its number as the token bearer', async () => {
    await fetchRegistration(params)

    expect(fetchOrganisation).toHaveBeenCalledWith(500118, backendToken)
  })

  it('is a registration not found for a number the organisation does not hold', async () => {
    await expect(
      fetchRegistration({ ...params, registrationNumber: 'toString' })
    ).rejects.toMatchObject({
      ...notFoundForThisRegistration,
      event: {
        action: 'fetch_registration',
        reason: 'organisationNumber=500118 registrationNumber=toString'
      }
    })
  })

  it('is a registration not found for an organisation the backend does not know', async () => {
    vi.mocked(fetchOrganisation).mockRejectedValue(Boom.notFound())

    await expect(fetchRegistration(params)).rejects.toMatchObject(
      notFoundForThisRegistration
    )
  })

  it('lets any other failure reading the organisation surface', async () => {
    const failure = Boom.internal('organisation unavailable')
    vi.mocked(fetchOrganisation).mockRejectedValue(failure)

    await expect(fetchRegistration(params)).rejects.toBe(failure)
  })
})
