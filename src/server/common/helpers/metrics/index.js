import {
  createMetricsLogger,
  StorageResolution,
  Unit
} from 'aws-embedded-metrics'

import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { addressYear } from '#server/common/helpers/route-params.js'

/**
 * @import { JourneyEntry, JourneyMetricName, MetricName } from './constants.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { Year } from '#server/common/helpers/year.js'
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

/**
 * Grouping is caller-side only -- the emitted names are a CloudWatch contract
 * that dashboards query, so they stay flat and unchanged.
 * @type {Record<string, (oidcProvider: string) => Promise<void>>}
 */
const signIn = {
  attempted: (oidcProvider) => writeMetric('signInAttempted', { oidcProvider }),
  success: (oidcProvider) => writeMetric('signInSuccess', { oidcProvider }),
  successNonInitialUser: (oidcProvider) =>
    writeMetric('signInSuccessNonInitialUser', { oidcProvider }),
  failure: (oidcProvider) => writeMetric('signInFailure', { oidcProvider })
}

/** @type {Record<string, (oidcProvider: string) => Promise<void>>} */
const signOut = {
  success: (oidcProvider) => writeMetric('signOutSuccess', { oidcProvider })
}

/**
 * @param {JourneyEntry} journey
 * @param {string} attempt
 */
const journeyKey = (journey, attempt) => `journey:${journey.start}:${attempt}`

/**
 * @param {JourneyMetricName} metricName
 * @param {string} journeyName
 * @param {Year} year
 */
const emitJourneyMetric = (metricName, journeyName, year) =>
  void writeMetric(
    metricName,
    { journey: journeyName, year: String(year) },
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
 *
 * The session holds the year the attempt started in, as not every end's
 * address names one.
 */
const journeyMetrics = {
  /**
   * @param {HapiRequest} request
   * @param {JourneyEntry} journey
   * @param {string} attempt
   * @returns {Promise<void>}
   */
  async start(request, journey, attempt) {
    const key = journeyKey(journey, attempt)
    const year = addressYear(request.params)

    if (year === undefined || request.yar.get(key) === year) {
      return
    }

    request.yar.set(key, year)

    emitJourneyMetric('TransactionStart', journey.start, year)
  },
  /**
   * @param {HapiRequest} request
   * @param {JourneyEntry} journey
   * @param {string} attempt
   * @returns {Promise<void>}
   */
  async end(request, journey, attempt) {
    const year = /** @type {Year | true | undefined} */ (
      request.yar.get(journeyKey(journey, attempt), true)
    )

    if (typeof year !== 'number') {
      return
    }

    emitJourneyMetric('TransactionEnd', journey.end, year)
  }
}

/**
 * A page URL holding ids, on a page that has moved to natural keys. When this
 * stops arriving, the redirect can go.
 * @type {Record<string, () => Promise<void>>}
 */
const pageUrl = {
  oldRequested: () =>
    writeMetric('OldPageUrlRequested', {}, { replaceDefaults: true })
}

export const metrics = {
  signIn: orNoop(signIn),
  signOut: orNoop(signOut),
  journey: orNoop(journeyMetrics),
  pageUrl: orNoop(pageUrl)
}
