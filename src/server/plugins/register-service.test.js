import hapi from '@hapi/hapi'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerService } from './register-service.js'

describe('#registerService', () => {
  let server

  beforeEach(async () => {
    server = hapi.server({ port: 0 })
  })

  afterEach(async () => {
    await server.stop()
  })

  it('should register a service on the request object', async () => {
    const mockService = { getData: vi.fn().mockReturnValue('test-data') }

    registerService(server, 'testService', () => mockService)

    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        return { result: request.testService.getData() }
      },
      options: { auth: false }
    })

    await server.initialize()

    const response = await server.inject({ method: 'GET', url: '/test' })
    const result = JSON.parse(response.payload)

    expect(result.result).toBe('test-data')
  })

  it('should cache the service instance per request', async () => {
    const getInstance = vi.fn().mockReturnValue({ value: 'cached' })

    registerService(server, 'cachedService', getInstance)

    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        const first = request.cachedService
        const second = request.cachedService
        return { same: first === second }
      },
      options: { auth: false }
    })

    await server.initialize()

    const response = await server.inject({ method: 'GET', url: '/test' })
    const result = JSON.parse(response.payload)

    expect(result.same).toBe(true)
    expect(getInstance).toHaveBeenCalledTimes(1)
  })

  it('should pass the request to getInstance', async () => {
    const getInstance = vi.fn().mockReturnValue({ value: 'test' })

    registerService(server, 'requestService', getInstance)

    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        return { accessed: !!request.requestService }
      },
      options: { auth: false }
    })

    await server.initialize()

    await server.inject({ method: 'GET', url: '/test' })

    expect(getInstance).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/test' })
    )
  })
})
