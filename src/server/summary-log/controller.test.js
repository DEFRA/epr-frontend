import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { StatusCodes } from 'http-status-codes'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { backendSummaryLogStatuses } from '../common/constants/statuses.js'
import { buildLoadsViewModel } from './controller.js'

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

    test('status: validated with new loads - should show new loads heading', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: [1092, 1093, 1094, 1095, 1096, 1097, 1098],
            invalid: [1099, 1100]
          },
          unchanged: { valid: [], invalid: [] },
          adjusted: { valid: [], invalid: [] }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show total new loads (valid + invalid) in heading
      expect(result).toStrictEqual(
        expect.stringContaining('There are 9 new loads')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '7 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '2 new loads will not be added to your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with no new loads - should show no new loads heading', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: { valid: [], invalid: [] },
          unchanged: { valid: [], invalid: [] },
          adjusted: { valid: [1096, 1099, 1100], invalid: [] }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are no new loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with adjusted loads - should show adjusted loads section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: { valid: [], invalid: [] },
          unchanged: { valid: [], invalid: [] },
          adjusted: { valid: [1096, 1099, 1100], invalid: [] }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are 3 adjusted loads')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'All adjustments will be reflected in your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with row IDs - should display row IDs in bullet list', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: { valid: [1092, 1093, 1094], invalid: [] },
          unchanged: { valid: [], invalid: [] },
          adjusted: { valid: [], invalid: [] }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Row IDs should be in bullet list
      expect(result).toStrictEqual(expect.stringContaining('<li>1092</li>'))
      expect(result).toStrictEqual(expect.stringContaining('<li>1093</li>'))
      expect(result).toStrictEqual(expect.stringContaining('<li>1094</li>'))
      expect(result).toStrictEqual(
        expect.stringContaining('found in the &#39;Row ID&#39; column')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with singular load - should use singular form', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: { valid: [1092], invalid: [] },
          unchanged: { valid: [], invalid: [] },
          adjusted: { valid: [1093], invalid: [] }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There is 1 new load')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('There is 1 adjusted load')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated without adjusted loads - should not show adjusted section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: { valid: [1092, 1093, 1094, 1095, 1096], invalid: [] },
          unchanged: { valid: [], invalid: [] },
          adjusted: { valid: [], invalid: [] }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should not show adjusted loads section when count is 0
      expect(result).not.toStrictEqual(
        expect.stringContaining('adjusted loads')
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

describe('#buildLoadsViewModel', () => {
  test('returns empty arrays and zero totals when loads is undefined', () => {
    const result = buildLoadsViewModel(undefined)

    expect(result).toStrictEqual({
      added: { valid: [], invalid: [], total: 0 },
      adjusted: { valid: [], invalid: [], total: 0 }
    })
  })

  test('returns empty arrays and zero totals when loads is null', () => {
    const result = buildLoadsViewModel(null)

    expect(result).toStrictEqual({
      added: { valid: [], invalid: [], total: 0 },
      adjusted: { valid: [], invalid: [], total: 0 }
    })
  })

  test('returns empty arrays and zero totals when loads has empty arrays', () => {
    const result = buildLoadsViewModel({
      added: { valid: [], invalid: [] },
      unchanged: { valid: [], invalid: [] },
      adjusted: { valid: [], invalid: [] }
    })

    expect(result).toStrictEqual({
      added: { valid: [], invalid: [], total: 0 },
      adjusted: { valid: [], invalid: [], total: 0 }
    })
  })

  test('calculates totals correctly for added loads', () => {
    const result = buildLoadsViewModel({
      added: { valid: [1001, 1002, 1003], invalid: [1004, 1005] },
      unchanged: { valid: [], invalid: [] },
      adjusted: { valid: [], invalid: [] }
    })

    expect(result.added).toStrictEqual({
      valid: [1001, 1002, 1003],
      invalid: [1004, 1005],
      total: 5
    })
  })

  test('calculates totals correctly for adjusted loads', () => {
    const result = buildLoadsViewModel({
      added: { valid: [], invalid: [] },
      unchanged: { valid: [], invalid: [] },
      adjusted: { valid: [2001, 2002], invalid: [2003] }
    })

    expect(result.adjusted).toStrictEqual({
      valid: [2001, 2002],
      invalid: [2003],
      total: 3
    })
  })

  test('handles partial loads data gracefully', () => {
    const result = buildLoadsViewModel({
      added: { valid: [1001] }
      // missing invalid, unchanged, adjusted
    })

    expect(result).toStrictEqual({
      added: { valid: [1001], invalid: [], total: 1 },
      adjusted: { valid: [], invalid: [], total: 0 }
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
