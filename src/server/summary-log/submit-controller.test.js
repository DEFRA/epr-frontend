import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { createServer } from '#server/index.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

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

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    // Mock getUserSession to return a valid session
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
      ok: true,
      value: {
        idToken: 'test-id-token'
      }
    })
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
      payload: { crumb }
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
      payload: { crumb }
    })

    // Verify session cookie was set
    const sessionCookie = response.headers['set-cookie']

    expect(sessionCookie).toBeDefined()
    expect(
      Array.isArray(sessionCookie) ? sessionCookie[0] : sessionCookie
    ).toContain('session')
  })

  test('should allow backend errors to bubble up', async () => {
    const error = new Error('Backend error')
    submitSummaryLog.mockRejectedValueOnce(error)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    // Hapi will show an error page (500)
    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })

  test('should reject POST request without CSRF token', async () => {
    const response = await server.inject({ method: 'POST', url })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })

  test('should redirect to login when session is invalid', async () => {
    // Get CSRF token first with valid session
    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    // Now mock invalid session for the POST request
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValueOnce({
      ok: false
    })

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/login')
  })

  test('should redirect to login when session value is null', async () => {
    // Get CSRF token first with valid session
    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl)

    // Now mock null session value for the POST request
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValueOnce({
      ok: true,
      value: null
    })

    const response = await server.inject({
      method: 'POST',
      url,
      headers: { cookie },
      payload: { crumb }
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe('/login')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
