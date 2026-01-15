import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'

import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'

/**
 * Aws embedded metrics wrapper
 */
async function metricsCounter(metricName, value = 1) {
  const isMetricsEnabled = config.get('isMetricsEnabled')
  if (!isMetricsEnabled) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()
    metricsLogger.putMetric(
      metricName,
      value,
      Unit.Count,
      StorageResolution.Standard
    )
    await metricsLogger.flush()
  } catch (error) {
    createLogger().error(error, error.message)
  }
}

export const metrics = {
  async signInAttempted() {
    return metricsCounter('signInAttempted')
  },
  async signInSuccess() {
    return metricsCounter('signInSuccess')
  },
  async signInFailure() {
    return metricsCounter('signInFailure')
  },
  async signOutSuccess() {
    return metricsCounter('signOutSuccess')
  }
}
