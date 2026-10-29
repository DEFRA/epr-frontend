import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { toYear } from '#server/common/helpers/year.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchRegistration } from './fetch-registration.js'

/**
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

const backendUrl = config.get('eprBackendUrl')

const registrationNumber = toRegistrationNumber('R26ER5001180041PL')
const backendToken = toBackendToken('test-token')

const organisationUrl = `${backendUrl}/organisations/500118`

/** @type {RegistrationView} */
const registration = {
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  accreditations: {},
  wasteProcessingType: 'exporter'
}

/** @type {OrganisationView} */
const organisation = {
  organisationNumber: toOrganisationNumber('500118'),
  name: 'Kirkby Plastics Ltd',
  displayName: 'Kirkby Plastics Ltd',
  status: { current: 'active' },
  submittedToRegulator: { code: 'ea' },
  registrations: { [registrationNumber]: registration }
}

const params = {
  organisationNumber: toOrganisationNumber('500118'),
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

  test.for([
    {
      description: 'as it stood in the year when given one',
      year: toYear(2025),
      expected: '2025'
    },
    {
      description: 'as it stands today without a year',
      year: undefined,
      expected: null
    }
  ])(
    'reads the organisation $description',
    async ({ year, expected }, { msw }) => {
      /** @type {(string | null)[]} */
      const askedFor = []
      msw.use(
        http.get(organisationUrl, ({ request }) => {
          askedFor.push(new URL(request.url).searchParams.get('year'))
          return HttpResponse.json(organisation)
        })
      )

      await fetchRegistration(params, { year })

      expect(askedFor).toStrictEqual([expected])
    }
  )

  test('is a registration not found for a number the organisation does not hold', async ({
    msw
  }) => {
    msw.use(http.get(organisationUrl, () => HttpResponse.json(organisation)))

    await expect(
      fetchRegistration({
        ...params,
        registrationNumber: toRegistrationNumber('toString')
      })
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
