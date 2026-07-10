import { config } from '#config/config.js'
import { startServer } from '#server/common/helpers/start-server.js'
import * as serverIndex from '#server/index.js'
import { it } from '#vite/fixtures/server.js'
import hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const mockLogger = createMockLogger()

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

// start-server is imported statically, so createLogger() runs at import time --
// before mockLogger is initialised. Forward lazily rather than returning
// mockLogger directly, which would hit a temporal-dead-zone error.
vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({
    info: (...args) => mockLogger.info(...args),
    warn: (...args) => mockLogger.warn(...args),
    error: (...args) => mockLogger.error(...args),
    debug: (...args) => mockLogger.debug(...args),
    trace: (...args) => mockLogger.trace(...args),
    fatal: (...args) => mockLogger.fatal(...args)
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
    /** @type {HapiServer | undefined} */
    let server

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    it('should start up server as expected', async () => {
      server = await startServer()

      expect(createServerSpy).toHaveBeenCalledExactlyOnceWith()
      expect(hapiServerSpy).toHaveBeenCalledExactlyOnceWith(expect.any(Object))
      expect(mockLogger.info).toHaveBeenCalledExactlyOnceWith({
        message: 'Using Catbox Memory session cache'
      })
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(1, {
        message: 'Custom secure context is disabled'
      })
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(2, {
        message: 'Server started successfully'
      })
      // eslint-disable-next-line vitest/max-expects
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(3, {
        message: 'Access your frontend on http://localhost:3097'
      })
    })
  })

  describe('when server start fails', () => {
    beforeAll(() => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))
    })

    it('should log failed startup message', async () => {
      await startServer()

      expect(mockLogger.error).toHaveBeenCalledExactlyOnceWith({
        message: 'Server failed to start :(',
        err: Error('Server failed to start')
      })
    })
  })
})
