import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn(async () => ({
      uploadUrl: 'http://cdp/upload',
      uploadId: 'cdp-upload-123'
    }))
  })
)

describe('#summaryLogUploadController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
  /** @type {Server} */
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  beforeAll(async () => {
    mockOidcServer.listen()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    mockOidcServer.close()
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

    expect(initiateSummaryLogUpload).toHaveBeenCalledWith(expect.anything(), {
      organisationId: '123',
      registrationId: '456',
      redirectUrl:
        '/organisations/123/registrations/456/summary-logs/{summaryLogId}'
    })
  })

  test('should show conflict error when submission is in progress', async () => {
    initiateSummaryLogUpload.mockRejectedValueOnce(
      Boom.conflict('A submission is in progress. Please wait.')
    )

    const { result, statusCode } = await server.inject({ method: 'GET', url })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toStrictEqual(
      expect.stringContaining('A submission is in progress')
    )
    expect(result).toStrictEqual(
      expect.stringContaining(
        'Please wait until the current submission is complete'
      )
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
