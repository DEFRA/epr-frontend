import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import Boom from '@hapi/boom'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

describe('#submitSummaryLogController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`
  /** @type {Server} */
  let server

  const mockCredentials = {
    idToken: 'test-id-token'
  }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should submit summary log, store response in session, and redirect to GET route', async () => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb },
      auth: { strategy: 'session', credentials: mockCredentials }
    })

    expect(submitSummaryLog).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId,
      'test-id-token'
    )
    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    )
  })

  test('should set session cookie when storing fresh data', async () => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb },
      auth: { strategy: 'session', credentials: mockCredentials }
    })

    // Verify session cookie was set
    const sessionCookie = response.headers['set-cookie']

    expect(sessionCookie).toBeDefined()
    expect(
      Array.isArray(sessionCookie) ? sessionCookie[0] : sessionCookie
    ).toContain('session')
  })

  test('should render conflict view when backend returns 409', async () => {
    submitSummaryLog.mockRejectedValueOnce(
      Boom.conflict('Summary log must be validated before submission')
    )

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb },
      auth: { strategy: 'session', credentials: mockCredentials }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toStrictEqual(
      expect.stringContaining('Your waste records cannot be updated')
    )
    expect(result).toStrictEqual(
      expect.stringContaining('someone else from your organisation')
    )
    expect(result).toStrictEqual(
      expect.stringContaining(`/organisations/${organisationId}`)
    )
  })

  test('should allow non-conflict backend errors to bubble up', async () => {
    const error = new Error('Backend error')
    submitSummaryLog.mockRejectedValueOnce(error)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb },
      auth: { strategy: 'session', credentials: mockCredentials }
    })

    // Hapi will show an error page (500)
    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })

  test('should reject POST request without CSRF token', async () => {
    const response = await server.inject({ method: 'POST', url })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })

  describe('session validation', () => {
    test('should redirect to login when no credentials provided', async () => {
      const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
      const { cookie, crumb } = await getCsrfToken(server, getUrl)

      // No auth credentials provided
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

  describe('freshData session handling', () => {
    test('should use freshData from session and clean it up on subsequent GET', async () => {
      const mockResponse = {
        status: 'submitted',
        accreditationNumber: '493021'
      }

      submitSummaryLog.mockResolvedValueOnce(mockResponse)

      const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
      const { cookie, crumb } = await getCsrfToken(server, getUrl)

      // POST sets freshData in session and redirects to GET
      const postResponse = await server.inject({
        method: 'POST',
        url,
        headers: { cookie },
        payload: { crumb },
        auth: { strategy: 'session', credentials: mockCredentials }
      })

      expect(postResponse.statusCode).toBe(statusCodes.found)

      // Extract the session cookie from POST response to use in GET
      const sessionCookie = postResponse.headers['set-cookie']

      // Follow the redirect - GET should use freshData from session and clean it up
      const getResponse = await server.inject({
        method: 'GET',
        url: postResponse.headers.location,
        headers: {
          cookie: Array.isArray(sessionCookie)
            ? sessionCookie.join('; ')
            : sessionCookie
        },
        auth: { strategy: 'session', credentials: mockCredentials }
      })

      expect(getResponse.statusCode).toBe(statusCodes.ok)
      // Should show the submitted success page (using freshData from session)
      expect(getResponse.result).toContain('Summary log uploaded')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
