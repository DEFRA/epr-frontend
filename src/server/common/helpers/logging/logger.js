import { pino } from 'pino'

import { loggerOptions } from '#server/common/helpers/logging/logger-options.js'

/**
 * Indexed log properties for CDP Elasticsearch.
 * Only includes fields that applications are allowed to set (marked with checkmark in CDP docs).
 * Fields that are CDP reserved or auto-populated from req/res are excluded.
 * @typedef {object} IndexedLogProperties
 * @property {string} [message] - Original log message
 * @property {Error} [err] - Error object for Pino serialisation (converted to error/* fields in output)
 * @property {{action?: string, category?: string, created?: string|number, duration?: number, kind?: string, outcome?: string, reason?: string, reference?: string, severity?: number|string, type?: string}} [event] - Event metadata
 * @property {{request?: {body?: {bytes?: number}, bytes?: number, headers?: {'Accept-language'?: string, 'accept-encoding'?: string, 'cache-control'?: string, expires?: string, referer?: string}, id?: string}, response?: {status_code?: number}}} [http] - HTTP request/response details (other response fields are CDP reserved)
 * @property {{level?: string, file?: {path?: string}, logger?: string}} [log] - Log metadata
 * @property {{name?: string, pid?: number, thread?: {id?: string|number, name?: string}}} [process] - Process information
 * @property {{type?: string}} [service] - Service type (name and version are CDP reserved)
 * @property {{id?: string}} [span] - Span ID for tracing
 * @property {{id?: string, message?: string}} [tenant] - Tenant context
 * @property {{id?: string}} [transaction] - Transaction ID
 * @property {{domain?: string, full?: string, query?: string}} [url] - URL details (path and port may be auto-populated from req)
 * @property {{device?: {name?: string}, name?: string, version?: string}} [user_agent] - User agent info (original may be auto-populated from req)
 * @property {{hostname?: string}} [host] - Host information
 */

/**
 * @typedef {object} TypedLogger
 * @property {(obj: IndexedLogProperties, msg?: string) => void} info
 * @property {(obj: IndexedLogProperties, msg?: string) => void} error
 * @property {(obj: IndexedLogProperties, msg?: string) => void} warn
 * @property {(obj: IndexedLogProperties, msg?: string) => void} debug
 * @property {(obj: IndexedLogProperties, msg?: string) => void} trace
 * @property {(obj: IndexedLogProperties, msg?: string) => void} fatal
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
