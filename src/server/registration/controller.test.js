import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createServer } from '#server/index.js'

describe('#registrationController', () => {
  const organisationId = '123'
  const registrationId = '456'
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
      url: `/organisations/${organisationId}/registrations/${registrationId}`
    })

    expect(result).toStrictEqual(expect.stringContaining('Registration |'))
    expect(statusCode).toBe(statusCodes.ok)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
