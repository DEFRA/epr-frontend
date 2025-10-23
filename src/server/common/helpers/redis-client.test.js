import { Cluster, Redis } from 'ioredis'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { buildRedisClient } from '#server/common/helpers/redis-client.js'

vi.mock(import('ioredis'), async () => ({
  ...(await vi.importActual('ioredis')),
  Cluster: vi.fn().mockReturnValue({ on: () => ({}) }),
  Redis: vi.fn().mockReturnValue({ on: () => ({}) })
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
})
