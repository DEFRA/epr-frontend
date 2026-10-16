import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchOverseasSites } from './fetch-overseas-sites.js'

/**
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationNumber = '500123'
const registrationNumber = 'R26ER5001180041PL'
const backendToken = 'test-id-token'

const organisationUrl = `${backendUrl}/organisations/${organisationNumber}`

const params = { organisationNumber, registrationNumber, backendToken }

/** @type {RegistrationView} */
const registration = {
  status: 'approved',
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  statusTimeline: {},
  accreditations: {},
  wasteProcessingType: 'exporter',
  overseasSites: {
    '007': {
      name: 'Bahia Plásticos',
      address: {
        country: 'Brazil',
        line1: 'Rua das Palmeiras 12',
        townOrCity: 'Salvador'
      },
      coordinates: '-12.9777, -38.5016'
    }
  }
}

/** @type {OrganisationView} */
const organisation = {
  name: 'Kirkby Plastics Ltd',
  organisationNumber: 500123,
  registrations: { [registrationNumber]: registration }
}

describe(fetchOverseasSites, () => {
  test('reads the registration from the organisation by its number', async ({
    msw
  }) => {
    msw.use(http.get(organisationUrl, () => HttpResponse.json(organisation)))

    await expect(fetchOverseasSites(params)).resolves.toStrictEqual({
      organisation,
      registrationNumber,
      registration
    })
  })

  test('reads it as the token bearer', async ({ msw }) => {
    /** @type {string | null} */
    let authorisation = null

    msw.use(
      http.get(organisationUrl, ({ request }) => {
        authorisation = request.headers.get('authorization')
        return HttpResponse.json(organisation)
      })
    )

    await fetchOverseasSites(params)

    expect(authorisation).toBe('Bearer test-id-token')
  })

  test.for([
    {
      reason: 'the backend holds no such organisation',
      respond: () => new HttpResponse(null, { status: statusCodes.notFound })
    },
    {
      reason: 'the organisation holds no such registration',
      respond: () => HttpResponse.json({ ...organisation, registrations: {} })
    }
  ])(
    'names the registration asked for where $reason',
    async ({ respond }, { msw }) => {
      msw.use(http.get(organisationUrl, respond))

      await expect(fetchOverseasSites(params)).rejects.toMatchObject({
        output: { statusCode: statusCodes.notFound },
        code: 'registration_not_found',
        event: {
          action: 'fetch_registration',
          reason: `organisationNumber=500123 registrationNumber=${registrationNumber}`
        }
      })
    }
  )

  test('leaves any other failure as it found it', async ({ msw }) => {
    msw.use(
      http.get(
        organisationUrl,
        () =>
          new HttpResponse(null, { status: statusCodes.internalServerError })
      )
    )

    const failure = fetchOverseasSites(params)

    await expect(failure).rejects.toMatchObject({
      output: { statusCode: statusCodes.internalServerError }
    })
    await expect(failure).rejects.not.toHaveProperty('code')
  })
})
