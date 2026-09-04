import {
  createMetricsLogger,
  StorageResolution,
  Unit
} from 'aws-embedded-metrics'

import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { TRANSACTION_END, TRANSACTION_START } from './constants.js'

/**
 * @import { JourneyEntry } from './constants.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

const isMetricsEnabled = () => config.get('isMetricsEnabled')

/**
 * Aws embedded metrics wrapper
 * @param {string} metricName
 * @param {Record<string, string>} dimensions
 * @param {{ replaceDefaults?: boolean }} [options] replaceDefaults drops the
 *   LogGroup, ServiceName and ServiceType the library adds of its own accord.
 *   CloudWatch identifies a series by its whole dimension set, so carrying them
 *   means a query has to name all four to match -- and one of them, the log
 *   group, differs per environment, which makes a dashboard unpromotable.
 */
async function metricsCounter(metricName, dimensions, options = {}) {
  const value = 1
  if (!isMetricsEnabled()) {
    return
  }

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

export const metrics = {
  /** @param {string} oidcProvider */
  async signInAttempted(oidcProvider) {
    return metricsCounter('signInAttempted', { oidcProvider })
  },
  /** @param {string} oidcProvider */
  async signInSuccess(oidcProvider) {
    return metricsCounter('signInSuccess', { oidcProvider })
  },
  /** @param {string} oidcProvider */
  async signInSuccessNonInitialUser(oidcProvider) {
    return metricsCounter('signInSuccessNonInitialUser', { oidcProvider })
  },
  /** @param {string} oidcProvider */
  async signInFailure(oidcProvider) {
    return metricsCounter('signInFailure', { oidcProvider })
  },
  /** @param {string} oidcProvider */
  async signOutSuccess(oidcProvider) {
    return metricsCounter('signOutSuccess', { oidcProvider })
  }
}

/**
 * @param {JourneyEntry} journey
 * @param {string} attempt
 */
const journeyKey = (journey, attempt) => `journey:${journey.start}:${attempt}`

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
export const journeyMetrics = {
  /**
   * @param {HapiRequest} request
   * @param {JourneyEntry} journey
   * @param {string} attempt
   * @returns {Promise<void>}
   */
  async start(request, journey, attempt) {
    if (!isMetricsEnabled()) {
      return
    }

    const key = journeyKey(journey, attempt)

    if (request.yar.get(key)) {
      return
    }

    request.yar.set(key, true)

    void metricsCounter(
      TRANSACTION_START,
      { journey: journey.start },
      { replaceDefaults: true }
    )
  },
  /**
   * @param {HapiRequest} request
   * @param {JourneyEntry} journey
   * @param {string} attempt
   * @returns {Promise<void>}
   */
  async end(request, journey, attempt) {
    if (!isMetricsEnabled()) {
      return
    }

    const key = journeyKey(journey, attempt)

    if (!request.yar.get(key)) {
      return
    }

    request.yar.clear(key)

    void metricsCounter(
      TRANSACTION_END,
      { journey: journey.end },
      { replaceDefaults: true }
    )
  }
}
