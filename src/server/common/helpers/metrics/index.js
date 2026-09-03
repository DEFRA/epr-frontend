import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'

import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { TRANSACTION_END, TRANSACTION_START } from './constants.js'

/**
 * @import { Journey } from './constants.js'
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
 * @param {Journey} journey
 * @param {string} attempt
 */
const startedKey = (journey, attempt) =>
  `journeyStarted:${journey.start}:${attempt}`

/**
 * Journey start and end events feeding the mandatory GDS KPIs. Both phases share
 * one metric name so the totals read without knowing the journeys, and carry the
 * journey as a dimension so each one is its own series.
 *
 * A start counts once per attempt: revisiting the first page, or re-entering a
 * resumable journey, must not inflate the started count that completion rate
 * divides by. The attempt identifies what is being acted on, so a session may
 * hold several attempts at one journey at once and an abandoned one does not
 * suppress the next. An end only counts against a start recorded in the same
 * session, which keeps the two sides paired: a session that loses its marker
 * under-reports the end rather than reporting an end no start divides.
 */
export const journeyMetrics = {
  /**
   * @param {HapiRequest} request
   * @param {Journey} journey
   * @param {string} attempt
   */
  async start(request, journey, attempt) {
    if (!isMetricsEnabled()) {
      return
    }

    const key = startedKey(journey, attempt)

    if (request.yar.get(key)) {
      return
    }

    request.yar.set(key, true)

    return metricsCounter(
      TRANSACTION_START,
      { journey: journey.start },
      { replaceDefaults: true }
    )
  },
  /**
   * @template {Journey & Record<string, string>} J
   * @param {HapiRequest} request
   * @param {J} journey
   * @param {string} attempt
   * @param {Exclude<keyof J, 'start'>} outcome
   */
  async end(request, journey, attempt, outcome) {
    if (!isMetricsEnabled()) {
      return
    }

    const key = startedKey(journey, attempt)

    if (!request.yar.get(key)) {
      return
    }

    request.yar.clear(key)

    return metricsCounter(
      TRANSACTION_END,
      { journey: journey[outcome] },
      { replaceDefaults: true }
    )
  }
}
