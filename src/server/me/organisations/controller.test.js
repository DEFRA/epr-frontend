import { statusCodes } from '#server/common/constants/status-codes.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

describe('/me/organisations controller', () => {
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
      url: '/me/organisations'
    })

    expect(result).toStrictEqual({
      organisations: {
        linked: {},
        unlinked: {}
      }
    })
    expect(statusCode).toBe(statusCodes.ok)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
