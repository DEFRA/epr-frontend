import { describe, expect, it, vi } from 'vitest'

import { StorageResolution, Unit } from 'aws-embedded-metrics'

import { metrics } from './index.js'
import { config } from '#config/config.js'

const mockPutMetric = vi.fn()
const mockFlush = vi.fn()
const mockLoggerError = vi.fn()

vi.mock(import('aws-embedded-metrics'), async (importOriginal) => {
  const original = await importOriginal()

  return {
    ...original,
    createMetricsLogger: () => ({
      putMetric: mockPutMetric,
      flush: mockFlush
    })
  }
})

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

describe('#metrics', () => {
  const metricsNames = Object.keys(metrics)

  describe('when metrics is not enabled', () => {
    it.each(metricsNames)('does not record metric - %s', async (name) => {
      config.set('isMetricsEnabled', false)
      await metrics[name]()

      expect(mockPutMetric).not.toHaveBeenCalled()
      expect(mockFlush).not.toHaveBeenCalled()
    })
  })

  describe('when metrics is enabled', () => {
    it.each(metricsNames)('record metric - %s', async (metricName) => {
      config.set('isMetricsEnabled', true)

      await metrics[metricName]()

      expect(mockPutMetric).toHaveBeenCalledWith(
        metricName,
        1,
        Unit.Count,
        StorageResolution.Standard
      )
      expect(mockFlush).toHaveBeenCalledWith()
    })
  })

  describe('when metrics throws', () => {
    it.each(metricsNames)('logs expected error - %s', async (metricName) => {
      config.set('isMetricsEnabled', true)

      const mockError = 'mock-metrics-put-error'
      mockFlush.mockRejectedValue(new Error(mockError))

      await metrics[metricName]()

      expect(mockLoggerError).toHaveBeenCalledWith(Error(mockError), mockError)
    })
  })
})
