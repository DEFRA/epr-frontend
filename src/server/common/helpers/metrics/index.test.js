import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageResolution, Unit } from 'aws-embedded-metrics'

import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { JOURNEY } from './constants.js'

/**
 * @import { Yar } from '@hapi/yar'
 * @import * as MetricsModule from './index.js'
 */

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

/**
 * Enablement is read once when the module is evaluated, so a scenario has to
 * choose it before the import rather than toggling config per call.
 * @param {boolean} enabled
 */
const loadMetrics = async (enabled) => {
  vi.resetModules()
  process.env.ENABLE_METRICS = String(enabled)

  try {
    return await import('./index.js')
  } finally {
    delete process.env.ENABLE_METRICS
  }
}

const metricsNames = /** @type {const} */ ([
  'signInAttempted',
  'signInSuccess',
  'signInSuccessNonInitialUser',
  'signInFailure',
  'signOutSuccess'
])

const createYar = (session = new Map()) =>
  /** @type {Pick<Yar, 'get' | 'set' | 'clear'>} */ (
    /** @type {unknown} */ ({
      get: vi.fn((key, clear) => {
        const value = session.get(key)
        if (clear) {
          session.delete(key)
        }
        return value
      }),
      set: vi.fn((key, value) => session.set(key, value)),
      clear: vi.fn((key) => session.delete(key))
    })
  )

const createRequest = (yar = createYar()) =>
  /** @type {never} */ (/** @type {unknown} */ ({ yar }))

describe('#metrics', () => {
  /** @type {typeof MetricsModule.metrics} */
  let metrics
  /** @type {typeof MetricsModule.journeyMetrics} */
  let journeyMetrics

  describe('when metrics is not enabled', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ metrics, journeyMetrics } = await loadMetrics(false))
    })

    it.each(metricsNames)('does not record metric - %s', async (name) => {
      await metrics[name]('oidc-provider-name')

      expect(mockPutMetric).not.toHaveBeenCalled()
      expect(mockFlush).not.toHaveBeenCalled()
    })

    it('does not touch the session for a journey start', async () => {
      const yar = createYar()

      await journeyMetrics.start(
        createRequest(yar),
        JOURNEY.createReport,
        'a-1'
      )

      expect(yar.get).not.toHaveBeenCalled()
      expect(yar.set).not.toHaveBeenCalled()
      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    it('does not touch the session for a journey end', async () => {
      const yar = createYar()

      await journeyMetrics.end(createRequest(yar), JOURNEY.createReport, 'a-1')

      expect(yar.get).not.toHaveBeenCalled()
      expect(yar.clear).not.toHaveBeenCalled()
      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    it('still exposes every metric name', () => {
      expect(Object.keys(metrics)).toStrictEqual([...metricsNames])
    })
  })

  describe('when metrics is enabled', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ metrics } = await loadMetrics(true))
    })

    it.each(metricsNames)('record metric - %s', async (metricName) => {
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
        await metrics[metricName]('oidc-provider-name')

        expect(mockPutDimensions).toHaveBeenCalledWith({
          oidcProvider: 'oidc-provider-name'
        })
      }
    )
  })

  describe('journey events', () => {
    const attempt = 'note-1'

    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ journeyMetrics } = await loadMetrics(true))
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
  })

  describe('when metrics throws', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ metrics } = await loadMetrics(true))
    })

    it.each(metricsNames)('logs expected error - %s', async (metricName) => {
      const mockError = 'mock-metrics-put-error'
      mockFlush.mockRejectedValueOnce(new Error(mockError))

      await metrics[metricName]('oidc-provider-name')

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: mockError,
        err: Error(mockError)
      })
    })
  })
})
