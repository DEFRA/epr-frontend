import { Engine as CatboxMemory } from '@hapi/catbox-memory'
import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { getCacheEngine } from '#server/common/helpers/session-cache/cache-engine.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'

const mockLogger = createMockLogger()

vi.mock(import('ioredis'), async () => ({
  ...(await vi.importActual('ioredis')),
  Cluster: /** @type {never} */ (
    /** @type {unknown} */ (
      vi.fn(function () {
        return { on: () => ({}) }
      })
    )
  ),
  Redis: /** @type {never} */ (
    /** @type {unknown} */ (
      vi.fn(function () {
        return { on: () => ({}) }
      })
    )
  )
}))
vi.mock(import('@hapi/catbox-redis'))
vi.mock(import('@hapi/catbox-memory'))
vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => mockLogger
}))

describe('#getCacheEngine', () => {
  describe('when Redis cache engine has been requested', () => {
    beforeEach(() => {
      getCacheEngine('redis')
    })

    test('should setup Redis cache', () => {
      expect(CatboxRedis).toHaveBeenCalledExactlyOnceWith(expect.any(Object))
    })

    test('should log expected Redis message', () => {
      expect(mockLogger.info).toHaveBeenCalledExactlyOnceWith({
        message: 'Using Redis session cache'
      })
    })
  })

  describe('when In memory cache engine has been requested', () => {
    beforeEach(() => {
      getCacheEngine()
    })

    test('should setup In memory cache', () => {
      expect(CatboxMemory).toHaveBeenCalledTimes(1)
    })

    test('should log expected CatBox memory message', () => {
      expect(mockLogger.info).toHaveBeenCalledExactlyOnceWith({
        message: 'Using Catbox Memory session cache'
      })
    })
  })

  describe('when In memory cache engine has been requested in Production', () => {
    beforeEach(() => {
      config.set('isProduction', true)
      getCacheEngine()
    })

    test('should log Production warning message', () => {
      expect(mockLogger.error).toHaveBeenCalledExactlyOnceWith({
        message:
          'Catbox Memory is for local development only, it should not be used in production!'
      })
    })

    test('should setup In memory cache', () => {
      expect(CatboxMemory).toHaveBeenCalledTimes(1)
    })

    test('should log expected message', () => {
      expect(mockLogger.info).toHaveBeenCalledExactlyOnceWith({
        message: 'Using Catbox Memory session cache'
      })
    })
  })
})
