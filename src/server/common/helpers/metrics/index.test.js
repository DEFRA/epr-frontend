import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageResolution, Unit } from 'aws-embedded-metrics'

import { JOURNEY } from './constants.js'
import { journeyMetrics, metrics } from './index.js'
import { config } from '#config/config.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'

const mockPutMetric = vi.fn()
const mockFlush = vi.fn()
const mockPutDimensions = vi.fn()
const mockSetDimensions = vi.fn()
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
          setDimensions: mockSetDimensions,
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
    const attempt = 'note-1'

    const createYar = (session = new Map()) => ({
      get: vi.fn((key) => session.get(key)),
      set: vi.fn((key, value) => session.set(key, value)),
      clear: vi.fn((key) => session.delete(key))
    })

    const createRequest = (yar = createYar()) =>
      /** @type {never} */ (/** @type {unknown} */ ({ yar }))

    beforeEach(() => {
      vi.clearAllMocks()
      config.set('isMetricsEnabled', true)
    })

    it('should record a start under a single metric name', async () => {
      await journeyMetrics.start(
        createRequest(),
        JOURNEY.uploadSummaryLog,
        attempt
      )

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionStart',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it('should record an end under a single metric name', async () => {
      const request = createRequest()
      await journeyMetrics.start(request, JOURNEY.uploadSummaryLog, attempt)

      await journeyMetrics.end(request, JOURNEY.uploadSummaryLog, attempt)

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionEnd',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it('should carry the start value as the journey dimension', async () => {
      await journeyMetrics.start(createRequest(), JOURNEY.createPrn, attempt)

      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'SaveDraftPRNStart' },
        false
      )
    })

    it('should not carry the library default dimensions', async () => {
      await journeyMetrics.start(createRequest(), JOURNEY.createPrn, attempt)

      expect(mockPutDimensions).not.toHaveBeenCalled()
    })

    it('should carry the end value as the journey dimension', async () => {
      const request = createRequest()
      await journeyMetrics.start(request, JOURNEY.issuePrn, attempt)

      await journeyMetrics.end(request, JOURNEY.issuePrn, attempt)

      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'IssuePRNEnd' },
        false
      )
    })

    it('should record a start only once per attempt', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.createReport, attempt)
      await journeyMetrics.start(request, JOURNEY.createReport, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
    })

    it('should count a fresh start once the journey has ended', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.createReport, attempt)
      await journeyMetrics.end(request, JOURNEY.createReport, attempt)
      await journeyMetrics.start(request, JOURNEY.createReport, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(3)
    })

    it('should track each journey separately', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.createReport, attempt)
      await journeyMetrics.start(request, JOURNEY.uploadSummaryLog, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })

    it('should record a start per attempt at the same journey', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.deleteReport, 'report-1')
      await journeyMetrics.start(request, JOURNEY.deleteReport, 'report-2')

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })

    it('should not record an end for an attempt that never started', async () => {
      await journeyMetrics.end(createRequest(), JOURNEY.deleteReport, attempt)

      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    it('should not record an end for a different attempt at the same journey', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.cancelPrn, 'note-1')
      await journeyMetrics.end(request, JOURNEY.cancelPrn, 'note-2')

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
    })

    it('should record only one end per start', async () => {
      const request = createRequest()

      await journeyMetrics.start(request, JOURNEY.cancelPrn, attempt)
      await journeyMetrics.end(request, JOURNEY.cancelPrn, attempt)
      await journeyMetrics.end(request, JOURNEY.cancelPrn, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })

    it('should not touch the session when metrics are disabled', async () => {
      config.set('isMetricsEnabled', false)
      const yar = createYar()
      const request = createRequest(yar)

      await journeyMetrics.start(request, JOURNEY.createReport, attempt)
      await journeyMetrics.end(request, JOURNEY.createReport, attempt)

      expect(mockFlush).not.toHaveBeenCalled()
      expect(yar.get).not.toHaveBeenCalled()
      expect(yar.set).not.toHaveBeenCalled()
      expect(yar.clear).not.toHaveBeenCalled()
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
