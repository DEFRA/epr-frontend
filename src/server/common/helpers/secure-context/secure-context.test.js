import hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { config } from '~/src/config/config.js'
import { requestLogger } from '../logging/request-logger.js'
import { secureContext } from './secure-context.js'

const mockAddCACert = vi.fn()
const mockCreateSecureContext = vi
  .fn()
  .mockReturnValue({ context: { addCACert: mockAddCACert } })

vi.mock(import('hapi-pino'), () => ({
  default: {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: vi.fn(),
        error: vi.fn()
      })
    },
    name: 'mock-hapi-pino'
  }
}))

vi.mock(import('node:tls'), async () => {
  const nodeTls = await import('node:tls')

  return {
    default: {
      ...nodeTls,
      createSecureContext: (...args) => mockCreateSecureContext(...args)
    }
  }
})

describe(secureContext, () => {
  let server

  describe('when secure context is disabled', () => {
    beforeEach(async () => {
      config.set('isSecureContextEnabled', false)
      server = hapi.server()
      await server.register([requestLogger, secureContext])
    })

    afterEach(async () => {
      config.set('isSecureContextEnabled', false)
      await server.stop({ timeout: 0 })
    })

    test('secureContext decorator should not be available', () => {
      expect(server.logger.info).toHaveBeenCalledExactlyOnceWith(
        'Custom secure context is disabled'
      )
    })

    test('logger should give us disabled message', () => {
      expect(server.secureContext).toBeUndefined()
    })
  })

  describe('when secure context is enabled', () => {
    const PROCESS_ENV = process.env
    const mockCert = 'mock-trust-store-cert-one'

    beforeAll(() => {
      process.env = { ...PROCESS_ENV }
      process.env.TRUSTSTORE_ONE = mockCert
    })

    beforeEach(async () => {
      config.set('isSecureContextEnabled', true)
      server = hapi.server()
      await server.register([requestLogger, secureContext])
    })

    afterEach(async () => {
      config.set('isSecureContextEnabled', false)
      await server.stop({ timeout: 0 })
    })

    afterAll(() => {
      process.env = PROCESS_ENV
    })

    test('original tls.createSecureContext should have been called', () => {
      expect(mockCreateSecureContext).toHaveBeenCalledExactlyOnceWith({})
    })

    test('addCACert should have been called', () => {
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(mockAddCACert).toHaveBeenCalledWith(
        Buffer.from(mockCert, 'base64').toString()
      )
    })

    test('secureContext decorator should be available', () => {
      expect(server.secureContext).toStrictEqual({
        context: { addCACert: expect.any(Function) }
      })
    })
  })

  describe('when secure context is enabled without TRUSTSTORE_ certs', () => {
    beforeEach(async () => {
      config.set('isSecureContextEnabled', true)
      server = hapi.server()
      await server.register([requestLogger, secureContext])
    })

    afterEach(async () => {
      config.set('isSecureContextEnabled', false)
      await server.stop({ timeout: 0 })
    })

    test('should log about not finding any TRUSTSTORE_ certs', () => {
      expect(server.logger.info).toHaveBeenCalledExactlyOnceWith(
        'Could not find any TRUSTSTORE_ certificates'
      )
    })
  })
})
