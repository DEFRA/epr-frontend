import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchOverseasSites } from './fetch-overseas-sites.js'

/**
 * @import { SetupServerApi } from 'msw/node'
 * @import { OverseasSitesById } from './fetch-overseas-sites.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = 'org-123'
const registrationId = 'reg-001'
const backendToken = 'test-id-token'

const organisationUrl = `${backendUrl}/v1/organisations/${organisationId}`
const sitesUrl = `${organisationUrl}/registrations/${registrationId}/overseas-sites`

const params = { organisationId, registrationId, backendToken }

const registration = {
  id: registrationId,
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  material: 'plastic',
  overseasSites: { '007': { overseasSiteId: 'site-007' } }
}

const organisation = {
  id: organisationId,
  companyDetails: { name: 'Kirkby Plastics Ltd' },
  registrations: [registration],
  accreditations: []
}

/** @type {OverseasSitesById} */
const sites = {
  '007': {
    name: 'Bahia Plásticos',
    country: 'Brazil',
    address: {
      line1: 'Rua das Palmeiras 12',
      townOrCity: 'Salvador'
    },
    coordinates: '-12.9777, -38.5016'
  }
}

/**
 * A registration the organisation does not hold fails the organisation read and
 * the sites read alike, so a status stands in for both.
 * @param {SetupServerApi} msw
 * @param {{ sitesStatus?: number, organisationHolds?: object[] }} [overrides]
 */
const backendHolds = (
  msw,
  { sitesStatus, organisationHolds = [registration] } = {}
) => {
  msw.use(
    http.get(organisationUrl, () =>
      HttpResponse.json({ ...organisation, registrations: organisationHolds })
    ),
    http.get(sitesUrl, () =>
      sitesStatus
        ? new HttpResponse(null, { status: sitesStatus })
        : HttpResponse.json(sites)
    )
  )
}

describe(fetchOverseasSites, () => {
  test('reads the organisation, its registration and the sites it names', async ({
    msw
  }) => {
    backendHolds(msw)

    await expect(fetchOverseasSites(params)).resolves.toStrictEqual({
      organisation: { ...organisation, registrations: [registration] },
      registration,
      sites
    })
  })

  test('reads both of them as the token bearer', async ({ msw }) => {
    /** @type {string[]} */
    const authorisations = []

    msw.use(
      http.get(organisationUrl, ({ request }) => {
        authorisations.push(request.headers.get('authorization') ?? '')
        return HttpResponse.json(organisation)
      }),
      http.get(sitesUrl, ({ request }) => {
        authorisations.push(request.headers.get('authorization') ?? '')
        return HttpResponse.json(sites)
      })
    )

    await fetchOverseasSites(params)

    expect(authorisations).toHaveLength(2)
    expect(new Set(authorisations)).toStrictEqual(
      new Set(['Bearer test-id-token'])
    )
  })

  test('reads a registration that names no site as holding none', async ({
    msw
  }) => {
    msw.use(
      http.get(organisationUrl, () => HttpResponse.json(organisation)),
      http.get(sitesUrl, () => HttpResponse.json({}))
    )

    await expect(fetchOverseasSites(params)).resolves.toMatchObject({
      sites: {}
    })
  })

  // Both reads 404 and they race, so the failure that surfaces is whichever
  // settled first. The status alone reaches the browser; the code and the event
  // are what CDP indexes it by, so those are what is asserted.
  test('names the registration a regulator asked for where the backend holds none', async ({
    msw
  }) => {
    backendHolds(msw, {
      sitesStatus: statusCodes.notFound,
      organisationHolds: []
    })

    await expect(fetchOverseasSites(params)).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound },
      code: 'registration_not_found',
      event: {
        action: 'fetch_overseas_sites',
        reason: 'organisationId=org-123 registrationId=reg-001'
      }
    })
  })

  test('leaves any other failure of the sites read as it found it', async ({
    msw
  }) => {
    backendHolds(msw, { sitesStatus: statusCodes.internalServerError })

    const failure = fetchOverseasSites(params)

    await expect(failure).rejects.toMatchObject({
      output: { statusCode: statusCodes.internalServerError }
    })
    await expect(failure).rejects.not.toHaveProperty('code')
  })
})
