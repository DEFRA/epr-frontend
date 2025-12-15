import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

describe('#registrationController', () => {
  const organisationId = '123'
  const registrationId = '456'
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
      url: `/organisations/${organisationId}/registrations/${registrationId}`
    })

    expect(result).toStrictEqual(expect.stringContaining('Registration |'))
    expect(statusCode).toBe(statusCodes.ok)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
