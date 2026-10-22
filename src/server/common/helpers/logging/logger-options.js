import { config, isProductionEnvironment } from '#config/config.js'
import { getTraceId } from '@defra/hapi-tracing'
import { ecsFormat } from '@elastic/ecs-pino-format'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')
const tracingHeader = config.get('tracing.header')

const ecsOptions = ecsFormat({
  serviceVersion: serviceVersion ?? undefined,
  serviceName,
  convertReqRes: true
})
const ecsLog =
  /** @type {(obj: object) => { error?: { stack_trace?: string } }} */ (
    ecsOptions.formatters?.log
  )

const stripStackTraceInProd = (/** @type {object} */ obj) => {
  const out = ecsLog(obj)
  if (isProductionEnvironment() && out.error?.stack_trace) {
    delete out.error.stack_trace
  }
  return out
}

/**
 * @type {{ecs: Omit<LoggerOptions, "mixin"|"transport">, "pino-pretty": {transport: {target: string}}}}
 */
const formatters = {
  ecs: {
    ...ecsOptions,
    formatters: {
      ...ecsOptions.formatters,
      log: stripStackTraceInProd
    }
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

const isAccessLogIgnored = (/** @type {string} */ path) =>
  path === '/health' || path.startsWith('/public/')

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled,
  ignoreFunc: (_options, /** @type {{ path: string }} */ request) =>
    isAccessLogIgnored(request.path),
  ignoreTags: ['static'],
  getChildBindings: (request) => {
    const traceId = request.headers[tracingHeader]
    return {
      http: {
        request: {
          id: request.info.id,
          method: request.method.toUpperCase()
        }
      },
      url: { path: request.path },
      ...(traceId ? { trace: { id: traceId } } : {})
    }
  },
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
  // @fixme: code coverage
  /* v8 ignore next 8 */
  mixin() {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions } from 'pino'
 */
