import { Cluster, Redis } from 'ioredis'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { buildRedisClient } from '#server/common/helpers/redis-client.js'

const mockLoggerError = vi.fn()
const mockLoggerInfo = vi.fn()

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({
    error: mockLoggerError,
    info: mockLoggerInfo
  })
}))

const eventHandlers = {}

vi.mock(import('ioredis'), async () => ({
  ...(await vi.importActual('ioredis')),
  Cluster: vi.fn(function () {
    return {
      on: (event, cb) => {
        eventHandlers[event] = cb
      }
    }
  }),
  Redis: vi.fn(function () {
    return {
      on: (event, cb) => {
        eventHandlers[event] = cb
      }
    }
  })
}))

describe('#buildRedisClient', () => {
  describe('when Redis Single InstanceCache is requested', () => {
    beforeEach(() => {
      buildRedisClient(config.get('redis'))
    })

    test('should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledExactlyOnceWith({
        db: 0,
        host: '127.0.0.1',
        keyPrefix: 'epr-frontend:',
        port: 6379
      })
    })
  })

  describe('when a Redis Cluster is requested', () => {
    beforeEach(() => {
      buildRedisClient({
        ...config.get('redis'),
        useSingleInstanceCache: false,
        useTLS: true,
        username: 'user',
        password: 'pass'
      })
    })

    test('should instantiate a Redis Cluster client', () => {
      expect(Cluster).toHaveBeenCalledExactlyOnceWith(
        [{ host: '127.0.0.1', port: 6379 }],
        {
          dnsLookup: expect.any(Function),
          keyPrefix: 'epr-frontend:',
          redisOptions: { db: 0, password: 'pass', tls: {}, username: 'user' },
          slotsRefreshTimeout: 10000
        }
      )
    })
  })

  describe('when redis emits an error event', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      buildRedisClient(config.get('redis'))
    })

    test('should log the connection error in canonical shape', () => {
      const error = new Error('redis exploded')
      eventHandlers.error(error)

      expect(mockLoggerError).toHaveBeenCalledExactlyOnceWith({
        message: 'Redis connection error',
        err: error
      })
    })
  })
})
