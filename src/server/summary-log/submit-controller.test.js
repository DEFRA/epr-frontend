import Boom from '@hapi/boom'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { beforeEach, describe, expect, vi } from 'vitest'

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

const mockAuth = {
  strategy: 'session',
  credentials: {
    idToken: 'test-id-token',
    profile: {
      id: 'user-123',
      email: 'test@example.com'
    }
  }
}

describe('#submitSummaryLogController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit summary log, store response in session, and redirect to GET route', async ({
    server
  }) => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
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

  it('should set session cookie when storing fresh data', async ({
    server
  }) => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
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

  it('should render conflict view when backend returns 409', async ({
    server
  }) => {
    submitSummaryLog.mockRejectedValueOnce(
      Boom.conflict('Summary log must be validated before submission')
    )

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const { cookie, crumb } = await getCsrfToken(server, getUrl, {
      auth: mockAuth
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
    expect(result).toStrictEqual(
      expect.stringContaining(`/organisations/${organisationId}`)
    )
  })

  it('should allow non-conflict backend errors to bubble up', async ({
    server
  }) => {
    const error = new Error('Backend error')
    submitSummaryLog.mockRejectedValueOnce(error)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
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
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    submitSummaryLog.mockResolvedValueOnce(mockResponse)

    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
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

    const cookies = [firstResponse.headers['set-cookie']].flat()
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
    const getUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
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
