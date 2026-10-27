import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { toYear } from '#server/common/helpers/year.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { asHtml, documentOf } from '#server/common/test-helpers/dom.js'
import {
  buildOrganisationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'validated'
    })
  })
)

vi.spyOn(metrics.journey, 'start').mockResolvedValue()
vi.spyOn(metrics.journey, 'end').mockResolvedValue()

const mockAuth = buildMockAuth({
  backendToken: toBackendToken('test-id-token'),
  linkedOrganisationId: '123'
})

/** @param {unknown} result */
const homePageHref = (result) =>
  getByRole(documentOf(asHtml(result)), 'link', {
    name: 'home page'
  }).getAttribute('href')

describe('#submitSummaryLogController', () => {
  const organisationNumber = toOrganisationNumber('500118')
  const registrationNumber = toRegistrationNumber('R26ER5001180041PL')
  const summaryLogId = '789'
  const url = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}/submit`

  beforeEach(({ msw }) => {
    vi.clearAllMocks()
    msw.use(
      http.get(
        `${config.get('eprBackendUrl')}/organisations/${organisationNumber}`,
        () =>
          HttpResponse.json(
            buildOrganisationView({
              organisationNumber,
              registrations: {
                [registrationNumber]: buildRegistrationView({
                  accreditations: {}
                })
              }
            })
          )
      )
    )
  })

  it('should submit summary log, store response in session, and redirect to GET route', async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockResolvedValueOnce({ status: 'submitting' })

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    const response = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    expect(submitSummaryLog).toHaveBeenCalledWith(
      { organisationNumber, registrationNumber },
      summaryLogId,
      'test-id-token'
    )
    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(
      `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    )
  })

  it('should set session cookie when storing fresh data', async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockResolvedValueOnce({ status: 'submitting' })

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    const response = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    // Verify session cookie was set
    const sessionCookie = response.headers['set-cookie']

    expect(sessionCookie).toBeDefined()
    expect(
      Array.isArray(sessionCookie) ? sessionCookie[0] : sessionCookie
    ).toContain('session=')
  })

  it('should record the journey end when the summary log is submitted', async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockResolvedValueOnce({
      status: 'submitting'
    })

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    expect(metrics.journey.end).toHaveBeenCalledWith(
      expect.anything(),
      JOURNEY.uploadSummaryLog,
      registrationNumber
    )
  })

  it('should not record the journey end when the backend rejects the submission', async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockRejectedValueOnce(
      Boom.conflict('Summary log must be validated before submission')
    )

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    expect(metrics.journey.end).not.toHaveBeenCalled()
  })

  it('should render conflict view when backend returns 409', async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockRejectedValueOnce(
      Boom.conflict('Summary log must be validated before submission')
    )

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })
    vi.mocked(fetchSummaryLogStatus).mockResolvedValueOnce({
      status: 'superseded',
      year: toYear(2027)
    })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toStrictEqual(
      expect.stringContaining('Your waste records cannot be updated')
    )
    expect(result).toStrictEqual(
      expect.stringContaining('someone else from your organisation')
    )
    expect(homePageHref(result)).toBe(
      `/organisations/${organisationNumber}/2027`
    )
  })

  it("still renders the conflict view, linking home without a year, when the summary log's status cannot be read", async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockRejectedValueOnce(
      Boom.conflict('Summary log must be validated before submission')
    )

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })
    vi.mocked(fetchSummaryLogStatus).mockRejectedValueOnce(
      Boom.badGateway('Backend unavailable')
    )

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toStrictEqual(
      expect.stringContaining('Your waste records cannot be updated')
    )
    expect(homePageHref(result)).toBe(`/organisations/${organisationNumber}`)
  })

  it('should allow non-conflict backend errors to bubble up', async ({
    server
  }) => {
    const error = new Error('Backend error')
    vi.mocked(submitSummaryLog).mockRejectedValueOnce(error)

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    const response = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    // Hapi will show an error page (500)
    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })

  it('should redirect without calling backend when freshData already exists in session', async ({
    server
  }) => {
    vi.mocked(submitSummaryLog).mockResolvedValueOnce({ status: 'submitting' })

    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    const firstResponse = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    const cookies = /** @type {string[]} */ (
      [firstResponse.headers['set-cookie']].flat()
    )
    const sessionCookie = cookies
      .map((c) => c.split(';')[0])
      .find((c) => c.startsWith('session='))

    const crumbCookie = cookie.split('; ').find((c) => c.startsWith('crumb='))

    const secondResponse = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie: `${crumbCookie}; ${sessionCookie}` },
      payload: { crumb }
    })

    expect(submitSummaryLog).toHaveBeenCalledTimes(1)
    expect(secondResponse.statusCode).toBe(statusCodes.found)
    expect(secondResponse.headers.location).toBe(getUrl)
  })

  it('should reject POST request without CSRF token', async ({ server }) => {
    const response = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })

  it('should redirect to logged-out when not authenticated', async ({
    server
  }) => {
    const getUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
    })

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/logged-out')
  })
})
