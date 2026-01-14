import { config } from '#config/config.js'
import { startServer } from '#server/common/helpers/start-server.js'
import * as serverIndex from '#server/index.js'
import { it } from '#vite/fixtures/server.js'
import hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

const mockHapiLoggerInfo = vi.fn()
const mockHapiLoggerError = vi.fn()

vi.mock(import('hapi-pino'), () => ({
  default: {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: mockHapiLoggerInfo,
        error: mockHapiLoggerError
      })
    },
    name: 'mock-hapi-pino'
  }
}))

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('#startServer', () => {
  let createServerSpy
  let hapiServerSpy

  beforeAll(() => {
    config.set('port', 3097)
    createServerSpy = vi.spyOn(serverIndex, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(() => {
    config.reset('port')
  })

  describe('when server starts', () => {
    /** @type {import('@hapi/hapi').Server | undefined} */
    let server

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    it('should start up server as expected', async () => {
      server = await startServer()

      expect(createServerSpy).toHaveBeenCalledExactlyOnceWith()
      expect(hapiServerSpy).toHaveBeenCalledExactlyOnceWith(expect.any(Object))
      expect(mockLoggerInfo).toHaveBeenCalledExactlyOnceWith(
        'Using Catbox Memory session cache'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        1,
        'Custom secure context is disabled'
      )
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        2,
        'Server started successfully'
      )
      // eslint-disable-next-line vitest/max-expects
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(
        3,
        'Access your frontend on http://localhost:3097'
      )
    })
  })

  describe('when server start fails', () => {
    beforeAll(() => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))
    })

    it('should log failed startup message', async () => {
      await startServer()

      expect(mockLoggerInfo).toHaveBeenCalledExactlyOnceWith(
        'Server failed to start :('
      )
      expect(mockLoggerError).toHaveBeenCalledExactlyOnceWith(
        Error('Server failed to start')
      )
    })
  })
})
