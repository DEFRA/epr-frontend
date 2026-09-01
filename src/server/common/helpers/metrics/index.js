import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'

import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { TRANSACTION_END, TRANSACTION_START } from './constants.js'

/**
 * @import { TransactionValue } from './constants.js'
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

/**
 * Journey start and end events feeding the mandatory GDS KPIs. Both phases share
 * one metric name so the totals read without knowing the journeys, and carry the
 * journey as a dimension so each one is its own series.
 */
export const journeyMetrics = {
  /** @param {TransactionValue} journey */
  async start(journey) {
    return metricsCounter(TRANSACTION_START, { journey })
  },
  /** @param {TransactionValue} journey */
  async end(journey) {
    return metricsCounter(TRANSACTION_END, { journey })
  }
}
