import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { initUpload } from '~/src/server/common/helpers/upload/init-upload.js'
import { createServer } from '~/src/server/index.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

const uploadId = 'abc123'

vi.mock('~/src/server/common/helpers/upload/init-upload.js', () => ({
  initUpload: vi.fn().mockResolvedValue({
    uploadId: 'abc123'
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

const yar = {
  get: vi.fn(),
  set: vi.fn()
}

describe('#summaryLogUploadController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url
    })

    expect(result).toEqual(expect.stringContaining('Summary log: upload |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('should store uploadId in the summaryLog session', async () => {
    overrideRequest(server, yar)

    await server.inject({ method: 'GET', url })

    expect(yar.set).toHaveBeenCalledWith(
      'summaryLogs',
      expect.objectContaining({ uploadId })
    )
  })

  test('should redirect to error', async () => {
    initUpload.mockRejectedValueOnce(new Error('Mock error'))

    const { result } = await server.inject({ method: 'GET', url })

    expect(result).toEqual(expect.stringContaining('Summary log upload error'))
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
