import { config } from '#config/config.js'

/**
 * Analytics is on only when it has somewhere to report to and a container to
 * report through. An environment that sets the flag without both ids is
 * misconfigured, and treating it as on would loosen the content security policy
 * and fetch a script that can never record anything. One answer, so the policy,
 * the banner and the tag cannot disagree about whether analytics is running.
 * @returns {boolean}
 */
export const isAnalyticsEnabled = () =>
  config.get('analytics.isEnabled') &&
  Boolean(config.get('analytics.measurementId')) &&
  Boolean(config.get('analytics.containerId'))
