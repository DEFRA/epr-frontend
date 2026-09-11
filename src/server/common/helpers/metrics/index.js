import {
  createMetricsLogger,
  StorageResolution,
  Unit
} from 'aws-embedded-metrics'

import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { TRANSACTION_END, TRANSACTION_START } from './constants.js'

/**
 * @import { AuthMetricName, JourneyEntry, JourneyMetricName, MetricName } from './constants.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

const isMetricsEnabled = config.get('isMetricsEnabled')

/**
 * Aws embedded metrics wrapper
 * @param {MetricName} metricName
 * @param {Record<string, string>} dimensions
 * @param {{ replaceDefaults?: boolean }} [options] replaceDefaults drops the
 *   LogGroup, ServiceName and ServiceType the library adds of its own accord.
 *   CloudWatch identifies a series by its whole dimension set, so carrying them
 *   means a query has to name all four to match -- and one of them, the log
 *   group, differs per environment, which makes a dashboard unpromotable.
 */
async function writeMetric(metricName, dimensions, options = {}) {
  const value = 1

  try {
    const metricsLogger = createMetricsLogger()

    if (options.replaceDefaults) {
      metricsLogger.setDimensions(dimensions, false)
    } else {
      metricsLogger.putDimensions(dimensions)
    }

    metricsLogger.putMetric(
      metricName,
      value,
      Unit.Count,
      StorageResolution.Standard
    )
    await metricsLogger.flush()
  } catch (error) {
    createLogger().error({ message: error.message, err: error })
  }
}

/** @returns {Promise<void>} */
const noop = async () => {}

/**
 * @template {Record<string, (...args: never[]) => Promise<void>>} T
 * @param {T} enabled
 * @returns {T}
 */
const orNoop = (enabled) =>
  isMetricsEnabled
    ? enabled
    : /** @type {T} */ (
        Object.fromEntries(Object.keys(enabled).map((name) => [name, noop]))
      )

/** @type {Record<AuthMetricName, (oidcProvider: string) => Promise<void>>} */
const enabledMetrics = {
  signInAttempted: (oidcProvider) =>
    writeMetric('signInAttempted', { oidcProvider }),
  signInSuccess: (oidcProvider) =>
    writeMetric('signInSuccess', { oidcProvider }),
  signInSuccessNonInitialUser: (oidcProvider) =>
    writeMetric('signInSuccessNonInitialUser', { oidcProvider }),
  signInFailure: (oidcProvider) =>
    writeMetric('signInFailure', { oidcProvider }),
  signOutSuccess: (oidcProvider) =>
    writeMetric('signOutSuccess', { oidcProvider })
}

export const metrics = orNoop(enabledMetrics)

/**
 * @param {JourneyEntry} journey
 * @param {string} attempt
 */
const journeyKey = (journey, attempt) => `journey:${journey.start}:${attempt}`

/**
 * @param {JourneyMetricName} metricName
 * @param {string} journeyName
 */
const emitJourneyMetric = (metricName, journeyName) =>
  void writeMetric(
    metricName,
    { journey: journeyName },
    { replaceDefaults: true }
  )

/**
 * Journey start and end events feeding the mandatory GDS KPIs. Both phases share
 * one metric name so the totals read without knowing the journeys, and carry the
 * journey as a dimension so each one is its own series.
 *
 * The attempt identifies what is being acted on, so one session can hold several
 * attempts at a journey at once. Ends only count against a start held in the
 * same session, so a lost marker under-reports rather than putting completion
 * rate above 100%.
 */
const enabledJourneyMetrics = {
  /**
   * @param {HapiRequest} request
   * @param {JourneyEntry} journey
   * @param {string} attempt
   * @returns {Promise<void>}
   */
  async start(request, journey, attempt) {
    const key = journeyKey(journey, attempt)

    if (request.yar.get(key)) {
      return
    }

    request.yar.set(key, true)

    emitJourneyMetric(TRANSACTION_START, journey.start)
  },
  /**
   * @param {HapiRequest} request
   * @param {JourneyEntry} journey
   * @param {string} attempt
   * @returns {Promise<void>}
   */
  async end(request, journey, attempt) {
    const key = journeyKey(journey, attempt)

    if (!request.yar.get(key, true)) {
      return
    }

    emitJourneyMetric(TRANSACTION_END, journey.end)
  }
}

export const journeyMetrics = orNoop(enabledJourneyMetrics)
