import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchRegistration } from './fetch-registration.js'

/**
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

const backendUrl = config.get('eprBackendUrl')

const registrationNumber = 'R26ER5001180041PL'
const backendToken = 'test-token'

const organisationUrl = `${backendUrl}/organisations/500118`

/** @type {RegistrationView} */
const registration = {
  status: 'approved',
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  statusTimeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } },
  accreditations: {},
  wasteProcessingType: 'exporter'
}

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
  test('returns the organisation and its registration with that number', async ({
    msw
  }) => {
    msw.use(http.get(organisationUrl, () => HttpResponse.json(organisation)))

    await expect(fetchRegistration(params)).resolves.toStrictEqual({
      organisation,
      registration
    })
  })

  test('reads the organisation as the token bearer', async ({ msw }) => {
    /** @type {string | null} */
    let authorisation = null

    msw.use(
      http.get(organisationUrl, ({ request }) => {
        authorisation = request.headers.get('authorization')
        return HttpResponse.json(organisation)
      })
    )

    await fetchRegistration(params)

    expect(authorisation).toBe('Bearer test-token')
  })

  test('is a registration not found for a number the organisation does not hold', async ({
    msw
  }) => {
    msw.use(http.get(organisationUrl, () => HttpResponse.json(organisation)))

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

  test('is a registration not found for an organisation the backend does not know', async ({
    msw
  }) => {
    msw.use(
      http.get(
        organisationUrl,
        () => new HttpResponse(null, { status: statusCodes.notFound })
      )
    )

    await expect(fetchRegistration(params)).rejects.toMatchObject(
      notFoundForThisRegistration
    )
  })

  test('lets any other failure reading the organisation surface', async ({
    msw
  }) => {
    msw.use(
      http.get(
        organisationUrl,
        () =>
          new HttpResponse(null, { status: statusCodes.internalServerError })
      )
    )

    const failure = fetchRegistration(params)

    await expect(failure).rejects.toMatchObject({
      output: { statusCode: statusCodes.internalServerError }
    })
    await expect(failure).rejects.not.toHaveProperty('code')
  })
})
