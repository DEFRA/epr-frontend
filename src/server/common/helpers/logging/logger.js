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
 * @typedef {object} TypedLogger
 * @property {(obj: IndexedLogProperties, msg?: string, ...args: unknown[]) => void} info
 * @property {(obj: IndexedLogProperties, msg?: string, ...args: unknown[]) => void} error
 * @property {(obj: IndexedLogProperties, msg?: string, ...args: unknown[]) => void} warn
 * @property {(obj: IndexedLogProperties, msg?: string, ...args: unknown[]) => void} debug
 * @property {(obj: IndexedLogProperties, msg?: string, ...args: unknown[]) => void} trace
 * @property {(obj: IndexedLogProperties, msg?: string, ...args: unknown[]) => void} fatal
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
