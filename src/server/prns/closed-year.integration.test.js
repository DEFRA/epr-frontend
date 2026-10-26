import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import {
  mergeCookies,
  extractCookieValues
} from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import {
  buildAccreditationView,
  buildOrganisationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import organisationsFixture from '#fixtures/waste-organisations/organisations.json' with { type: 'json' }
import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

const backendUrl = config.get('eprBackendUrl')

const registrationNumber = 'R26EN0000000001PL'
const prnId = 'prn-789'
const accreditationPath = `/organisations/500123/registrations/${registrationNumber}/accreditations/2026`
const listPath = `${accreditationPath}/packaging-recycling-notes`
const notePath = `${listPath}/${prnId}`

const mockAuth = {
  strategy: 'session',
  credentials: buildMockAuth().credentials
}

const closedYearRefusal = {
  statusCode: 409,
  error: 'Conflict',
  message: 'The deadline for a 2026 relevant year was 31 January 2027.',
  code: 'RELEVANT_YEAR_CLOSED'
}

/** @param {boolean} relevantYearOpen */
const organisationWhoseYear = (relevantYearOpen) =>
  buildOrganisationView({
    organisationNumber: toOrganisationNumber('500123'),
    registrations: {
      [registrationNumber]: buildRegistrationView({
        wasteProcessingType: 'reprocessor',
        reprocessingType: 'input',
        accreditations: {
          2026: buildAccreditationView({
            accreditationNumber: toAccreditationNumber('ACC001234'),
            relevantYearOpen
          })
        }
      })
    }
  })

const crumbSource = '/organisations/500123'

const recipientId = organisationsFixture.organisations[0].id

/**
 * @import { SetupServer } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

describe('a write the backend refuses because the year has closed', () => {
  const readsOrganisation = vi.fn()
  const writes = vi.fn()

  /**
   * @param {SetupServer} msw
   * @param {boolean} relevantYearOpen
   * @param {RegExp} writeUrl
   */
  const givenBackend = (msw, relevantYearOpen, writeUrl) => {
    msw.use(
      http.get(`${backendUrl}/organisations/500123`, () => {
        readsOrganisation()
        return HttpResponse.json(organisationWhoseYear(relevantYearOpen))
      }),
      http.get(`${backendUrl}/organisations/500123/years`, () =>
        HttpResponse.json({ years: [2026] })
      ),
      http.post(writeUrl, () => {
        writes()
        return HttpResponse.json(closedYearRefusal, { status: 409 })
      })
    )
  }

  describe.for([
    {
      description: 'issuing a note',
      url: `${notePath}/issue`,
      writeUrl: /\/status$/,
      payload: {},
      sentTo: `${notePath}/view`
    },
    {
      description: 'creating a note',
      url: `${listPath}/create`,
      writeUrl: /\/packaging-recycling-notes$/,
      payload: {
        tonnage: '10',
        recipient: recipientId,
        wasteProcessingType: 'reprocessor'
      },
      sentTo: listPath
    }
  ])('$description', ({ url, writeUrl, payload, sentTo }) => {
    it.for([true, false])(
      'should send the session on after asking the backend once, with the organisation view saying open: %s',
      async (relevantYearOpen, { server, msw }) => {
        givenBackend(msw, relevantYearOpen, writeUrl)
        const { cookie, crumb } = await getCsrfToken(server, crumbSource, {
          auth: mockAuth
        })
        readsOrganisation.mockClear()
        writes.mockClear()

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...payload, crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(sentTo)
        expect(writes).toHaveBeenCalledTimes(1)
      }
    )

    it('should not read the organisation view before writing', async ({
      server,
      msw
    }) => {
      givenBackend(msw, true, writeUrl)
      const { cookie, crumb } = await getCsrfToken(server, crumbSource, {
        auth: mockAuth
      })
      readsOrganisation.mockClear()

      await server.inject({
        method: 'POST',
        url,
        auth: mockAuth,
        headers: { cookie },
        payload: { ...payload, crumb }
      })

      expect(readsOrganisation).not.toHaveBeenCalled()
    })
  })
})

describe('confirming a draft', () => {
  const readsOrganisation = vi.fn()

  /**
   * Creates a draft, then confirms it, recording what the backend was asked.
   * @param {{ server: HapiServer, msw: SetupServer }} fixtures
   * @param {{
   *   relevantYearOpen: boolean,
   *   availableAmount: number,
   *   statusResponse: () => Response
   * }} scenario
   */
  const confirmDraft = async (
    { server, msw },
    { relevantYearOpen, availableAmount, statusResponse }
  ) => {
    /** @type {unknown[]} */
    const statusRequests = []
    msw.use(
      http.get(`${backendUrl}/organisations/500123`, () => {
        readsOrganisation()
        return HttpResponse.json(organisationWhoseYear(relevantYearOpen))
      }),
      http.get(`${backendUrl}/organisations/500123/years`, () =>
        HttpResponse.json({ years: [2026] })
      ),
      http.post(/\/packaging-recycling-notes$/, () =>
        HttpResponse.json(buildPrnResource(), { status: 201 })
      ),
      http.get(/\/december-prn-eligibility$/, () =>
        HttpResponse.json({ mode: 'none', windowOpen: false })
      ),
      http.get(`${backendUrl}/organisations/500123/waste-balances/2026`, () =>
        HttpResponse.json({ ACC001234: { amount: 1000, availableAmount } })
      ),
      http.post(/\/status$/, async ({ request }) => {
        statusRequests.push(await request.json())
        return statusResponse()
      })
    )
    const { cookie: crumbCookie, crumb } = await getCsrfToken(
      server,
      crumbSource,
      { auth: mockAuth }
    )
    const created = await server.inject({
      method: 'POST',
      url: `${listPath}/create`,
      auth: mockAuth,
      headers: { cookie: crumbCookie },
      payload: {
        tonnage: '100',
        recipient: recipientId,
        wasteProcessingType: 'reprocessor',
        crumb
      }
    })
    const cookie = mergeCookies(
      crumbCookie,
      ...extractCookieValues(created.headers['set-cookie'])
    )
    readsOrganisation.mockClear()

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `${notePath}/view`,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    return { statusCode, location: headers.location, statusRequests }
  }

  it('should send the session to the note after asking the backend once when it refuses as the year closes', async ({
    server,
    msw
  }) => {
    const { statusCode, location, statusRequests } = await confirmDraft(
      { server, msw },
      {
        relevantYearOpen: true,
        availableAmount: 1000,
        statusResponse: () =>
          HttpResponse.json(closedYearRefusal, { status: 409 })
      }
    )

    expect(statusCode).toBe(statusCodes.found)
    expect(location).toBe(`${notePath}/view`)
    expect(statusRequests).toHaveLength(1)
    expect(readsOrganisation).toHaveBeenCalledTimes(1)
  })

  it.for([
    { description: 'the balance covers it', availableAmount: 1000 },
    { description: 'the balance has fallen short', availableAmount: 10 }
  ])(
    'should send the session to the note without writing once the year has closed and $description',
    async ({ availableAmount }, { server, msw }) => {
      const { statusCode, location, statusRequests } = await confirmDraft(
        { server, msw },
        {
          relevantYearOpen: false,
          availableAmount,
          statusResponse: () => HttpResponse.json(buildPrnResource())
        }
      )

      expect(statusCode).toBe(statusCodes.found)
      expect(location).toBe(`${notePath}/view`)
      expect(statusRequests).toStrictEqual([])
    }
  )
})
