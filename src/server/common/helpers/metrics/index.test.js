import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageResolution, Unit } from 'aws-embedded-metrics'

import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { JOURNEY } from './constants.js'

/**
 * @import { Yar } from '@hapi/yar'
 * @import { AuthMetricName } from './constants.js'
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

/**
 * Group, method, and the name it emits -- the mapping is the CloudWatch
 * contract, so it is spelled out here rather than derived from the source.
 * @type {readonly ['signIn' | 'signOut', string, AuthMetricName][]}
 */
const authMetrics = [
  ['signIn', 'attempted', 'signInAttempted'],
  ['signIn', 'success', 'signInSuccess'],
  ['signIn', 'successNonInitialUser', 'signInSuccessNonInitialUser'],
  ['signIn', 'failure', 'signInFailure'],
  ['signOut', 'success', 'signOutSuccess']
]

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

  describe('when metrics is not enabled', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ metrics } = await loadMetrics(false))
    })

    it.each(authMetrics)(
      'does not record metric - %s.%s',
      async (group, method) => {
        await metrics[group][method]('oidc-provider-name')

        expect(mockPutMetric).not.toHaveBeenCalled()
        expect(mockFlush).not.toHaveBeenCalled()
      }
    )

    it('does not touch the session for a journey start', async () => {
      const yar = createYar()

      await metrics.journey.start(
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

      await metrics.journey.end(createRequest(yar), JOURNEY.createReport, 'a-1')

      expect(yar.get).not.toHaveBeenCalled()
      expect(yar.clear).not.toHaveBeenCalled()
      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    it('still exposes every metric name', () => {
      expect(Object.keys(metrics)).toStrictEqual([
        'signIn',
        'signOut',
        'journey'
      ])
      expect(Object.keys(metrics.signIn)).toStrictEqual([
        'attempted',
        'success',
        'successNonInitialUser',
        'failure'
      ])
      expect(Object.keys(metrics.signOut)).toStrictEqual(['success'])
      expect(Object.keys(metrics.journey)).toStrictEqual(['start', 'end'])
    })
  })

  describe('when metrics is enabled', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ metrics } = await loadMetrics(true))
    })

    it.each(authMetrics)(
      'record metric - %s.%s',
      async (group, method, metricName) => {
        await metrics[group][method]('oidc-provider-name')

        expect(mockPutMetric).toHaveBeenCalledWith(
          metricName,
          1,
          Unit.Count,
          StorageResolution.Standard
        )
        expect(mockFlush).toHaveBeenCalledWith()
      }
    )

    it.each(authMetrics)(
      'attaches provider as a dimension - %s.%s',
      async (group, method) => {
        await metrics[group][method]('oidc-provider-name')

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
      ;({ metrics } = await loadMetrics(true))
    })

    it('should record a start under a single metric name', async () => {
      await metrics.journey.start(
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
      await metrics.journey.start(request, JOURNEY.uploadSummaryLog, attempt)

      await metrics.journey.end(request, JOURNEY.uploadSummaryLog, attempt)

      expect(mockPutMetric).toHaveBeenCalledWith(
        'TransactionEnd',
        1,
        Unit.Count,
        StorageResolution.Standard
      )
    })

    it('should carry the start value as the journey dimension', async () => {
      await metrics.journey.start(createRequest(), JOURNEY.createPrn, attempt)

      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'SaveDraftPRNStart' },
        false
      )
    })

    it('should not carry the library default dimensions', async () => {
      await metrics.journey.start(createRequest(), JOURNEY.createPrn, attempt)

      expect(mockPutDimensions).not.toHaveBeenCalled()
    })

    it('should carry the end value as the journey dimension', async () => {
      const request = createRequest()
      await metrics.journey.start(request, JOURNEY.issuePrn, attempt)

      await metrics.journey.end(request, JOURNEY.issuePrn, attempt)

      expect(mockSetDimensions).toHaveBeenCalledWith(
        { journey: 'IssuePRNEnd' },
        false
      )
    })

    it('should record a start only once per attempt', async () => {
      const request = createRequest()

      await metrics.journey.start(request, JOURNEY.createReport, attempt)
      await metrics.journey.start(request, JOURNEY.createReport, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
    })

    it('should count a fresh start once the journey has ended', async () => {
      const request = createRequest()

      await metrics.journey.start(request, JOURNEY.createReport, attempt)
      await metrics.journey.end(request, JOURNEY.createReport, attempt)
      await metrics.journey.start(request, JOURNEY.createReport, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(3)
    })

    it('should track each journey separately', async () => {
      const request = createRequest()

      await metrics.journey.start(request, JOURNEY.createReport, attempt)
      await metrics.journey.start(request, JOURNEY.uploadSummaryLog, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })

    it('should record a start per attempt at the same journey', async () => {
      const request = createRequest()

      await metrics.journey.start(request, JOURNEY.deleteReport, 'report-1')
      await metrics.journey.start(request, JOURNEY.deleteReport, 'report-2')

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })

    it('should not record an end for an attempt that never started', async () => {
      await metrics.journey.end(createRequest(), JOURNEY.deleteReport, attempt)

      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    it('should not record an end for a different attempt at the same journey', async () => {
      const request = createRequest()

      await metrics.journey.start(request, JOURNEY.cancelPrn, 'note-1')
      await metrics.journey.end(request, JOURNEY.cancelPrn, 'note-2')

      expect(mockPutMetric).toHaveBeenCalledTimes(1)
    })

    it('should record only one end per start', async () => {
      const request = createRequest()

      await metrics.journey.start(request, JOURNEY.cancelPrn, attempt)
      await metrics.journey.end(request, JOURNEY.cancelPrn, attempt)
      await metrics.journey.end(request, JOURNEY.cancelPrn, attempt)

      expect(mockPutMetric).toHaveBeenCalledTimes(2)
    })
  })

  describe('when metrics throws', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;({ metrics } = await loadMetrics(true))
    })

    it.each(authMetrics)(
      'logs expected error - %s.%s',
      async (group, method) => {
        const mockError = 'mock-metrics-put-error'
        mockFlush.mockRejectedValueOnce(new Error(mockError))

        await metrics[group][method]('oidc-provider-name')

        expect(mockLogger.error).toHaveBeenCalledWith({
          message: mockError,
          err: Error(mockError)
        })
      }
    )
  })
})
