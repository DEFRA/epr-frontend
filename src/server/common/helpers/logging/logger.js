import { pino } from 'pino'

import { loggerOptions } from '#server/common/helpers/logging/logger-options.js'

/**
 * IndexedLogProperties is the developer-facing input shape: CdpIndexedLog plus
 * the `err` field that pino/ecs serialises into `error.*` before reaching
 * OpenSearch.
 * @import { CdpIndexedLog } from './cdp-log-types.js'
 * @typedef {CdpIndexedLog & { err?: Error }} IndexedLogProperties
 */

/**
 * @typedef {(obj: IndexedLogProperties) => void} LogMethod
 */

/**
 * @typedef {object} TypedLogger
 * @property {LogMethod} info
 * @property {LogMethod} error
 * @property {LogMethod} warn
 * @property {LogMethod} debug
 * @property {LogMethod} trace
 * @property {LogMethod} fatal
 */

/**
 * @type {TypedLogger}
 */
const logger = pino(loggerOptions)

/**
 * @returns {TypedLogger}
 */
function createLogger() {
  return logger
}

export { createLogger }
