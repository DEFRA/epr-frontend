import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/**
 * @import { SetupServerApi } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'

const organisationNumber = '500118'
const registrationNumber = 'R26ER5001180041PL'
const year = '2026'

const registration = {
  id: registrationId,
  registrationNumber,
  accreditationId
}

const organisation = {
  id: organisationId,
  orgId: 500118,
  registrations: [registration],
  accreditations: [
    {
      id: accreditationId,
      accreditationNumber: 'A26ER5001180114PL',
      validFrom: '2026-07-01'
    }
  ]
}

const byIds = {
  organisation: `/organisations/${organisationId}`,
  registration: `/organisations/${organisationId}/registrations/${registrationId}`,
  accreditation: `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`
}

const byNaturalKeys = {
  organisation: `/organisations/${organisationNumber}`,
  registration: `/organisations/${organisationNumber}/registrations/${registrationNumber}`,
  accreditation: `/organisations/${organisationNumber}/registrations/${registrationNumber}/accreditations/${year}`
}

const operator = buildMockAuth({ linkedOrganisationId: organisationId })

const regulator = buildMockAuth({
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * Pages that have moved end `/moved-page`, pages that have not end
 * `/unmoved-page`: the two forms of one path would clash in hapi.
 * @param {HapiServer} server
 */
const registerPages = (server) => {
  const ok = () => 'ok'

  server.route([
    {
      method: 'GET',
      path: '/organisations/{organisationNumber}/moved-page',
      handler: ok
    },
    {
      method: 'GET',
      path: '/organisations/{organisationNumber}/registrations/{registrationNumber}/moved-page',
      handler: ok
    },
    {
      method: 'GET',
      path: '/organisations/{organisationNumber}/registrations/{registrationNumber}/accreditations/{year}/moved-page',
      handler: ok
    },
    {
      method: 'POST',
      path: '/organisations/{organisationNumber}/moved-page',
      options: { plugins: { crumb: false } },
      handler: ok
    },
    {
      method: 'GET',
      path: '/organisations/{organisationId}/unmoved-page',
      handler: ok
    },
    {
      method: 'GET',
      path: '/organisations/{organisationId}/registrations/{registrationId}/unmoved-page',
      handler: ok
    },
    {
      method: 'GET',
      path: '/organisations/{organisationId}/registrations/{registrationId}/accreditations/{accreditationId}/unmoved-page',
      handler: ok
    }
  ])
}

/**
 * @param {SetupServerApi} msw
 * @param {object} [held]
 */
const backendHolds = (msw, held = organisation) =>
  msw.use(
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
      HttpResponse.json(held)
    )
  )

/**
 * @param {HapiServer} server
 * @param {string} url
 * @param {{ method?: string, auth?: object }} [options]
 */
const visit = (server, url, { method = 'GET', auth = operator } = {}) =>
  server.inject({ method, url, auth: /** @type {never} */ (auth) })

describe('redirecting a page URL to the key form its route wants', () => {
  describe.each(
    /** @type {const} */ (['organisation', 'registration', 'accreditation'])
  )('to a page for the %s', (depth) => {
    it('sends ids on a moved page to its natural keys', async ({
      server,
      msw
    }) => {
      registerPages(server)
      backendHolds(msw)

      const response = await visit(server, `${byIds[depth]}/moved-page`)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(
        `${byNaturalKeys[depth]}/moved-page`
      )
    })

    it('sends natural keys on an unmoved page to its ids', async ({
      server,
      msw
    }) => {
      registerPages(server)
      backendHolds(msw)

      const response = await visit(
        server,
        `${byNaturalKeys[depth]}/unmoved-page`
      )

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(`${byIds[depth]}/unmoved-page`)
    })
  })

  // The msw fixture fails any backend call it has no handler for, so a 200
  // also shows that no lookup was made.
  it.for([
    ['ids on an unmoved page', `${byIds.accreditation}/unmoved-page`],
    [
      'natural keys on a moved page',
      `${byNaturalKeys.accreditation}/moved-page`
    ],
    [
      'a mix of the two',
      `/organisations/${organisationNumber}/registrations/${registrationId}/unmoved-page`
    ],
    [
      'made-up ids',
      '/organisations/org-123/registrations/reg-001/accreditations/acc-001/unmoved-page'
    ]
  ])('serves %s as it is', async ([, url], { server }) => {
    registerPages(server)

    const response = await visit(server, url)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toBe('ok')
  })

  describe('counting old page URLs', () => {
    it('counts ids arriving at a moved page, even when they find nothing', async ({
      server,
      msw
    }) => {
      const oldRequested = vi.spyOn(metrics.pageUrl, 'oldRequested')
      registerPages(server)
      msw.use(
        http.get(
          `${backendUrl}/v1/organisations/${organisationId}`,
          () => new HttpResponse(null, { status: statusCodes.notFound })
        )
      )

      await visit(server, `${byIds.organisation}/moved-page`)

      expect(oldRequested).toHaveBeenCalledExactlyOnceWith()
    })

    it('does not count natural keys arriving at an unmoved page', async ({
      server,
      msw
    }) => {
      const oldRequested = vi.spyOn(metrics.pageUrl, 'oldRequested')
      registerPages(server)
      backendHolds(msw)

      await visit(server, `${byNaturalKeys.organisation}/unmoved-page`)

      expect(oldRequested).not.toHaveBeenCalled()
    })
  })

  it('serves a page that names no record as it is', async ({ server }) => {
    server.route({ method: 'GET', path: '/other-page', handler: () => 'ok' })

    const response = await visit(server, '/other-page')

    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('keeps the query string', async ({ server, msw }) => {
    registerPages(server)
    backendHolds(msw)

    const response = await visit(
      server,
      `${byIds.organisation}/moved-page?tab=x`
    )

    expect(response.headers.location).toBe(
      `${byNaturalKeys.organisation}/moved-page?tab=x`
    )
  })

  it('keeps Welsh, and the query string with it', async ({ server, msw }) => {
    registerPages(server)
    backendHolds(msw)

    const response = await visit(
      server,
      `/cy${byIds.organisation}/moved-page?tab=x`
    )

    expect(response.headers.location).toBe(
      `/cy${byNaturalKeys.organisation}/moved-page?tab=x`
    )
  })

  it('sends a HEAD on with a 302', async ({ server, msw }) => {
    registerPages(server)
    backendHolds(msw)

    const response = await visit(server, `${byIds.organisation}/moved-page`, {
      method: 'HEAD'
    })

    expect(response.statusCode).toBe(statusCodes.found)
  })

  it('sends a POST on with a 307, so the form keeps its body', async ({
    server,
    msw
  }) => {
    registerPages(server)
    backendHolds(msw)

    const response = await visit(server, `${byIds.organisation}/moved-page`, {
      method: 'POST'
    })

    expect(response.statusCode).toBe(statusCodes.temporaryRedirect)
    expect(response.headers.location).toBe(
      `${byNaturalKeys.organisation}/moved-page`
    )
  })

  describe('a record that cannot be found', () => {
    it("shows an operator the not-found page for another organisation's number", async ({
      server,
      msw
    }) => {
      registerPages(server)
      backendHolds(msw)

      const response = await visit(server, '/organisations/500999/unmoved-page')

      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    it("shows the not-found page for an organisation's id the backend refuses", async ({
      server,
      msw
    }) => {
      registerPages(server)
      msw.use(
        http.get(
          `${backendUrl}/v1/organisations/${organisationId}`,
          () => new HttpResponse(null, { status: statusCodes.forbidden })
        )
      )

      const response = await visit(server, `${byIds.organisation}/moved-page`)

      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    it('shows the not-found page for a registration with no number', async ({
      server,
      msw
    }) => {
      registerPages(server)
      backendHolds(msw, {
        ...organisation,
        registrations: [{ ...registration, registrationNumber: undefined }]
      })

      const response = await visit(server, `${byIds.registration}/moved-page`)

      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    it('shows the not-found page for an accreditation in another year', async ({
      server,
      msw
    }) => {
      registerPages(server)
      backendHolds(msw)

      const response = await visit(
        server,
        `${byNaturalKeys.registration}/accreditations/2027/unmoved-page`
      )

      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('for a regulator', () => {
    beforeAll(() => {
      config.set('featureFlags.regulatorAccess', true)
    })

    afterAll(() => {
      config.set('featureFlags.regulatorAccess', false)
    })

    /**
     * @param {SetupServerApi} msw
     * @param {object[]} items
     */
    const searchFinds = (msw, items) =>
      msw.use(
        http.get(`${backendUrl}/v1/organisations`, () =>
          HttpResponse.json({ items, page: 1, pageSize: 1 })
        )
      )

    it('sends natural keys on an unmoved page to its ids', async ({
      server,
      msw
    }) => {
      registerPages(server)
      searchFinds(msw, [{ id: organisationId, orgId: 500118 }])
      backendHolds(msw)

      const response = await visit(
        server,
        `${byNaturalKeys.accreditation}/unmoved-page`,
        { auth: regulator }
      )

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(
        `${byIds.accreditation}/unmoved-page`
      )
    })

    it('shows the not-found page for a number no organisation has', async ({
      server,
      msw
    }) => {
      registerPages(server)
      searchFinds(msw, [])

      const response = await visit(
        server,
        `${byNaturalKeys.organisation}/unmoved-page`,
        { auth: regulator }
      )

      expect(response.statusCode).toBe(statusCodes.notFound)
    })
  })
})
