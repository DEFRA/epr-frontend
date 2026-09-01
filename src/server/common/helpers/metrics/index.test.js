import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageResolution, Unit } from 'aws-embedded-metrics'

import { JOURNEY } from './constants.js'
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
    const createRequest = (session = new Map()) =>
      /** @type {never} */ (
        /** @type {unknown} */ ({
          yar: {
            get: (key) => session.get(key),
            set: (key, value) => session.set(key, value),
            clear: (key) => session.delete(key)
          }
        })
      )

    beforeEach(() => {
      vi.clearAllMocks()
      config.set('isMetricsEnabled', true)
    })

    it('should record a start under a single metric name', async () => {
      await journeyMetrics.start(createRequest(), JOURNEY.uploadSummaryLog)

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionStart',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it('should record an end under a single metric name', async () => {
      await journeyMetrics.end(
        createRequest(),
        JOURNEY.uploadSummaryLog,
        'uploaded'
      )

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionEnd',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it('should carry the start value as the journey dimension', async () => {
      await journeyMetrics.start(createRequest(), JOURNEY.saveOrIssuePrnPern)

      expect(mockPutDimensions).toHaveBeenCalledWith({
        journey: 'SaveOrIssuePRNPERNStart'
      })
    })

    it.each(
      /** @type {const} */ ([
        ['issued', 'IssuePRNPERNEnd'],
        ['draft', 'SaveDraftPRNPERNEnd']
      ])
    )(
      'should carry the %s outcome as the journey dimension',
      async (outcome, expected) => {
        await journeyMetrics.end(
          createRequest(),
          JOURNEY.saveOrIssuePrnPern,
          outcome
        )

        expect(mockPutDimensions).toHaveBeenCalledWith({ journey: expected })
      }
    )

    it('should record a start only once per attempt', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.saveOrSubmitReport)
      await journeyMetrics.start(request, JOURNEY.saveOrSubmitReport)

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
    })

    it('should count a fresh start once the journey has ended', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.saveOrSubmitReport)
      await journeyMetrics.end(request, JOURNEY.saveOrSubmitReport, 'submitted')
      await journeyMetrics.start(request, JOURNEY.saveOrSubmitReport)

      expect(mockPutMetric).toHaveBeenCalledTimes(3)
    })

    it('should track each journey separately', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.saveOrSubmitReport)
      await journeyMetrics.start(request, JOURNEY.uploadSummaryLog)

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })

    it('should not record when metrics are disabled', async () => {
      config.set('isMetricsEnabled', false)

      await journeyMetrics.start(createRequest(), JOURNEY.saveOrSubmitReport)

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
