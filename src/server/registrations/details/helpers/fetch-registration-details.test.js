import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchRegistrationDetails } from './fetch-registration-details.js'

/**
 * @import { SetupServerApi } from 'msw/node'
 * @import { AccreditationResource } from './types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = 'org-123'
const registrationId = 'reg-001'
const backendToken = 'test-id-token'

const organisationUrl = `${backendUrl}/v1/organisations/${organisationId}`
const registrationUrl = `${organisationUrl}/registrations/${registrationId}`

const params = { organisationId, registrationId, backendToken }

const organisation = {
  id: organisationId,
  companyDetails: { name: 'Kirkby Plastics Ltd' }
}

/** @type {RegistrationResource} */
const registration = {
  id: registrationId,
  organisation: { id: organisationId },
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  material: 'plastic',
  reprocessingType: 'input',
  accreditations: [
    {
      id: 'acc-001',
      accreditationNumber: 'A26ER5001180114PL',
      status: 'approved'
    }
  ],
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    site: { address: { line1: 'Unit 4 Mill Road' } }
  }
}

/** @type {AccreditationResource[]} */
const accreditations = [
  {
    id: 'acc-001',
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved',
    reprocessingType: 'input',
    dateRange: { validFrom: '2026-07-01', validTo: null },
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    }
  }
]

/**
 * The backend answers the registration and its accreditations from one lookup,
 * so a registration it does not hold fails both reads rather than one.
 * @param {SetupServerApi} msw
 * @param {{ registrationStatus?: number }} [overrides]
 */
const backendHolds = (msw, { registrationStatus } = {}) => {
  msw.use(
    http.get(organisationUrl, () => HttpResponse.json(organisation)),
    http.get(registrationUrl, () =>
      registrationStatus
        ? new HttpResponse(null, { status: registrationStatus })
        : HttpResponse.json(registration)
    ),
    http.get(`${registrationUrl}/accreditations`, () =>
      registrationStatus
        ? new HttpResponse(null, { status: registrationStatus })
        : HttpResponse.json({ accreditations })
    )
  )
}

describe(fetchRegistrationDetails, () => {
  test('reads the organisation, the registration and its accreditations', async ({
    msw
  }) => {
    backendHolds(msw)

    await expect(fetchRegistrationDetails(params)).resolves.toStrictEqual({
      organisation,
      registration,
      accreditations
    })
  })

  test('reads each of them as the token bearer', async ({ msw }) => {
    /** @type {string[]} */
    const authorisations = []

    msw.use(
      http.get(organisationUrl, ({ request }) => {
        authorisations.push(request.headers.get('authorization') ?? '')
        return HttpResponse.json(organisation)
      }),
      http.get(registrationUrl, ({ request }) => {
        authorisations.push(request.headers.get('authorization') ?? '')
        return HttpResponse.json(registration)
      }),
      http.get(`${registrationUrl}/accreditations`, ({ request }) => {
        authorisations.push(request.headers.get('authorization') ?? '')
        return HttpResponse.json({ accreditations })
      })
    )

    await fetchRegistrationDetails(params)

    expect(authorisations).toHaveLength(3)
    expect(new Set(authorisations)).toStrictEqual(
      new Set(['Bearer test-id-token'])
    )
  })

  // Both reads 404 and they race, so the failure that surfaces is whichever
  // settled first. The status alone reaches the browser; the code and the event
  // are what CDP indexes it by, so those are what is asserted.
  test('names the registration a regulator asked for where the backend holds none', async ({
    msw
  }) => {
    backendHolds(msw, { registrationStatus: statusCodes.notFound })

    await expect(fetchRegistrationDetails(params)).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound },
      code: 'registration_not_found',
      event: {
        action: 'fetch_registration',
        reason: 'organisationId=org-123 registrationId=reg-001'
      }
    })
  })

  test('leaves any other failure of that read as it found it', async ({
    msw
  }) => {
    backendHolds(msw, {
      registrationStatus: statusCodes.internalServerError
    })

    const failure = fetchRegistrationDetails(params)

    await expect(failure).rejects.toMatchObject({
      output: { statusCode: statusCodes.internalServerError }
    })
    await expect(failure).rejects.not.toHaveProperty('code')
  })
})
