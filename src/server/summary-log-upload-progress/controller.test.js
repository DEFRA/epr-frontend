import { createServer } from '~/src/server/index.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const uploadId = '789'
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
      url: `/organisations/${organisationId}/registrations/${registrationId}/summary-log/${uploadId}/progress`
    })

    expect(result).toEqual(
      expect.stringContaining('Summary log: upload progress |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
