import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

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

    const response = await server.inject({
      method: 'POST',
      url
    })

    expect(submitSummaryLog).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId
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

    const response = await server.inject({
      method: 'POST',
      url
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

    const response = await server.inject({
      method: 'POST',
      url
    })

    // Hapi will show an error page (500)
    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
