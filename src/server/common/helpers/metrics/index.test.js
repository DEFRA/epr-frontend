import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageResolution, Unit } from 'aws-embedded-metrics'

import { TRANSACTION } from './constants.js'
import { journeyMetrics, metrics } from './index.js'
import { config } from '#config/config.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'

const mockPutMetric = vi.fn()
const mockFlush = vi.fn()
const mockPutDimensions = vi.fn()
const mockLogger = createMockLogger()

vi.mock(import('aws-embedded-metrics'), async (importOriginal) => {
  const original = await importOriginal()

  return {
    ...original,
    createMetricsLogger: () =>
      /** @type {never} */ (
        /** @type {unknown} */ ({
          putMetric: mockPutMetric,
          putDimensions: mockPutDimensions,
          flush: mockFlush
        })
      )
  }
})

vi.mock(import('#server/common/helpers/logging/logger.js'), () => ({
  createLogger: () => mockLogger
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

      await metrics[metricName]('oidc-provider-name')

      expect(mockPutMetric).toHaveBeenCalledWith(
        metricName,
        1,
        Unit.Count,
        StorageResolution.Standard
      )
      expect(mockFlush).toHaveBeenCalledWith()
    })

    it.each(metricsNames)(
      'attaches provider as a dimension - %s',
      async (metricName) => {
        config.set('isMetricsEnabled', true)

        await metrics[metricName]('oidc-provider-name')

        expect(mockPutDimensions).toHaveBeenCalledWith({
          oidcProvider: 'oidc-provider-name'
        })
      }
    )
  })

  describe('journey events', () => {
    beforeEach(() => {
      config.set('isMetricsEnabled', true)
    })

    it('should record a transaction start under a single metric name', async () => {
      await journeyMetrics.start(TRANSACTION.uploadSummaryLogStart)

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionStart',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it('should record a transaction end under a single metric name', async () => {
      await journeyMetrics.end(TRANSACTION.uploadSummaryLogEnd)

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionEnd',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it.for([
      ['start', TRANSACTION.saveOrIssuePrnPernStart],
      ['end', TRANSACTION.issuePrnPernEnd],
      ['end', TRANSACTION.saveDraftPrnPernEnd]
    ])(
      'should carry %s transaction %s as the journey dimension',
      async ([phase, transaction]) => {
        await journeyMetrics[phase](transaction)

        expect(mockPutDimensions).toHaveBeenCalledWith({ journey: transaction })
      }
    )

    it('should not record when metrics are disabled', async () => {
      config.set('isMetricsEnabled', false)

      await journeyMetrics.start(TRANSACTION.saveOrSubmitReportStart)

      expect(mockFlush).not.toHaveBeenCalled()
    })
  })

  describe('when metrics throws', () => {
    it.each(metricsNames)('logs expected error - %s', async (metricName) => {
      config.set('isMetricsEnabled', true)

      const mockError = 'mock-metrics-put-error'
      mockFlush.mockRejectedValue(new Error(mockError))

      await metrics[metricName]()

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: mockError,
        err: Error(mockError)
      })
    })
  })
})
