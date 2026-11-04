import { config } from '#config/config.js'

export const measurementId = 'G-TESTONLY01'
export const containerId = 'GTM-TESTONLY'

export const switchAnalyticsOn = () => {
  config.set('analytics.isEnabled', true)
  config.set('analytics.measurementId', measurementId)
  config.set('analytics.containerId', containerId)
}

export const switchAnalyticsOff = () => {
  config.set('analytics.isEnabled', false)
  config.set('analytics.measurementId', '')
  config.set('analytics.containerId', '')
}
