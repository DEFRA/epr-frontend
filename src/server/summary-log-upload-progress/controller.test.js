import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { createServer } from '~/src/server/index.js'
import { fetchStatus } from '~/src/server/common/helpers/upload/fetch-status.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

vi.mock('~/src/server/common/helpers/upload/fetch-status.js', () => ({
  fetchStatus: vi.fn().mockResolvedValue({
    uploadStatus: 'pending'
  })
}))

function overrideRequest(server, yar) {
  server.ext({
    type: 'onRequest',
    method: (request, h) => {
      request.yar.get = yar.get
      request.yar.set = yar.set

      return h.continue
    }
  })
}

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
  const url = `${baseUrl}/progress`
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const yar = {
    get: vi.fn(),
    set: vi.fn()
  }

  test('should provide expected response', async () => {
    overrideRequest(server, yar)

    const { result, statusCode } = await server.inject({ method: 'GET', url })

    expect(yar.get).toHaveBeenCalledWith('summaryLogs')
    expect(result).toEqual(
      expect.stringContaining('Summary log: upload progress |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('status: initiated - should call fetchStatus', async () => {
    const uploadId = '123'

    yar.get.mockImplementationOnce(() => ({
      uploadId,
      summaryLogStatus: 'initiated'
    }))

    overrideRequest(server, yar)

    const { result, statusCode } = await server.inject({ method: 'GET', url })

    expect(fetchStatus).toHaveBeenCalledWith(uploadId)
    expect(result).toEqual(
      expect.stringContaining('Your file is being uploaded')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('status: initiated - should set summaryLogStatus to uploaded', async () => {
    const uploadId = '123'

    yar.get.mockImplementationOnce(() => ({
      uploadId,
      summaryLogStatus: 'initiated'
    }))

    fetchStatus.mockResolvedValueOnce({ uploadStatus: 'ready' })

    overrideRequest(server, yar)

    await server.inject({ method: 'GET', url })

    expect(yar.set).toHaveBeenCalledWith(
      'summaryLogs',
      expect.objectContaining({ summaryLogStatus: 'uploaded' })
    )
  })

  test('status: uploaded - should set summaryLogStatus to validating', async () => {
    yar.get.mockImplementationOnce(() => ({
      summaryLogStatus: 'uploaded'
    }))

    overrideRequest(server, yar)

    const { result, statusCode } = await server.inject({ method: 'GET', url })

    expect(yar.set).toHaveBeenCalledWith(
      'summaryLogs',
      expect.objectContaining({ summaryLogStatus: 'validating' })
    )
    expect(result).toEqual(
      expect.stringContaining('Your file is being validated')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('status: validationSucceeded - should redirect to review', async () => {
    yar.get.mockImplementationOnce(() => ({
      summaryLogStatus: 'validationSucceeded'
    }))

    overrideRequest(server, yar)

    const { statusCode, headers } = await server.inject({ method: 'GET', url })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${baseUrl}/review`)
  })

  test('should redirect to error', async () => {
    yar.get.mockImplementationOnce(() => ({
      summaryLogStatus: 'initiated'
    }))

    fetchStatus.mockRejectedValueOnce(new Error('Mock error'))

    overrideRequest(server, yar)

    const { result } = await server.inject({ method: 'GET', url })

    expect(result).toEqual(expect.stringContaining('Summary log upload error'))
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
