import hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

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
  const PROCESS_ENV = process.env
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport

  beforeAll(async () => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3097' // Set to obscure port to avoid conflicts

    createServerImport = await import('#server/index.js')
    startServerImport = await import('#server/common/helpers/start-server.js')

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(() => {
    process.env = PROCESS_ENV
  })

  describe('when server starts', () => {
    let server

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('should start up server as expected', async () => {
      server = await startServerImport.startServer()

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

    test('should log failed startup message', async () => {
      await startServerImport.startServer()

      expect(mockLoggerInfo).toHaveBeenCalledExactlyOnceWith(
        'Server failed to start :('
      )
      expect(mockLoggerError).toHaveBeenCalledExactlyOnceWith(
        Error('Server failed to start')
      )
    })
  })
})
