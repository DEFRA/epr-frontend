import { StorageResolution, Unit } from 'aws-embedded-metrics'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '~/src/config/config.js'
import { metricsCounter } from '~/src/server/common/helpers/metrics.js'

const mockPutMetric = vi.fn()
const mockFlush = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('aws-embedded-metrics', async () => ({
  ...(await vi.importActual('aws-embedded-metrics')),
  createMetricsLogger: () => ({
    putMetric: mockPutMetric,
    flush: mockFlush
  })
}))
vi.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

const mockMetricsName = 'mock-metrics-name'
const defaultMetricsValue = 1
const mockValue = 200

describe('#metrics', () => {
  describe('when metrics is not enabled', () => {
    beforeEach(async () => {
      config.set('isMetricsEnabled', false)
      await metricsCounter(mockMetricsName, mockValue)
    })

    test('should not call metric', () => {
      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    test('should not call flush', () => {
      expect(mockFlush).not.toHaveBeenCalled()
    })
  })

  describe('when metrics is enabled', () => {
    beforeEach(() => {
      config.set('isMetricsEnabled', true)
    })

    test('should send metric with default value', async () => {
      await metricsCounter(mockMetricsName)

      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        defaultMetricsValue,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    test('should send metric', async () => {
      await metricsCounter(mockMetricsName, mockValue)

      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    test('should not call flush', async () => {
      await metricsCounter(mockMetricsName, mockValue)

      expect(mockFlush).toHaveBeenCalledWith()
    })
  })

  describe('when metrics throws', () => {
    const mockError = 'mock-metrics-put-error'

    beforeEach(async () => {
      config.set('isMetricsEnabled', true)
      mockFlush.mockRejectedValue(new Error(mockError))

      await metricsCounter(mockMetricsName, mockValue)
    })

    test('should log expected error', () => {
      expect(mockLoggerError).toHaveBeenCalledWith(Error(mockError), mockError)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
