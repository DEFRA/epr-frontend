import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { fetchSummaryLogStatus } from '~/src/server/common/helpers/upload/fetch-summary-log-status.js'
import { createServer } from '~/src/server/index.js'
import { backendSummaryLogStatuses } from '../common/constants/statuses.js'

vi.mock(
  import('~/src/server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs`
  const summaryLogBaseUrl = `${baseUrl}/${summaryLogId}`
  const url = `${summaryLogBaseUrl}/progress`
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
    expect(result).toStrictEqual(
      expect.stringContaining('Summary log: upload progress |')
    )
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
      expect(result).toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
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
      expect(result).toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('terminal states', () => {
    test('status: validated - should show success message and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Validation complete')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Your file is ready to submit')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('Keep this page open')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: submitted - should show success message and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitted
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Submission complete')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Your waste records have been updated')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: rejected with failureReason - should show error message and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.rejected,
        failureReason: 'File rejected by virus scanner'
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(expect.stringContaining('Upload failed'))
      expect(result).toStrictEqual(
        expect.stringContaining('File rejected by virus scanner')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: rejected without failureReason - should show default error message', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.rejected
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(expect.stringContaining('Upload failed'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          'Something went wrong with your file upload. Please try again.'
        )
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(statusCode).toBe(statusCodes.ok)
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
      expect(result).not.toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('error handling', () => {
    test('should show error page and stop polling when backend fetch fails', async () => {
      fetchSummaryLogStatus.mockRejectedValueOnce(new Error('Network error'))

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Error checking status')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Unable to check upload status')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
