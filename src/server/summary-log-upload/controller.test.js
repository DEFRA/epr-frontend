import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { createServer } from '#server/index.js'

vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn().mockResolvedValue({
      uploadUrl: 'http://cdp/upload',
      uploadId: 'cdp-upload-123'
    })
  })
)

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

  test('should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url
    })

    expect(result).toStrictEqual(
      expect.stringContaining('Summary log: upload |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('should redirect to error', async () => {
    initiateSummaryLogUpload.mockRejectedValueOnce(new Error('Mock error'))

    const { result } = await server.inject({ method: 'GET', url })

    expect(result).toStrictEqual(
      expect.stringContaining('Summary log upload error')
    )
  })

  test('should call initiateSummaryLogUpload with organisation, registration and redirectUrl template', async () => {
    await server.inject({ method: 'GET', url })

    expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
      organisationId: '123',
      registrationId: '456',
      redirectUrl:
        '/organisations/123/registrations/456/summary-logs/{summaryLogId}'
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
