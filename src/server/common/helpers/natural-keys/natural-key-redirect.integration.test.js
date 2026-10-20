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
 * @import { SetupServer } from 'msw/node'
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
    }
  ])
}

/**
 * @param {SetupServer} msw
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

describe('redirecting an old page URL to its natural keys', () => {
  it.for(
    /** @type {const} */ (['organisation', 'registration', 'accreditation'])
  )(
    'sends ids for the %s to its natural keys',
    async (depth, { server, msw }) => {
      registerPages(server)
      backendHolds(msw)

      const response = await visit(server, `${byIds[depth]}/moved-page`)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(
        `${byNaturalKeys[depth]}/moved-page`
      )
    }
  )

  // The msw fixture fails any backend call it has no handler for, so a 200
  // also shows that no lookup was made.
  it.for([
    ['natural keys', `${byNaturalKeys.accreditation}/moved-page`],
    [
      'a mix of ids and natural keys',
      `/organisations/${organisationNumber}/registrations/${registrationId}/moved-page`
    ],
    [
      'made-up ids',
      '/organisations/org-123/registrations/reg-001/accreditations/acc-001/moved-page'
    ]
  ])('serves %s as it is', async ([, url], { server }) => {
    registerPages(server)

    const response = await visit(server, url)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toBe('ok')
  })

  describe('counting old page URLs', () => {
    it('counts ids, even when they find nothing', async ({ server, msw }) => {
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

    it('does not count natural keys', async ({ server }) => {
      const oldRequested = vi.spyOn(metrics.pageUrl, 'oldRequested')
      registerPages(server)

      await visit(server, `${byNaturalKeys.organisation}/moved-page`)

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

    it('shows the not-found page for an accreditation the registration does not link to', async ({
      server,
      msw
    }) => {
      registerPages(server)
      backendHolds(msw, {
        ...organisation,
        registrations: [{ ...registration, accreditationId: undefined }]
      })

      const response = await visit(server, `${byIds.accreditation}/moved-page`)

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

    it('sends ids to their natural keys', async ({ server, msw }) => {
      registerPages(server)
      backendHolds(msw)

      const response = await visit(
        server,
        `${byIds.accreditation}/moved-page`,
        { auth: regulator }
      )

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(
        `${byNaturalKeys.accreditation}/moved-page`
      )
    })
  })
})
