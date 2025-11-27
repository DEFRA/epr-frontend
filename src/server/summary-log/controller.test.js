import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { StatusCodes } from 'http-status-codes'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { backendSummaryLogStatuses } from '../common/constants/statuses.js'

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

const enablesClientSidePolling = () =>
  expect.stringContaining('meta http-equiv="refresh"')

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs`
  const summaryLogBaseUrl = `${baseUrl}/${summaryLogId}`
  const url = summaryLogBaseUrl
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should provide expected response', async () => {
    const { result, statusCode } = await server.inject({ method: 'GET', url })

    expect(fetchSummaryLogStatus).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId
    )
    expect(result).toStrictEqual(expect.stringContaining('Summary log |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('processing states', () => {
    test('status: preprocessing - should show processing message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.preprocessing
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being uploaded')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'Your summary log is being uploaded and automatically validated'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validating - should show processing message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validating
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being uploaded')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: submitting - should show submitting message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitting
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being submitted')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Your summary log is being submitted')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('terminal states', () => {
    const expectCheckPageContent = (result) => {
      expect(result).toStrictEqual(
        expect.stringContaining('Check before you submit')
      )
      expect(result).toStrictEqual(expect.stringContaining('Compliance'))
      expect(result).toStrictEqual(expect.stringContaining('Declaration'))
      expect(result).toStrictEqual(
        expect.stringContaining('Confirm and submit')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Re-upload summary log')
      )
    }

    test('status: validated - should show check page and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining(
          'action="/organisations/123/registrations/456/summary-logs/789/submit"'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('method="POST"'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    test('status: validated with loadCounts - should show waste balance section with new loads', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loadCounts: {
          added: { valid: 29, invalid: 0 },
          unchanged: { valid: 10, invalid: 0 },
          adjusted: { valid: 0, invalid: 0 }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Waste balance'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '29 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'These are loads that have been added since your summary log was last submitted'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with loadCounts - should show invalid loads section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loadCounts: {
          added: { valid: 0, invalid: 9 },
          unchanged: { valid: 10, invalid: 0 },
          adjusted: { valid: 0, invalid: 0 }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Waste balance'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '9 loads will not be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'These loads are missing information from section 1'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with loadCounts - should show adjusted loads section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loadCounts: {
          added: { valid: 0, invalid: 0 },
          unchanged: { valid: 10, invalid: 0 },
          adjusted: { valid: 14, invalid: 0 }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Waste balance'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '14 loads in your current reporting period have been adjusted'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'Your waste balance will be updated to reflect these adjustments'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with loadCounts - should show all sections when all counts present', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loadCounts: {
          added: { valid: 29, invalid: 9 },
          unchanged: { valid: 10, invalid: 0 },
          adjusted: { valid: 14, invalid: 0 }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Waste balance'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '29 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '9 loads will not be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '14 loads in your current reporting period have been adjusted'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with loadCounts - should use singular form for single load', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loadCounts: {
          added: { valid: 1, invalid: 1 },
          unchanged: { valid: 10, invalid: 0 },
          adjusted: { valid: 1, invalid: 0 }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 new load will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 load will not be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 load in your current reporting period has been adjusted'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with loadCounts - should show all sections even when counts are zero', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loadCounts: {
          added: { valid: 0, invalid: 0 },
          unchanged: { valid: 10, invalid: 0 },
          adjusted: { valid: 0, invalid: 0 }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Waste balance'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '0 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '0 loads will not be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '0 loads in your current reporting period have been adjusted'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated without loadCounts - should default to zero counts', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Waste balance'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '0 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '0 loads will not be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '0 loads in your current reporting period have been adjusted'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: submitted - should show success page and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitted,
        accreditationNumber: '493021'
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log submitted')
      )
      expect(result).toStrictEqual(expect.stringContaining('493021'))
      expect(result).toStrictEqual(expect.stringContaining('Return to home'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    test('status: submitted with freshData from POST - should use freshData and not call backend', async () => {
      // Integration test: POST submit sets freshData, GET uses it
      const submitUrl = `${url}/submit`

      // Mock the backend submit call for the POST
      submitSummaryLog.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitted,
        accreditationNumber: '999888'
      })

      // Make POST request to set up freshData in session
      const postResponse = await server.inject({
        method: 'POST',
        url: submitUrl
      })

      // Verify POST redirected
      expect(postResponse.statusCode).toBe(statusCodes.found)

      // Get session cookie from POST response
      const sessionCookie = postResponse.headers['set-cookie']

      // Make GET request with the session cookie
      // The GET handler should use freshData from session (not call fetchSummaryLogStatus)
      const initialCallCount = fetchSummaryLogStatus.mock.calls.length

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        headers: {
          cookie: Array.isArray(sessionCookie)
            ? sessionCookie[0]
            : sessionCookie
        }
      })

      // Verify fetchSummaryLogStatus was NOT called (freshData was used instead)
      expect(fetchSummaryLogStatus.mock.calls).toHaveLength(initialCallCount)

      // Verify success page with accreditation number from freshData
      expect(result).toStrictEqual(
        expect.stringContaining('Summary log submitted')
      )
      expect(result).toStrictEqual(expect.stringContaining('999888'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: rejected with failureReason - should redirect to upload page with error in session', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.rejected,
        failureReason: 'File rejected by virus scanner'
      })

      const { headers, statusCode } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(`${baseUrl}/upload`)
    })

    test('status: rejected without failureReason - should redirect to upload page with default error in session', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.rejected
      })

      const { headers, statusCode } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(`${baseUrl}/upload`)
    })

    test('status: invalid - should show validation error and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(expect.stringContaining('Validation failed'))
      expect(result).toStrictEqual(
        expect.stringContaining('Please check your file and try again')
      )
      expect(result).not.toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid with failureReason - should show specific error message and stop polling', async () => {
      const failureReason =
        'The waste registration number in your summary log does not match your registration'
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid,
        failureReason
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(expect.stringContaining('Validation failed'))
      expect(result).toStrictEqual(expect.stringContaining(failureReason))
      expect(result).not.toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('error handling', () => {
    test('should treat 404 as preprocessing and continue polling', async () => {
      const error = new Error('Backend returned 404: Not Found')
      error.status = StatusCodes.NOT_FOUND
      fetchSummaryLogStatus.mockRejectedValueOnce(error)

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being uploaded')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('should show error page and stop polling when backend fetch fails', async () => {
      fetchSummaryLogStatus.mockRejectedValueOnce(new Error('Network error'))

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Error checking status')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Unable to check upload status')
      )
      expect(result).not.toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
