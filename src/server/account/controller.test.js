import { statusCodes } from '#server/common/constants/status-codes.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

describe('#accountController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should provide expected response with correct status', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/account'
    })

    expect(result).toStrictEqual(expect.stringContaining('Home |'))
    expect(statusCode).toBe(statusCodes.ok)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
