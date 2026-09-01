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

/**
 * Aws embedded metrics wrapper
 * @param {string} metricName
 * @param {Record<string, string>} dimensions
 */
async function metricsCounter(metricName, dimensions) {
  const value = 1
  const isMetricsEnabled = config.get('isMetricsEnabled')
  if (!isMetricsEnabled) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()
    metricsLogger.putDimensions(dimensions)
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

/** @param {Journey} journey */
const startedKey = (journey) => `journeyStarted:${journey.start}`

/**
 * Journey start and end events feeding the mandatory GDS KPIs. Both phases share
 * one metric name so the totals read without knowing the journeys, and carry the
 * journey as a dimension so each one is its own series.
 *
 * A start counts once per attempt: revisiting the first page, or re-entering a
 * resumable journey, must not inflate the started count that completion rate
 * divides by. The marker is cleared on the end so a later attempt counts again.
 */
export const journeyMetrics = {
  /**
   * @param {HapiRequest} request
   * @param {Journey} journey
   */
  async start(request, journey) {
    if (request.yar.get(startedKey(journey))) {
      return
    }

    request.yar.set(startedKey(journey), true)

    return metricsCounter(TRANSACTION_START, { journey: journey.start })
  },
  /**
   * @template {Journey & Record<string, string>} J
   * @param {HapiRequest} request
   * @param {J} journey
   * @param {Exclude<keyof J, 'start'>} outcome
   */
  async end(request, journey, outcome) {
    request.yar.clear(startedKey(journey))

    return metricsCounter(TRANSACTION_END, { journey: journey[outcome] })
  }
}
